import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Bookings, Courts } from "../repositories";
import { requireAuth } from "../auth";
import { publicBooking } from "../serializers";

const createBookingSchema = z.object({
  courtId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export default async function bookingRoutes(app: FastifyInstance) {
  app.post("/bookings", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = (req as any).userId as string;
    const { courtId, date, startTime, endTime } = parsed.data;

    const court = await Courts.findById(courtId);
    if (!court) return reply.status(404).send({ error: "Pista no encontrada" });

    const conflict = await Bookings.findByCourtDateStart(courtId, date, startTime);
    if (conflict) {
      return reply.status(409).send({ error: "Ese horario ya está reservado" });
    }

    const booking = await Bookings.create({ courtId, date, startTime, endTime, userId });
    return reply.send(publicBooking(booking));
  });

  app.get("/bookings/me", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const bookings = await Bookings.listByUser(userId);
    return reply.send(bookings.map(publicBooking));
  });

  // Cancela una reserva propia. Si tiene una partida asociada que no esté ya
  // completada/cancelada, se cancela junto con la reserva (ver matchRoutes /cancel,
  // que es el flujo normal desde la UI ya que toda reserva crea una partida).
  app.post("/bookings/:id/cancel", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;

    const booking = await Bookings.findById(id);
    if (!booking) return reply.status(404).send({ error: "Reserva no encontrada" });
    if (booking.userId !== userId) {
      return reply.status(403).send({ error: "Solo quien reservó puede cancelarla" });
    }
    if (booking.status === "CANCELLED") {
      return reply.status(409).send({ error: "Esta reserva ya está cancelada" });
    }

    const cancelled = await Bookings.cancel(id);
    return reply.send(publicBooking(cancelled!));
  });
}
