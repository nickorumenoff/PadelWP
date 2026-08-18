import type { FastifyInstance } from "fastify";
import { z } from "zod";
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
}
