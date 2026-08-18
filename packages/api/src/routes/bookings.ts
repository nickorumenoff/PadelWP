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

    const court = Courts.findById(courtId);
    if (!court) return reply.status(404).send({ error: "Pista no encontrada" });

    const conflict = Bookings.findByCourtDateStart(courtId, date, startTime);
    if (conflict) {
      return reply.status(409).send({ error: "Ese horario ya está reservado" });
    }

    const booking = Bookings.create({ courtId, date, startTime, endTime, userId });
    return reply.send(publicBooking(booking));
  });

  app.get("/bookings/me", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const bookings = Bookings.listByUser(userId);
    return reply.send(bookings.map(publicBooking));
  });
}
