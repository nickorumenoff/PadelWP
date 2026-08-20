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

async function serialize(tournamentId: string, userId?: string) {
  const tournament = (await Tournaments.findById(tournamentId))!;
  const registrations = await TournamentRegistrations.listByTournament(tournamentId);
  return publicTournament(tournament, {
    registeredCount: registrations.length,
    isRegistered: userId ? registrations.some((r) => r.userId === userId) : false,
  });
}

// Un administrador de la plataforma puede gestionar cualquier torneo; el
// dueño del club asociado al torneo puede gestionar el suyo (categorías,
// parejas, grupos, llave y resultados).
async function canManageTournament(tournament: TournamentRow, userId: string): Promise<boolean> {
  const user = await Users.findById(userId);
  if (!user) return false;
  if (user.role === "PLATFORM_ADMIN") return true;
  if (tournament.clubId) {
    const club = await Clubs.findById(tournament.clubId);
    if (club && club.ownerId === userId) return true;
  }
  return false;
}

function userIdFromAuthHeader(header?: string): string | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  return verifyToken(header.slice(7))?.userId;
}

async function serializeCategory(categoryId: string, userId?: string) {
  const category = (await TournamentCategories.findById(categoryId))!;
  const registrations = await CategoryRegistrations.listByCategory(categoryId);
  const pairs = await TournamentPairs.listByCategory(categoryId);
  return publicCategory(category, {
    registeredCount: registrations.length,
    pairCount: pairs.length,
    isRegistered: userId ? registrations.some((r) => r.userId === userId) : false,
  });
}

async function serializeCategoryDetail(categoryId: string, userId?: string) {
  const category = (await TournamentCategories.findById(categoryId))!;
  const rawRegistrations = await CategoryRegistrations.listByCategory(categoryId);
  const registrations = await Promise.all(
    rawRegistrations.map(async (r) => {
      const u = await Users.findById(r.userId);
      return { ...r, user: u ? publicUser(u) : undefined };
    })
  );
  const pairs = await TournamentPairs.listByCategory(categoryId);
  const publicPairs = await Promise.all(
    pairs.map(async (p) => publicPair(p, await Users.findById(p.player1Id), await Users.findById(p.player2Id)))
  );

  const rawGroups = await TournamentGroups.listByCategory(categoryId);
  const groups = await Promise.all(
    rawGroups.map(async (g) => {
      const groupPairs = pairs.filter((p) => p.groupId === g.id);
      const groupPublicPairs = await Promise.all(
        groupPairs.map(async (p) => publicPair(p, await Users.findById(p.player1Id), await Users.findById(p.player2Id)))
      );
      const matches = await GroupMatches.listByGroup(g.id);
      const standings = computeStandings(
        groupPairs.map((p) => p.id),
        matches
      );
      return publicGroup(g, groupPublicPairs, matches, standings);
    })
  );

  const rawBracket = await BracketMatches.listByCategory(categoryId);
  const bracket = rawBracket.map(publicBracketMatch);

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
    const tournaments = await Tournaments.list(city);
    return reply.send(await Promise.all(tournaments.map((t) => serialize(t.id, userId))));
  });

  app.get("/tournaments/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const tournament = await Tournaments.findById(id);
    if (!tournament) return reply.status(404).send({ error: "Torneo no encontrado" });
    return reply.send(await serialize(id));
  });

  // Solo un administrador de la plataforma puede habilitar/publicar torneos.
  app.post("/tournaments", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const user = await Users.findById(userId);
    if (!user || user.role !== "PLATFORM_ADMIN") {
      return reply.status(403).send({ error: "Solo un administrador de la plataforma puede crear torneos" });
    }

    const parsed = createTournamentSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const tournament = await Tournaments.create({ ...parsed.data, createdBy: userId });
    return reply.send(await serialize(tournament.id, userId));
  });

  app.post("/tournaments/:id/register", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;

    const tournament = await Tournaments.findById(id);
    if (!tournament) return reply.status(404).send({ error: "Torneo no encontrado" });
    if (tournament.status !== "OPEN") {
      return reply.status(409).send({ error: "Este torneo ya no admite inscripciones" });
    }
    if (await TournamentRegistrations.isRegistered(id, userId)) {
      return reply.status(409).send({ error: "Ya estás inscrito en este torneo" });
    }

    const registrations = await TournamentRegistrations.listByTournament(id);
    if (registrations.length >= tournament.maxPlayers) {
      return reply.status(409).send({ error: "El torneo ya alcanzó el cupo máximo" });
    }

    const user = await Users.findById(userId);
    if (user && (user.level < tournament.levelMin || user.level > tournament.levelMax)) {
      return reply
        .status(409)
        .send({ error: "Tu nivel actual está fuera del rango permitido para este torneo" });
    }

    await TournamentRegistrations.create({ tournamentId: id, userId });
    return reply.send(await serialize(id, userId));
  });

  // ---------- Categorías (género + nivel + tamaño de llave) ----------

  app.get("/tournaments/:id/categories", async (req, reply) => {
    const { id } = req.params as { id: string };
    const tournament = await Tournaments.findById(id);
    if (!tournament) return reply.status(404).send({ error: "Torneo no encontrado" });
    const userId = userIdFromAuthHeader(req.headers.authorization);
    const categories = await TournamentCategories.listByTournament(id);
    return reply.send(await Promise.all(categories.map((c) => serializeCategory(c.id, userId))));
  });

  app.post("/tournaments/:id/categories", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;
    const tournament = await Tournaments.findById(id);
    if (!tournament) return reply.status(404).send({ error: "Torneo no encontrado" });
    if (!(await canManageTournament(tournament, userId))) {
      return reply.status(403).send({ error: "No tienes permiso para gestionar este torneo" });
    }

    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const category = await TournamentCategories.create({ tournamentId: id, ...parsed.data });
    return reply.send(await serializeCategory(category.id, userId));
  });

  // ---------- Detalle de categoría: inscripciones, parejas, grupos, llave ----------

  app.get("/tournament-categories/:categoryId", async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const category = await TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    const userId = userIdFromAuthHeader(req.headers.authorization);
    return reply.send(await serializeCategoryDetail(categoryId, userId));
  });

  // Inscripción individual de un jugador a una categoría (el club/admin arma las parejas después).
  app.post("/tournament-categories/:categoryId/register", { preHandler: requireAuth }, async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const userId = (req as any).userId as string;
    const category = await TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    if (category.status !== "REGISTRATION") {
      return reply.status(409).send({ error: "Esta categoría ya cerró inscripciones" });
    }
    if (await CategoryRegistrations.isRegistered(categoryId, userId)) {
      return reply.status(409).send({ error: "Ya estás inscrito en esta categoría" });
    }

    const user = await Users.findById(userId);
    if (user?.gender && category.genderCategory !== "MIXTO" && user.gender !== category.genderCategory) {
      return reply.status(409).send({ error: "Tu género no corresponde a esta categoría" });
    }

    await CategoryRegistrations.create({ categoryId, userId });
    return reply.send(await serializeCategoryDetail(categoryId, userId));
  });

  // El club/admin arma una pareja a partir de 2 jugadores ya inscritos y sin pareja.
  app.post("/tournament-categories/:categoryId/pairs", { preHandler: requireAuth }, async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const userId = (req as any).userId as string;
    const category = await TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    const tournament = (await Tournaments.findById(category.tournamentId))!;
    if (!(await canManageTournament(tournament, userId))) {
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

    const registrations = await CategoryRegistrations.listByCategory(categoryId);
    const reg1 = registrations.find((r) => r.userId === player1Id);
    const reg2 = registrations.find((r) => r.userId === player2Id);
    if (!reg1 || !reg2) {
      return reply.status(409).send({ error: "Ambos jugadores deben estar inscritos en esta categoría" });
    }
    if (reg1.pairId || reg2.pairId) {
      return reply.status(409).send({ error: "Uno de los jugadores ya tiene pareja asignada" });
    }

    const pair = await TournamentPairs.create({ categoryId, player1Id, player2Id });
    await CategoryRegistrations.setPair(categoryId, player1Id, pair.id);
    await CategoryRegistrations.setPair(categoryId, player2Id, pair.id);
    return reply.send(publicPair(pair, await Users.findById(player1Id), await Users.findById(player2Id)));
  });

  // Reparte las parejas armadas en grupos y genera los partidos todos-contra-todos.
  app.post("/tournament-categories/:categoryId/generate-groups", { preHandler: requireAuth }, async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const userId = (req as any).userId as string;
    const category = await TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    const tournament = (await Tournaments.findById(category.tournamentId))!;
    if (!(await canManageTournament(tournament, userId))) {
      return reply.status(403).send({ error: "No tienes permiso para gestionar este torneo" });
    }
    if (category.status !== "REGISTRATION") {
      return reply.status(409).send({ error: "Los grupos de esta categoría ya fueron generados" });
    }

    const pairs = await TournamentPairs.listByCategory(categoryId);
    const numGroups = numGroupsForBracketSize(category.bracketSize);
    const minPairs = numGroups * 2;
    if (pairs.length < minPairs) {
      return reply.status(409).send({
        error: `Necesitas al menos ${minPairs} parejas armadas para ${numGroups} grupos (llave de ${category.bracketSize}). Hay ${pairs.length}.`,
      });
    }

    await generateGroups(categoryId, pairs, numGroups);
    await TournamentCategories.updateStatus(categoryId, "GROUPS");
    return reply.send(await serializeCategoryDetail(categoryId, userId));
  });

  // Resultado de un partido de fase de grupos.
  app.post("/group-matches/:matchId/result", { preHandler: requireAuth }, async (req, reply) => {
    const { matchId } = req.params as { matchId: string };
    const userId = (req as any).userId as string;
    const match = await GroupMatches.findById(matchId);
    if (!match) return reply.status(404).send({ error: "Partido no encontrado" });
    const category = (await TournamentCategories.findById(match.categoryId))!;
    const tournament = (await Tournaments.findById(category.tournamentId))!;
    if (!(await canManageTournament(tournament, userId))) {
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

    await GroupMatches.setResult(matchId, winnerPairId, setsA, setsB);
    return reply.send(await serializeCategoryDetail(match.categoryId, userId));
  });

  // Calcula los 2 mejores de cada grupo y genera la llave de eliminación directa.
  app.post("/tournament-categories/:categoryId/generate-knockout", { preHandler: requireAuth }, async (req, reply) => {
    const { categoryId } = req.params as { categoryId: string };
    const userId = (req as any).userId as string;
    const category = await TournamentCategories.findById(categoryId);
    if (!category) return reply.status(404).send({ error: "Categoría no encontrada" });
    const tournament = (await Tournaments.findById(category.tournamentId))!;
    if (!(await canManageTournament(tournament, userId))) {
      return reply.status(403).send({ error: "No tienes permiso para gestionar este torneo" });
    }
    if (category.status !== "GROUPS") {
      return reply.status(409).send({ error: "Esta categoría no está en fase de grupos" });
    }

    const groups = await TournamentGroups.listByCategory(categoryId);
    const pairs = await TournamentPairs.listByCategory(categoryId);
    const winners: string[] = [];
    const runnersUp: string[] = [];

    for (const g of groups) {
      const groupPairs = pairs.filter((p) => p.groupId === g.id);
      const allMatches = await GroupMatches.listByCategory(categoryId);
      const matches = allMatches.filter((m) => m.groupId === g.id);
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

    await generateKnockoutFromGroups(categoryId, winners, runnersUp);
    await TournamentCategories.updateStatus(categoryId, "KNOCKOUT");
    return reply.send(await serializeCategoryDetail(categoryId, userId));
  });

  // Resultado de un partido de la llave de eliminación directa.
  app.post("/bracket-matches/:matchId/result", { preHandler: requireAuth }, async (req, reply) => {
    const { matchId } = req.params as { matchId: string };
    const userId = (req as any).userId as string;
    const match = await BracketMatches.findById(matchId);
    if (!match) return reply.status(404).send({ error: "Partido no encontrado" });
    const category = (await TournamentCategories.findById(match.categoryId))!;
    const tournament = (await Tournaments.findById(category.tournamentId))!;
    if (!(await canManageTournament(tournament, userId))) {
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

    const updated = (await BracketMatches.setResult(matchId, winnerPairId, setsA, setsB))!;
    const totalRounds = totalRoundsForBracketSize(category.bracketSize);
    await advanceBracketWinner(updated, totalRounds);
    if (updated.round >= totalRounds) {
      await TournamentCategories.updateStatus(category.id, "COMPLETED");
    }

    return reply.send(await serializeCategoryDetail(match.categoryId, userId));
  });
}
