import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { computeLevelAfterMatch } from "@padel-ve/shared";
import { Bookings, Clubs, Courts, MatchPlayers, Matches, Users } from "../repositories";
import { requireAuth } from "../auth";
import { publicBooking, publicClub, publicCourt, publicMatch } from "../serializers";

// Escala de nivel: 1.00 (mejor categoría) a 8.00 (principiante).
const createMatchSchema = z.object({
  bookingId: z.string(),
  type: z.enum(["OPEN", "PRIVATE"]).default("OPEN"),
  levelMin: z.number().min(1).max(8).default(1),
  levelMax: z.number().min(1).max(8).default(8),
});

const joinMatchSchema = z.object({
  team: z.union([z.literal(1), z.literal(2)]),
});

const resultSchema = z.object({
  winnerTeam: z.union([z.literal(1), z.literal(2)]),
});

function serializeFull(matchId: string) {
  const match = Matches.findById(matchId)!;
  const players = MatchPlayers.listByMatch(matchId).map((p) => ({
    ...p,
    user: Users.findById(p.userId),
  }));
  const booking = Bookings.findById(match.bookingId);
  const base = publicMatch(match, players, booking);

  // Enriquecemos la reserva con la pista y el club para que la UI pueda mostrar
  // dónde se juega la partida sin hacer llamadas adicionales.
  let bookingWithCourt: any = base.booking;
  if (booking) {
    const court = Courts.findById(booking.courtId);
    const club = court ? Clubs.findById(court.clubId) : undefined;
    bookingWithCourt = {
      ...publicBooking(booking),
      court: court ? { ...publicCourt(court), club: club ? publicClub(club, []) : undefined } : undefined,
    };
  }

  return { ...base, booking: bookingWithCourt };
}

export default async function matchRoutes(app: FastifyInstance) {
  // Partidas abiertas, filtrables por ciudad y nivel del jugador que busca.
  app.get("/matches", async (req, reply) => {
    const { city, levelMin, levelMax } = req.query as {
      city?: string;
      levelMin?: string;
      levelMax?: string;
    };

    const matches = Matches.list({
      city,
      levelMin: levelMin ? Number(levelMin) : undefined,
      levelMax: levelMax ? Number(levelMax) : undefined,
    });
    return reply.send(matches.map((m) => serializeFull(m.id)));
  });

  app.post("/matches", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = (req as any).userId as string;
    const { bookingId, type, levelMin, levelMax } = parsed.data;

    const booking = Bookings.findById(bookingId);
    if (!booking) return reply.status(404).send({ error: "Reserva no encontrada" });

    const already = Matches.findByBookingId(bookingId);
    if (already) return reply.status(409).send({ error: "Esa reserva ya tiene una partida asociada" });

    const match = Matches.create({ bookingId, creatorId: userId, type, levelMin, levelMax });
    MatchPlayers.create({ matchId: match.id, userId, team: 1 });

    return reply.send(serializeFull(match.id));
  });

  app.post("/matches/:id/join", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = joinMatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = (req as any).userId as string;

    const match = Matches.findById(id);
    if (!match) return reply.status(404).send({ error: "Partida no encontrada" });
    if (match.status !== "OPEN") return reply.status(409).send({ error: "La partida ya no admite jugadores" });

    const players = MatchPlayers.listByMatch(id);
    if (players.length >= 4) return reply.status(409).send({ error: "La partida ya está completa" });
    if (players.some((p) => p.userId === userId)) {
      return reply.status(409).send({ error: "Ya estás en esta partida" });
    }

    const { team } = parsed.data;
    const teamCount = players.filter((p) => p.team === team).length;
    if (teamCount >= 2) return reply.status(409).send({ error: "Ese equipo ya está completo" });

    MatchPlayers.create({ matchId: id, userId, team });

    const updatedCount = MatchPlayers.listByMatch(id).length;
    if (updatedCount >= 4) {
      Matches.updateStatus(id, "FULL");
    }

    return reply.send(serializeFull(id));
  });

  // Partidas en las que el usuario autenticado participa (cualquier estado),
  // para que pueda ver su historial y registrar el resultado de las que jugó.
  app.get("/matches/mine", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const matches = Matches.listForUser(userId);
    return reply.send(matches.map((m) => serializeFull(m.id)));
  });

  // Registra el resultado de una partida completa (4 jugadores) y ajusta el
  // nivel de los 4 jugadores tipo Elo, según si ganaron/perdieron y el nivel
  // de sus rivales. Solo un jugador de la propia partida puede reportarlo.
  app.post("/matches/:id/result", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = resultSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = (req as any).userId as string;

    const match = Matches.findById(id);
    if (!match) return reply.status(404).send({ error: "Partida no encontrada" });
    if (match.status === "COMPLETED") {
      return reply.status(409).send({ error: "Esta partida ya tiene un resultado registrado" });
    }
    if (match.status !== "FULL") {
      return reply.status(409).send({ error: "La partida necesita 4 jugadores confirmados para reportar un resultado" });
    }

    const players = MatchPlayers.listByMatch(id);
    if (!players.some((p) => p.userId === userId)) {
      return reply.status(403).send({ error: "Solo un jugador de esta partida puede reportar el resultado" });
    }
    if (players.length < 4) {
      return reply.status(409).send({ error: "Faltan jugadores para poder reportar un resultado" });
    }

    const { winnerTeam } = parsed.data;

    const usersById = new Map(players.map((p) => [p.userId, Users.findById(p.userId)!]));
    const team1 = players.filter((p) => p.team === 1);
    const team2 = players.filter((p) => p.team === 2);
    const avgLevel = (team: typeof players) =>
      team.reduce((sum, p) => sum + usersById.get(p.userId)!.level, 0) / team.length;
    const team1Avg = avgLevel(team1);
    const team2Avg = avgLevel(team2);

    for (const p of players) {
      const onTeam1 = p.team === 1;
      const opponentAvgLevel = onTeam1 ? team2Avg : team1Avg;
      const won = onTeam1 ? winnerTeam === 1 : winnerTeam === 2;
      const currentLevel = usersById.get(p.userId)!.level;
      const newLevel = computeLevelAfterMatch({ currentLevel, opponentAvgLevel, won });
      Users.updateLevel(p.userId, newLevel);
    }

    const updated = Matches.setResult(id, winnerTeam);
    return reply.send(serializeFull(updated!.id));
  });
}
