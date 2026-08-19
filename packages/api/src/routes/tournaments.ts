import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  BracketMatches,
  CategoryRegistrations,
  Clubs,
  GroupMatches,
  TournamentCategories,
  TournamentGroups,
  TournamentPairs,
  TournamentRegistrations,
  Tournaments,
  Users,
  type TournamentRow,
} from "../repositories";
import { requireAuth, verifyToken } from "../auth";
import {
  publicCategory,
  publicGroup,
  publicPair,
  publicTournament,
  publicBracketMatch,
  publicUser,
} from "../serializers";
import {
  computeStandings,
  generateGroups,
  generateKnockoutFromGroups,
  numGroupsForBracketSize,
  advanceBracketWinner,
  totalRoundsForBracketSize,
} from "../bracket";

const createTournamentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  city: z.string().min(2),
  clubId: z.string().optional(),
  levelMin: z.number().min(1).max(8).default(1),
  levelMax: z.number().min(1).max(8).default(8),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  maxPlayers: z.number().int().min(4).max(256).default(16),
});

const BRACKET_SIZES = [4, 8, 16, 32, 64] as const;

const createCategorySchema = z.object({
  genderCategory: z.enum(["MASCULINO", "FEMENINO", "MIXTO"]),
  level: z.number().int().min(1).max(8),
  bracketSize: z.number().int().refine((n) => (BRACKET_SIZES as readonly number[]).includes(n), {
    message: "bracketSize debe ser 4, 8, 16, 32 o 64",
  }),
});

const createPairSchema = z.object({
  player1Id: z.string(),
  player2Id: z.string(),
});

const resultSchema = z.object({
  winnerPairId: z.string(),
  setsA: z.number().int().min(0).max(5).optional(),
  setsB: z.number().int().min(0).max(5).optional(),
});

function serialize(tournamentId: string, userId?: string) {
  const tournament = Tournaments.findById(tournamentId)!;
  const registrations = TournamentRegistrations.listByTournament(tournamentId);
  return publicTournament(tournament, {
    registeredCount: registrations.length,
    isRegistered: userId ? registrations.some((r) => r.userId === userId) : false,
  });
}

// Un administrador de la plataforma puede gestionar cualquier torneo; el
// dueño del club asociado al torneo puede gestionar el suyo (categorías,
// parejas, grupos, llave y resultados).
function canManageTournament(tournament: TournamentRow, userId: string): boolean {
  const user = Users.findById(userId);
  if (!user) return false;
  if (user.role === "PLATFORM_ADMIN") return true;
  if (tournament.clubId) {
    const club = Clubs.findById(tournament.clubId);
    if (club && club.ownerId === userId) return true;
  }
  return false;
}

function userIdFromAuthHeader(header?: string): string | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  return verifyToken(header.slice(7))?.userId;
}

function serializeCategory(categoryId: string, userId?: string) {
  const category = TournamentCategories.findById(categoryId)!;
  const registrations = CategoryRegistrations.listByCategory(categoryId);
  const pairs = TournamentPairs.listByCategory(categoryId);
  return publicCategory(category, {
    registeredCount: registrations.length,
    pairCount: pairs.length,
    isRegistered: userId ? registrations.some((r) => r.userId === userId) : false,
  });
}

function serializeCategoryDetail(categoryId: string, userId?: string) {
  const category = TournamentCategories.findById(categoryId)!;
  const registrations = CategoryRegistrations.listByCategory(categoryId).map((r) => {
    const u = Users.findById(r.userId);
    return { ...r, user: u ? publicUser(u) : undefined };
  });
  const pairs = TournamentPairs.listByCategory(categoryId);
  const publicPairs = pairs.map((p) => publicPair(p, Users.findById(p.player1Id), Users.findById(p.player2Id)));

  const groups = TournamentGroups.listByCategory(categoryId).map((g) => {
    const groupPairs = pairs.filter((p) => p.groupId === g.id);
    const groupPublicPairs = groupPairs.map((p) => publicPair(p, Users.findById(p.player1Id), Users.findById(p.player2Id)));
    const matches = GroupMatches.listByGroup(g.id);
    const standings = computeStandings(
      groupPairs.map((p) => p.id),
      matches
    );
    return publicGroup(g, groupPublicPairs, matches, standings);
  });

  const bracket = BracketMatches.listByCategory(categoryId).map(publicBracketMatch);

  return {
    ...publicCategory(category, {
      registeredCount: registrations.length,
      pairCount: pairs.length,
      isRegistered: userId ? registrations.some((r) => r.userId === userId) : false,
    }),
    registrations: registrations.map((r) => ({
      id: r.id,
      categoryId: r.categoryId,
      userId: r.userId,
      pairId: r.pairId,
      createdAt: r.createdAt,
      user: r.user,
    })),
    pairs: publicPairs,
    groups,
    bracket,
  };
}

export default async function tournamentRoutes(app: FastifyInstance) {
  // Torneos publicados, visibles para cualquier jugador (autenticado o no).
  app.get("/tournaments", async (req, reply) => {
    const { city } = req.query as { city?: string };
    const userId = userIdFromAuthHeader(req.headers.authorization);
    const tournaments = Tournaments.list(city);
    return reply.send(tournaments.map((t) => serialize(t.id, userId)));
  });

  app.get("/tournaments/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const tournament = Tournaments.findById(id);
    if (!tournament) return reply.status(404).send({ error: "Torneo no encontrado" });
    return reply.send(serialize(id));
  });

  // Solo un administrador de la plataforma puede habilitar/publicar torneos.
  app.post("/tournaments", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const user = Users.findById(userId);
    if (!user || user.role !== "PLATFORM_ADMIN") {
      return reply.status(403).send({ error: "Solo un administrador de la plataforma puede crear torneos" });
    }

    const parsed = createTournamentSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const tournament = Tournaments.create({ ...parsed.data, createdBy: userId });
    return reply.send(serialize(tournament.id, userId));
  });

  app.post("/tournaments/:id/register", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;

    const tournament = Tournaments.findById(id);
    if (!tournament) return reply.status(404).send({ error: "Torneo no encontrado" });
    if (tournament.status !== "OPEN") {
      return reply.status(409).send({ error: "Este torneo ya no admite inscripciones" });
    }
    if (TournamentRegistrations.isRegistered(id, userId)) {
      return reply.status(409).send({ error: "Ya estás inscrito en este torneo" });
    }

    const registrations = TournamentRegistrations.listByTournament(id);
    if (registrations.length >= tournament.maxPlayers) {
      return reply.status(409).send({ error: "El torneo ya alcanzó el cupo máximo" });
    }

    const user = Users.findById(userId);
    if (user && (user.level < tournament.levelMin || user.level > tournament.levelMax)) {
      return reply
        .status(409)
        .send({ error: "Tu nivel actual está fuera del rango permitido para este torneo" });
    }

    TournamentRegistrations.create({ tournamentId: id, userId });
    return reply.send(serialize(id, userId));
  });

  // ---------- Categorías (género + nivel + tamaño de llave) ----------

  app.get("/tournaments/:id/categories", async (req, reply) => {
    const { id } = req.params as { id: string };
    const tournament = Tournaments.findById(id);
    if (!tournament) return reply.status(404).send({ error: "Torneo no encontrado" });
    const userId = userIdFromAuthHeader(req.headers.authorization);
    const categories = TournamentCategories.listByTournament(id);
    return reply.send(categories.map((c) => serializeCategory(c.id, userId)));
  });

  app.post("/tournaments/:id/categories", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;
    const tournament = Tournaments.findById(id);
    if (!tournament) return reply.status(404).send({ error: "Torneo no encontrado" });
    if (!canManageTournament(tournament, userId)) {
      return reply.status(403).send({ error: "No tienes permiso para gestionar este torneo" });
    }

    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const category = TournamentCategories.create({ tournamentId: id, ...parsed.data });
    return reply.send(serializeCategory(category.id, userId));
  });

  // ---------- Detalle de categoría: inscripciones, parejas, grupos, llave ----------

  app.get("/tournament-categories/:categoryId", async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const category = TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    const userId = userIdFromAuthHeader(req.headers.authorization);
    return reply.send(serializeCategoryDetail(categoryId, userId));
  });

  // Inscripción individual de un jugador a una categoría (el club/admin arma las parejas después).
  app.post("/tournament-categories/:categoryId/register", { preHandler: requireAuth }, async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const userId = (req as any).userId as string;
    const category = TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    if (category.status !== "REGISTRATION") {
      return reply.status(409).send({ error: "Esta categoría ya cerró inscripciones" });
    }
    if (CategoryRegistrations.isRegistered(categoryId, userId)) {
      return reply.status(409).send({ error: "Ya estás inscrito en esta categoría" });
    }

    const user = Users.findById(userId);
    if (user?.gender && category.genderCategory !== "MIXTO" && user.gender !== category.genderCategory) {
      return reply.status(409).send({ error: "Tu género no corresponde a esta categoría" });
    }

    CategoryRegistrations.create({ categoryId, userId });
    return reply.send(serializeCategoryDetail(categoryId, userId));
  });

  // El club/admin arma una pareja a partir de 2 jugadores ya inscritos y sin pareja.
  app.post("/tournament-categories/:categoryId/pairs", { preHandler: requireAuth }, async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const userId = (req as any).userId as string;
    const category = TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    const tournament = Tournaments.findById(category.tournamentId)!;
    if (!canManageTournament(tournament, userId)) {
      return reply.status(403).send({ error: "No tienes permiso para gestionar este torneo" });
    }
    if (category.status !== "REGISTRATION") {
      return reply.status(409).send({ error: "Esta categoría ya no admite armar parejas" });
    }

    const parsed = createPairSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { player1Id, player2Id } = parsed.data;
    if (player1Id === player2Id) {
      return reply.status(400).send({ error: "La pareja necesita 2 jugadores distintos" });
    }

    const registrations = CategoryRegistrations.listByCategory(categoryId);
    const reg1 = registrations.find((r) => r.userId === player1Id);
    const reg2 = registrations.find((r) => r.userId === player2Id);
    if (!reg1 || !reg2) {
      return reply.status(409).send({ error: "Ambos jugadores deben estar inscritos en esta categoría" });
    }
    if (reg1.pairId || reg2.pairId) {
      return reply.status(409).send({ error: "Uno de los jugadores ya tiene pareja asignada" });
    }

    const pair = TournamentPairs.create({ categoryId, player1Id, player2Id });
    CategoryRegistrations.setPair(categoryId, player1Id, pair.id);
    CategoryRegistrations.setPair(categoryId, player2Id, pair.id);
    return reply.send(publicPair(pair, Users.findById(player1Id), Users.findById(player2Id)));
  });

  // Reparte las parejas armadas en grupos y genera los partidos todos-contra-todos.
  app.post("/tournament-categories/:categoryId/generate-groups", { preHandler: requireAuth }, async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const userId = (req as any).userId as string;
    const category = TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    const tournament = Tournaments.findById(category.tournamentId)!;
    if (!canManageTournament(tournament, userId)) {
      return reply.status(403).send({ error: "No tienes permiso para gestionar este torneo" });
    }
    if (category.status !== "REGISTRATION") {
      return reply.status(409).send({ error: "Los grupos de esta categoría ya fueron generados" });
    }

    const pairs = TournamentPairs.listByCategory(categoryId);
    const numGroups = numGroupsForBracketSize(category.bracketSize);
    const minPairs = numGroups * 2;
    if (pairs.length < minPairs) {
      return reply.status(409).send({
        error: `Necesitas al menos ${minPairs} parejas armadas para ${numGroups} grupos (llave de ${category.bracketSize}). Hay ${pairs.length}.`,
      });
    }

    generateGroups(categoryId, pairs, numGroups);
    TournamentCategories.updateStatus(categoryId, "GROUPS");
    return reply.send(serializeCategoryDetail(categoryId, userId));
  });

  // Resultado de un partido de fase de grupos.
  app.post("/group-matches/:matchId/result", { preHandler: requireAuth }, async (req, reply) => {
    const { matchId } = req.params as { matchId: string };
    const userId = (req as any).userId as string;
    const match = GroupMatches.findById(matchId);
    if (!match) return reply.status(404).send({ error: "Partido no encontrado" });
    const category = TournamentCategories.findById(match.categoryId)!;
    const tournament = Tournaments.findById(category.tournamentId)!;
    if (!canManageTournament(tournament, userId)) {
      return reply.status(403).send({ error: "Solo el club organizador o un administrador puede reportar resultados" });
    }
    if (match.status === "COMPLETED") {
      return reply.status(409).send({ error: "Este partido ya tiene resultado" });
    }

    const parsed = resultSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { winnerPairId, setsA, setsB } = parsed.data;
    if (winnerPairId !== match.pairAId && winnerPairId !== match.pairBId) {
      return reply.status(400).send({ error: "El ganador debe ser una de las 2 parejas del partido" });
    }

    GroupMatches.setResult(matchId, winnerPairId, setsA, setsB);
    return reply.send(serializeCategoryDetail(match.categoryId, userId));
  });

  // Calcula los 2 mejores de cada grupo y genera la llave de eliminación directa.
  app.post("/tournament-categories/:categoryId/generate-knockout", { preHandler: requireAuth }, async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const userId = (req as any).userId as string;
    const category = TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    const tournament = Tournaments.findById(category.tournamentId)!;
    if (!canManageTournament(tournament, userId)) {
      return reply.status(403).send({ error: "No tienes permiso para gestionar este torneo" });
    }
    if (category.status !== "GROUPS") {
      return reply.status(409).send({ error: "Esta categoría no está en fase de grupos" });
    }

    const groups = TournamentGroups.listByCategory(categoryId);
    const pairs = TournamentPairs.listByCategory(categoryId);
    const winners: string[] = [];
    const runnersUp: string[] = [];

    for (const g of groups) {
      const groupPairs = pairs.filter((p) => p.groupId === g.id);
      const matches = GroupMatches.listByCategory(categoryId).filter((m) => m.groupId === g.id);
      if (matches.some((m) => m.status !== "COMPLETED")) {
        return reply.status(409).send({ error: `El grupo ${g.groupIndex + 1} todavía tiene partidos sin resultado` });
      }
      const standings = computeStandings(
        groupPairs.map((p) => p.id),
        matches
      );
      if (standings.length < 2) {
        return reply.status(409).send({ error: `El grupo ${g.groupIndex + 1} necesita al menos 2 parejas` });
      }
      winners.push(standings[0].pairId);
      runnersUp.push(standings[1].pairId);
    }

    generateKnockoutFromGroups(categoryId, winners, runnersUp);
    TournamentCategories.updateStatus(categoryId, "KNOCKOUT");
    return reply.send(serializeCategoryDetail(categoryId, userId));
  });

  // Resultado de un partido de la llave de eliminación directa.
  app.post("/bracket-matches/:matchId/result", { preHandler: requireAuth }, async (req, reply) => {
    const { matchId } = req.params as { matchId: string };
    const userId = (req as any).userId as string;
    const match = BracketMatches.findById(matchId);
    if (!match) return reply.status(404).send({ error: "Partido no encontrado" });
    const category = TournamentCategories.findById(match.categoryId)!;
    const tournament = Tournaments.findById(category.tournamentId)!;
    if (!canManageTournament(tournament, userId)) {
      return reply.status(403).send({ error: "Solo el club organizador o un administrador puede reportar resultados" });
    }
    if (match.status === "COMPLETED") {
      return reply.status(409).send({ error: "Este partido ya tiene resultado" });
    }
    if (!match.pairAId || !match.pairBId) {
      return reply.status(409).send({ error: "Este partido todavía no tiene las 2 parejas definidas" });
    }

    const parsed = resultSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { winnerPairId, setsA, setsB } = parsed.data;
    if (winnerPairId !== match.pairAId && winnerPairId !== match.pairBId) {
      return reply.status(400).send({ error: "El ganador debe ser una de las 2 parejas del partido" });
    }

    const updated = BracketMatches.setResult(matchId, winnerPairId, setsA, setsB)!;
    const totalRounds = totalRoundsForBracketSize(category.bracketSize);
    advanceBracketWinner(updated, totalRounds);
    if (updated.round >= totalRounds) {
      TournamentCategories.updateStatus(category.id, "COMPLETED");
    }

    return reply.send(serializeCategoryDetail(match.categoryId, userId));
  });
}
