import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Bookings, Clubs, Courts } from "../repositories";
import { requireAuth } from "../auth";
import { publicClub, publicCourt } from "../serializers";

const createClubSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().min(3),
  city: z.string().min(2),
});

const createCourtSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CRISTAL", "MURO", "PANORAMICA"]).default("CRISTAL"),
  indoor: z.boolean().default(false),
  pricePerHourUsd: z.number().positive(),
});

const planOrder: Record<string, number> = { PREMIUM: 0, FEATURED: 1, BASIC: 2, NONE: 3 };

export default async function clubRoutes(app: FastifyInstance) {
  // Listar clubes aprobados; los que pagan un plan de mayor visibilidad aparecen primero.
  // Este es el mecanismo por el cual un club paga por "presencia destacada" en la app.
  app.get("/clubs", async (req, reply) => {
    const { city } = req.query as { city?: string };
    const clubs = Clubs.listApproved(city);
    clubs.sort((a, b) => planOrder[a.visibilityPlan] - planOrder[b.visibilityPlan]);
    return reply.send(clubs.map((c) => publicClub(c, Courts.listByClub(c.id))));
  });

  app.get("/clubs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const club = Clubs.findById(id);
    if (!club) return reply.status(404).send({ error: "Club no encontrado" });
    return reply.send(publicClub(club, Courts.listByClub(club.id)));
  });

  app.post("/clubs", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createClubSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = (req as any).userId as string;

    const club = Clubs.create({ ...parsed.data, ownerId: userId }); // auto-aprobado en el MVP
    return reply.send(publicClub(club, []));
  });

  app.post("/clubs/:id/courts", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = createCourtSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const club = Clubs.findById(id);
    if (!club) return reply.status(404).send({ error: "Club no encontrado" });

    const userId = (req as any).userId as string;
    if (club.ownerId !== userId) {
      return reply.status(403).send({ error: "Solo el dueño del club puede añadir pistas" });
    }

    const court = Courts.create({ ...parsed.data, clubId: id });
    return reply.send(publicCourt(court));
  });

  // Disponibilidad de una pista para una fecha: genera franjas de 1h de 8:00 a 22:00
  // marcando como BOOKED las que ya tengan una reserva.
  app.get("/courts/:courtId/availability", async (req, reply) => {
    const { courtId } = req.params as { courtId: string };
    const { date } = req.query as { date?: string };
    if (!date) return reply.status(400).send({ error: "Falta el parámetro date (YYYY-MM-DD)" });

    const court = Courts.findById(courtId);
    if (!court) return reply.status(404).send({ error: "Pista no encontrada" });

    const existing = Bookings.listByCourtAndDate(courtId, date);
    const byStart = new Map(existing.map((b) => [b.startTime, b]));

    const slots = [];
    for (let hour = 8; hour < 22; hour++) {
      const startTime = `${String(hour).padStart(2, "0")}:00`;
      const endTime = `${String(hour + 1).padStart(2, "0")}:00`;
      const booking = byStart.get(startTime);
      slots.push(
        booking
          ? {
              id: booking.id,
              courtId,
              date,
              startTime,
              endTime,
              status: booking.status,
              userId: booking.userId,
            }
          : {
              id: `virtual-${courtId}-${date}-${startTime}`,
              courtId,
              date,
              startTime,
              endTime,
              status: "AVAILABLE",
              userId: null,
            }
      );
    }
    return reply.send(slots);
  });
}
