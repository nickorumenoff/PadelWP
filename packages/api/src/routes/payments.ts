import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Payments, Users } from "../repositories";
import { requireAuth } from "../auth";
import { publicPayment } from "../serializers";

// Venezuela: sin pasarela automatizada en el MVP. El jugador/club reporta el pago
// (Pago Móvil, transferencia, Zelle o USDT) con una referencia/comprobante, y un
// administrador lo concilia manualmente cambiando el estado a VERIFIED o REJECTED.
const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["VES", "USD"]).default("USD"),
  method: z.enum(["PAGO_MOVIL", "TRANSFERENCIA", "ZELLE", "USDT"]),
  reference: z.string().optional(),
  proofUrl: z.string().optional(),
  purpose: z.enum(["BOOKING", "SPONSORSHIP", "CLUB_PLAN"]),
  relatedId: z.string().optional(),
});

export default async function paymentRoutes(app: FastifyInstance) {
  app.post("/payments", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = (req as any).userId as string;

    const payment = Payments.create({ ...parsed.data, userId });
    return reply.send(publicPayment(payment));
  });

  app.get("/payments/me", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const payments = Payments.listByUser(userId);
    return reply.send(payments.map(publicPayment));
  });

  // Conciliación administrativa (solo rol PLATFORM_ADMIN).
  app.post("/payments/:id/verify", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { approve } = req.body as { approve: boolean };
    const userId = (req as any).userId as string;

    const admin = Users.findById(userId);
    if (admin?.role !== "PLATFORM_ADMIN") {
      return reply.status(403).send({ error: "Solo un administrador puede conciliar pagos" });
    }

    const payment = Payments.updateStatus(id, approve ? "VERIFIED" : "REJECTED");
    if (!payment) return reply.status(404).send({ error: "Pago no encontrado" });
    return reply.send(publicPayment(payment));
  });
}
