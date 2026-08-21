import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Bookings, Clubs, Courts, Reviews } from "../repositories";
import { requireAuth } from "../auth";
import { publicBooking, publicClub, publicCourt } from "../serializers";

const createClubSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().min(3),
  city: z.string().min(2),
});

const updateClubHoursSchema = z.object({
  openHour: z.number().int().min(0).max(23),
  closeHour: z.number().int().min(1).max(24),
});

const createCourtSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CRISTAL", "MURO", "PANORAMICA"]).default("CRISTAL"),
  indoor: z.boolean().default(false),
  lighting: z.boolean().default(false),
  pricePerHourUsd: z.number().positive(),
});

const updateCourtSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["CRISTAL", "MURO", "PANORAMICA"]).optional(),
  indoor: z.boolean().optional(),
  lighting: z.boolean().optional(),
  pricePerHourUsd: z.number().positive().optional(),
});

const planOrder: Record<string, number> = { PREMIUM: 0, FEATURED: 1, BASIC: 2, NONE: 3 };

export default async function clubRoutes(app: FastifyInstance) {
  // Listar clubes aprobados; los que pagan un plan de mayor visibilidad aparecen primero.
  // Este es el mecanismo por el cual un club paga por "presencia destacada" en la app.
  app.get("/clubs", async (req, reply) => {
    const { city } = req.query as { city?: string };
    const clubs = await Clubs.listApproved(city);
    clubs.sort((a, b) => planOrder[a.visibilityPlan] - planOrder[b.visibilityPlan]);
    const withCourts = await Promise.all(
      clubs.map(async (c) => publicClub(c, await Courts.listByClub(c.id), await Reviews.summaryByClub(c.id)))
    );
    return reply.send(withCourts);
  });

  app.get("/clubs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const club = await Clubs.findById(id);
    if (!club) return reply.status(404).send({ error: "Club no encontrado" });
    return reply.send(publicClub(club, await Courts.listByClub(club.id), await Reviews.summaryByClub(club.id)));
  });

  app.post("/clubs", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createClubSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = (req as any).userId as string;

    const club = await Clubs.create({ ...parsed.data, ownerId: userId }); // auto-aprobado en el MVP
    return reply.send(publicClub(club, []));
  });

  app.post("/clubs/:id/courts", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = createCourtSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const club = await Clubs.findById(id);
    if (!club) return reply.status(404).send({ error: "Club no encontrado" });

    const userId = (req as any).userId as string;
    if (club.ownerId !== userId) {
      return reply.status(403).send({ error: "Solo el dueño del club puede añadir pistas" });
    }

    const court = await Courts.create({ ...parsed.data, clubId: id });
    return reply.send(publicCourt(court));
  });

  // Actualiza atributos de una pista (nombre, tipo/material, techada, iluminación, precio).
  app.patch("/courts/:courtId", { preHandler: requireAuth }, async (req, reply) => {
    const { courtId } = req.params as { courtId: string };
    const parsed = updateCourtSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const court = await Courts.findById(courtId);
    if (!court) return reply.status(404).send({ error: "Pista no encontrada" });

    const club = await Clubs.findById(court.clubId);
    const userId = (req as any).userId as string;
    if (!club || club.ownerId !== userId) {
      return reply.status(403).send({ error: "Solo el dueño del club puede editar esta pista" });
    }

    const updated = await Courts.update(courtId, parsed.data);
    return reply.send(publicCourt(updated!));
  });

  // Actualiza el horario de apertura/cierre del club (usado para generar la disponibilidad).
  app.patch("/clubs/:id/hours", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateClubHoursSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const club = await Clubs.findById(id);
    if (!club) return reply.status(404).send({ error: "Club no encontrado" });

    const userId = (req as any).userId as string;
    if (club.ownerId !== userId) {
      return reply.status(403).send({ error: "Solo el dueño del club puede editar el horario" });
    }
    if (parsed.data.closeHour <= parsed.data.openHour) {
      return reply.status(400).send({ error: "La hora de cierre debe ser posterior a la de apertura" });
    }

    const updated = await Clubs.updateHours(id, parsed.data.openHour, parsed.data.closeHour);
    return reply.send(publicClub(updated!, await Courts.listByClub(id)));
  });

  // Lista todas las reservas de las pistas del club, para que el dueño las gestione.
  app.get("/clubs/:id/bookings", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const club = await Clubs.findById(id);
    if (!club) return reply.status(404).send({ error: "Club no encontrado" });

    const userId = (req as any).userId as string;
    if (club.ownerId !== userId) {
      return reply.status(403).send({ error: "Solo el dueño del club puede ver sus reservas" });
    }

    const bookings = await Bookings.listByClub(id);
    return reply.send(bookings.map(publicBooking));
  });

  // Reporte de ocupación e ingreso estimado para el dueño del club. "Estimado"
  // porque hoy reservar una pista no dispara un pago dentro de la app (los clubes
  // cobran aparte) — se calcula como precio/hora × reservas activas, no como
  // dinero verificado. Sirve para que el dueño vea qué tan lleno está y qué
  // pistas/horarios rinden más.
  app.get("/clubs/:id/report", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { days } = req.query as { days?: string };
    const periodDays = Math.min(Math.max(Number(days) || 30, 1), 365);

    const club = await Clubs.findById(id);
    if (!club) return reply.status(404).send({ error: "Club no encontrado" });

    const userId = (req as any).userId as string;
    if (club.ownerId !== userId) {
      return reply.status(403).send({ error: "Solo el dueño del club puede ver su reporte" });
    }

    const courts = await Courts.listByClub(id);
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    const sinceIso = since.toISOString().slice(0, 10);

    const bookings = await Bookings.listByClubSince(id, sinceIso);

    const hoursPerDay = Math.max(club.closeHour - club.openHour, 1);
    const totalSlots = courts.length * hoursPerDay * periodDays;
    const totalBookings = bookings.length;
    const estimatedRevenueUsd = bookings.reduce((sum, b) => sum + b.pricePerHourUsd, 0);
    const occupancyRate = totalSlots > 0 ? totalBookings / totalSlots : 0;

    const byCourt = courts.map((court) => {
      const courtBookings = bookings.filter((b) => b.courtId === court.id);
      const courtSlots = hoursPerDay * periodDays;
      return {
        courtId: court.id,
        courtName: court.name,
        bookings: courtBookings.length,
        estimatedRevenueUsd: courtBookings.reduce((sum, b) => sum + b.pricePerHourUsd, 0),
        occupancyRate: courtSlots > 0 ? courtBookings.length / courtSlots : 0,
      };
    });

    return reply.send({
      periodDays,
      totalBookings,
      estimatedRevenueUsd,
      occupancyRate,
      byCourt,
    });
  });

  // Disponibilidad de una pista para una fecha: genera franjas de 1h dentro del
  // horario que el club haya publicado (openHour-closeHour), marcando como
  // BOOKED las que ya tengan una reserva.
  app.get("/courts/:courtId/availability", async (req, reply) => {
    const { courtId } = req.params as { courtId: string };
    const { date } = req.query as { date?: string };
    if (!date) return reply.status(400).send({ error: "Falta el parámetro date (YYYY-MM-DD)" });

    const court = await Courts.findById(courtId);
    if (!court) return reply.status(404).send({ error: "Pista no encontrada" });
    const club = await Clubs.findById(court.clubId);

    const existing = await Bookings.listByCourtAndDate(courtId, date);
    // Una reserva cancelada libera el horario: se excluye para que vuelva a
    // aparecer como disponible en vez de bloqueado.
    const byStart = new Map(existing.filter((b) => b.status !== "CANCELLED").map((b) => [b.startTime, b]));

    const openHour = club?.openHour ?? 8;
    const closeHour = club?.closeHour ?? 22;

    const slots = [];
    for (let hour = openHour; hour < closeHour; hour++) {
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
