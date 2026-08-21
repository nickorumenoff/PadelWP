import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Notifications, Payments, Users } from "../repositories";
import { requireAuth } from "../auth";
import { publicPayment } from "../serializers";
import { saveUploadedFile } from "../storage";

const ALLOWED_PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
const MAX_PROOF_BYTES = 8 * 1024 * 1024; // 8MB

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

    const payment = await Payments.create({ ...parsed.data, userId });
    return reply.send(publicPayment(payment));
  });

  app.get("/payments/me", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const payments = await Payments.listByUser(userId);
    return reply.send(payments.map(publicPayment));
  });

  // Conciliación administrativa (solo rol PLATFORM_ADMIN).
  app.post("/payments/:id/verify", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { approve } = req.body as { approve: boolean };
    const userId = (req as any).userId as string;

    const admin = await Users.findById(userId);
    if (admin?.role !== "PLATFORM_ADMIN") {
      return reply.status(403).send({ error: "Solo un administrador puede conciliar pagos" });
    }

    const payment = await Payments.updateStatus(id, approve ? "VERIFIED" : "REJECTED");
    if (!payment) return reply.status(404).send({ error: "Pago no encontrado" });

    await Notifications.create({
      userId: payment.userId,
      type: approve ? "PAYMENT_VERIFIED" : "PAYMENT_REJECTED",
      message: approve
        ? `Tu pago de ${payment.currency} ${payment.amount} fue verificado.`
        : `Tu pago de ${payment.currency} ${payment.amount} fue rechazado. Revisa la referencia e intenta de nuevo.`,
      relatedId: payment.id,
    });

    return reply.send(publicPayment(payment));
  });

  // Sube la imagen/PDF del comprobante para un pago ya reportado. Solo quien
  // reportó el pago puede adjuntar su comprobante. Ver storage.ts para el
  // aviso sobre almacenamiento efímero en Railway.
  app.post("/payments/:id/proof", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;

    const payment = await Payments.findById(id);
    if (!payment) return reply.status(404).send({ error: "Pago no encontrado" });
    if (payment.userId !== userId) {
      return reply.status(403).send({ error: "Solo quien reportó el pago puede adjuntar su comprobante" });
    }

    const file = await req.file({ limits: { fileSize: MAX_PROOF_BYTES } });
    if (!file) return reply.status(400).send({ error: "No se recibió ningún archivo" });
    if (!ALLOWED_PROOF_TYPES.has(file.mimetype)) {
      return reply.status(400).send({ error: "Formato no soportado. Usa imagen (JPG/PNG/WEBP/HEIC) o PDF." });
    }

    const { relativePath } = await saveUploadedFile("payments", file.filename, file.file);
    if (file.file.truncated) {
      return reply.status(400).send({ error: "El archivo excede el tamaño máximo permitido (8MB)" });
    }

    const withProof = await Payments.setProofUrl(id, relativePath);
    return reply.send(publicPayment(withProof!));
  });
}
