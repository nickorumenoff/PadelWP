import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TournamentRegistrations, Tournaments, Users } from "../repositories";
import { requireAuth } from "../auth";
import { publicTournament } from "../serializers";

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

function serialize(tournamentId: string, userId?: string) {
  const tournament = Tournaments.findById(tournamentId)!;
  const registrations = TournamentRegistrations.listByTournament(tournamentId);
  return publicTournament(tournament, {
    registeredCount: registrations.length,
    isRegistered: userId ? registrations.some((r) => r.userId === userId) : false,
  });
}

export default async function tournamentRoutes(app: FastifyInstance) {
  // Torneos publicados, visibles para cualquier jugador (autenticado o no).
  app.get("/tournaments", async (req, reply) => {
    const { city } = req.query as { city?: string };
    const header = req.headers.authorization;
    let userId: string | undefined;
    if (header?.startsWith("Bearer ")) {
      const { verifyToken } = await import("../auth");
      userId = verifyToken(header.slice(7))?.userId;
    }
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
}
