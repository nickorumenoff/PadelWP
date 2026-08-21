import { Pool } from "pg";
import { randomUUID } from "node:crypto";

/**
 * Capa de datos.
 *
 * Backend en PostgreSQL vía `pg` (node-postgres), sin ORM: se usa `pg` en vez de
 * Prisma porque la descarga de los binarios del motor de Prisma está bloqueada
 * por la política de red de algunos entornos de desarrollo, mientras que `pg`
 * es una librería 100% JS sin binarios nativos que descargar.
 *
 * Nota: todos los nombres de columna se declaran entrecomillados ("camelCase")
 * en el DDL para que Postgres preserve el case exacto — de lo contrario Postgres
 * pliega los identificadores sin comillas a minúsculas y `SELECT *` devolvería
 * claves como `passwordhash` en vez de `passwordHash`. Todas las consultas que
 * referencian columnas puntuales (WHERE/UPDATE/INSERT) también las entrecomillan
 * por la misma razón.
 */

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "level" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "gender" TEXT,
    "dominantArm" TEXT,
    "frequency" TEXT,
    "yearsPlaying" DOUBLE PRECISION,
    "selfAssessment" INTEGER,
    "competes" BOOLEAN,
    "city" TEXT,
    "photoUrl" TEXT,
    "createdAt" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clubs (
    "id" TEXT PRIMARY KEY,
    "ownerId" TEXT NOT NULL REFERENCES users("id"),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "visibilityPlan" TEXT NOT NULL DEFAULT 'NONE',
    "openHour" INTEGER NOT NULL DEFAULT 8,
    "closeHour" INTEGER NOT NULL DEFAULT 22,
    "createdAt" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS courts (
    "id" TEXT PRIMARY KEY,
    "clubId" TEXT NOT NULL REFERENCES clubs("id"),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CRISTAL',
    "indoor" BOOLEAN NOT NULL DEFAULT false,
    "lighting" BOOLEAN NOT NULL DEFAULT false,
    "pricePerHourUsd" DOUBLE PRECISION NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    "id" TEXT PRIMARY KEY,
    "courtId" TEXT NOT NULL REFERENCES courts("id"),
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "userId" TEXT REFERENCES users("id"),
    "createdAt" TEXT NOT NULL
  );

  -- Antes había un UNIQUE de tabla en (courtId,date,startTime), lo que impedía
  -- re-reservar un horario cuya reserva previa fue cancelada. Si una base de
  -- datos existente todavía tiene ese constraint (de antes de que existiera
  -- "cancelar reserva"), se elimina aquí de forma segura antes de reemplazarlo
  -- por el índice único parcial de abajo (que solo aplica a reservas activas).
  DO $$
  DECLARE
    old_constraint TEXT;
  BEGIN
    SELECT tc.constraint_name INTO old_constraint
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'bookings' AND tc.constraint_type = 'UNIQUE'
    LIMIT 1;
    IF old_constraint IS NOT NULL THEN
      EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT ' || quote_ident(old_constraint);
    END IF;
  END $$;

  CREATE UNIQUE INDEX IF NOT EXISTS bookings_court_date_start_active_idx
    ON bookings ("courtId", "date", "startTime")
    WHERE "status" != 'CANCELLED';

  CREATE TABLE IF NOT EXISTS matches (
    "id" TEXT PRIMARY KEY,
    "bookingId" TEXT NOT NULL UNIQUE REFERENCES bookings("id"),
    "creatorId" TEXT NOT NULL REFERENCES users("id"),
    "type" TEXT NOT NULL DEFAULT 'OPEN',
    "levelMin" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "levelMax" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "winnerTeam" INTEGER,
    "completedAt" TEXT,
    "createdAt" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_players (
    "id" TEXT PRIMARY KEY,
    "matchId" TEXT NOT NULL REFERENCES matches("id"),
    "userId" TEXT NOT NULL REFERENCES users("id"),
    "team" INTEGER NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    UNIQUE("matchId", "userId")
  );

  CREATE TABLE IF NOT EXISTS payments (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users("id"),
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "proofUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT NOT NULL,
    "relatedId" TEXT,
    "createdAt" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sponsorships (
    "id" TEXT PRIMARY KEY,
    "sponsorName" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "clubId" TEXT REFERENCES clubs("id"),
    "requestedBy" TEXT REFERENCES users("id"),
    "bannerUrl" TEXT,
    "linkUrl" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amountPaidUsd" DOUBLE PRECISION NOT NULL DEFAULT 0
  );

  -- Reseña de un club (calificación 1-5 + comentario opcional). Un usuario puede
  -- dejar una sola reseña por club; si vuelve a enviar, se actualiza (upsert).
  CREATE TABLE IF NOT EXISTS reviews (
    "id" TEXT PRIMARY KEY,
    "clubId" TEXT NOT NULL REFERENCES clubs("id"),
    "userId" TEXT NOT NULL REFERENCES users("id"),
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TEXT NOT NULL,
    UNIQUE("clubId", "userId")
  );

  -- Notificaciones dentro de la app (no push/email): se generan cuando pasa algo
  -- relevante para un usuario (pago verificado, alguien se unió a su partida, etc).
  CREATE TABLE IF NOT EXISTS notifications (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users("id"),
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL
  );

  -- Tokens de recuperación de contraseña: de un solo uso, con expiración. Se
  -- guarda el hash del token, nunca el token en texto plano.
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users("id"),
    "tokenHash" TEXT NOT NULL UNIQUE,
    "expiresAt" TEXT NOT NULL,
    "usedAt" TEXT,
    "createdAt" TEXT NOT NULL
  );

  -- Espacios publicitarios propios de la plataforma (no ligados a pago): 4 espacios
  -- fijos, identificados por "position" (1-4), que un admin de plataforma activa/
  -- desactiva y llena con foto+título+texto. Coexisten con el autoservicio de
  -- patrocinadores (tabla sponsorships) en vez de reemplazarlo.
  CREATE TABLE IF NOT EXISTS ad_slots (
    "id" TEXT PRIMARY KEY,
    "position" INTEGER NOT NULL UNIQUE,
    "title" TEXT,
    "text" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    "id" TEXT PRIMARY KEY,
    "createdBy" TEXT NOT NULL REFERENCES users("id"),
    "clubId" TEXT REFERENCES clubs("id"),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "levelMin" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "levelMax" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "maxPlayers" INTEGER NOT NULL DEFAULT 16,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tournament_registrations (
    "id" TEXT PRIMARY KEY,
    "tournamentId" TEXT NOT NULL REFERENCES tournaments("id"),
    "userId" TEXT NOT NULL REFERENCES users("id"),
    "createdAt" TEXT NOT NULL,
    UNIQUE("tournamentId", "userId")
  );

  -- Categorías de un torneo: se juegan por género y nivel (1-8), y definen el
  -- tamaño de la llave de eliminación directa a la que se llega tras la fase de grupos
  -- (ej. bracketSize=16 -> 8 grupos -> "dieciseisavos").
  CREATE TABLE IF NOT EXISTS tournament_categories (
    "id" TEXT PRIMARY KEY,
    "tournamentId" TEXT NOT NULL REFERENCES tournaments("id"),
    "genderCategory" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "bracketSize" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL DEFAULT 'REGISTRATION',
    "createdAt" TEXT NOT NULL
  );

  -- Grupos de fase de grupos (round-robin), normalmente de 4 parejas. Se crea
  -- antes que tournament_pairs porque tournament_pairs.groupId la referencia.
  CREATE TABLE IF NOT EXISTS tournament_groups (
    "id" TEXT PRIMARY KEY,
    "categoryId" TEXT NOT NULL REFERENCES tournament_categories("id"),
    "groupIndex" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    UNIQUE("categoryId", "groupIndex")
  );

  CREATE TABLE IF NOT EXISTS tournament_pairs (
    "id" TEXT PRIMARY KEY,
    "categoryId" TEXT NOT NULL REFERENCES tournament_categories("id"),
    "player1Id" TEXT NOT NULL REFERENCES users("id"),
    "player2Id" TEXT NOT NULL REFERENCES users("id"),
    "groupId" TEXT REFERENCES tournament_groups("id"),
    "createdAt" TEXT NOT NULL
  );

  -- Inscripción individual de un jugador a una categoría. pairId se llena cuando
  -- el club/admin arma la pareja. Se crea después de tournament_pairs porque la
  -- referencia.
  CREATE TABLE IF NOT EXISTS tournament_category_registrations (
    "id" TEXT PRIMARY KEY,
    "categoryId" TEXT NOT NULL REFERENCES tournament_categories("id"),
    "userId" TEXT NOT NULL REFERENCES users("id"),
    "pairId" TEXT REFERENCES tournament_pairs("id"),
    "createdAt" TEXT NOT NULL,
    UNIQUE("categoryId", "userId")
  );

  -- Partidos de fase de grupos: todos contra todos dentro del grupo.
  CREATE TABLE IF NOT EXISTS group_matches (
    "id" TEXT PRIMARY KEY,
    "categoryId" TEXT NOT NULL REFERENCES tournament_categories("id"),
    "groupId" TEXT NOT NULL REFERENCES tournament_groups("id"),
    "pairAId" TEXT NOT NULL REFERENCES tournament_pairs("id"),
    "pairBId" TEXT NOT NULL REFERENCES tournament_pairs("id"),
    "setsA" INTEGER,
    "setsB" INTEGER,
    "winnerPairId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TEXT NOT NULL,
    "completedAt" TEXT
  );

  -- Llave de eliminación directa: los 2 mejores de cada grupo avanzan aquí.
  CREATE TABLE IF NOT EXISTS bracket_matches (
    "id" TEXT PRIMARY KEY,
    "categoryId" TEXT NOT NULL REFERENCES tournament_categories("id"),
    "round" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "pairAId" TEXT,
    "pairBId" TEXT,
    "setsA" INTEGER,
    "setsB" INTEGER,
    "winnerPairId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TEXT NOT NULL,
    "completedAt" TEXT,
    UNIQUE("categoryId", "round", "slot")
  );
`;

let schemaReady: Promise<void> | null = null;

/**
 * Crea el esquema si no existe. Idempotente (CREATE TABLE IF NOT EXISTS) y
 * memoizado dentro del proceso para no volver a ejecutarlo en cada request.
 */
export function initSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool
      .query(SCHEMA_SQL)
      .then(() =>
        // Garantiza que siempre existan exactamente los 4 espacios publicitarios fijos
        // (posiciones 1-4), sin pisar los ya configurados por el admin.
        pool.query(`
          INSERT INTO ad_slots ("id", "position", "active", "updatedAt")
          SELECT 'ad_slot_' || pos, pos, false, NOW()::TEXT
          FROM generate_series(1, 4) AS pos
          ON CONFLICT ("position") DO NOTHING
        `)
      )
      .then(() => undefined);
  }
  return schemaReady;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ---------- Helpers genéricos de consulta (columnas siempre entrecomilladas) ----------

export async function insertRow<T extends object>(table: string, row: T): Promise<T> {
  const asRecord = row as Record<string, unknown>;
  const keys = Object.keys(asRecord);
  const cols = keys.map((k) => `"${k}"`).join(",");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
  const values = keys.map((k) => asRecord[k]);
  await pool.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
  return row;
}

export async function updateRow(table: string, idCol: string, idValue: string, sets: Record<string, unknown>): Promise<void> {
  const keys = Object.keys(sets);
  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
  const values = keys.map((k) => sets[k]);
  await pool.query(`UPDATE ${table} SET ${setClause} WHERE "${idCol}" = $${keys.length + 1}`, [...values, idValue]);
}

export async function selectOne<T>(table: string, where: Record<string, unknown>): Promise<T | undefined> {
  const keys = Object.keys(where);
  const clause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(" AND ");
  const values = keys.map((k) => where[k]);
  const res = await pool.query(`SELECT * FROM ${table} WHERE ${clause}`, values);
  return res.rows[0] as T | undefined;
}

export async function selectMany<T>(
  table: string,
  where: Record<string, unknown> = {},
  orderBy?: string
): Promise<T[]> {
  const keys = Object.keys(where);
  let sql = `SELECT * FROM ${table}`;
  const values = keys.map((k) => where[k]);
  if (keys.length) {
    const clause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(" AND ");
    sql += ` WHERE ${clause}`;
  }
  if (orderBy) sql += ` ORDER BY ${orderBy}`;
  const res = await pool.query(sql, values);
  return res.rows as T[];
}
