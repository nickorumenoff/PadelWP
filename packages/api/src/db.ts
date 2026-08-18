import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

/**
 * Capa de datos del MVP.
 *
 * Nota técnica: el diseño original usa Prisma + PostgreSQL (ver docs/especificacion.md).
 * En este entorno de desarrollo la descarga de los binarios de motor de Prisma está
 * bloqueada por la política de red del sandbox, así que para tener un backend 100%
 * ejecutable aquí se usa el módulo nativo `node:sqlite` (incluido en Node 22+, sin
 * dependencias externas ni binarios que descargar). El esquema de tablas replica
 * exactamente el modelo de datos documentado. Migrar a Prisma/Postgres en un entorno
 * normal (fuera de este sandbox) es un cambio acotado a este archivo.
 */

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "dev.db");

export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'PLAYER',
    level REAL NOT NULL DEFAULT 8.0,
    dominantArm TEXT,
    frequency TEXT,
    yearsPlaying REAL,
    selfAssessment INTEGER,
    competes INTEGER,
    city TEXT,
    photoUrl TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    visibilityPlan TEXT NOT NULL DEFAULT 'NONE',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS courts (
    id TEXT PRIMARY KEY,
    clubId TEXT NOT NULL REFERENCES clubs(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'CRISTAL',
    indoor INTEGER NOT NULL DEFAULT 0,
    pricePerHourUsd REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    courtId TEXT NOT NULL REFERENCES courts(id),
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'BOOKED',
    userId TEXT REFERENCES users(id),
    createdAt TEXT NOT NULL,
    UNIQUE(courtId, date, startTime)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    bookingId TEXT NOT NULL UNIQUE REFERENCES bookings(id),
    creatorId TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL DEFAULT 'OPEN',
    levelMin REAL NOT NULL DEFAULT 1.0,
    levelMax REAL NOT NULL DEFAULT 7.0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_players (
    id TEXT PRIMARY KEY,
    matchId TEXT NOT NULL REFERENCES matches(id),
    userId TEXT NOT NULL REFERENCES users(id),
    team INTEGER NOT NULL,
    confirmed INTEGER NOT NULL DEFAULT 1,
    UNIQUE(matchId, userId)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    method TEXT NOT NULL,
    reference TEXT,
    proofUrl TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    purpose TEXT NOT NULL,
    relatedId TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sponsorships (
    id TEXT PRIMARY KEY,
    sponsorName TEXT NOT NULL,
    planName TEXT NOT NULL,
    clubId TEXT REFERENCES clubs(id),
    bannerUrl TEXT,
    linkUrl TEXT,
    startDate TEXT NOT NULL,
    endDate TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    amountPaidUsd REAL NOT NULL DEFAULT 0
  );
`);

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
