import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AdSlots, Users } from "../repositories";
import { requireAuth } from "../auth";
import { publicAdSlot } from "../serializers";
import { saveUploadedFile } from "../storage";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

const positionParamSchema = z.object({ position: z.coerce.number().int().min(1).max(4) });

const updateSlotSchema = z.object({
  title: z.string().max(80).nullable().optional(),
  text: z.string().max(280).nullable().optional(),
  linkUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  active: z.boolean().optional(),
});

async function requireAdmin(req: any, reply: any): Promise<boolean> {
  const userId = req.userId as string;
  const admin = await Users.findById(userId);
  if (admin?.role !== "PLATFORM_ADMIN") {
    reply.status(403).send({ error: "Solo un administrador de plataforma puede gestionar espacios publicitarios" });
    return false;
  }
  return true;
}

/**
 * 4 espacios publicitarios fijos (posiciones 1-4), gestionados solo por el admin
 * de plataforma: foto + título + texto corto + interruptor on/off, sin ningún
 * seguimiento de pago (coexisten con el autoservicio de patrocinios en
 * sponsorships.ts, no lo reemplazan).
 */
export default async function adSlotRoutes(app: FastifyInstance) {
  // Público: solo los espacios activos, para mostrar en inicio/explorar y en la página de patrocinadores.
  app.get("/ad-slots", async (_req, reply) => {
    const slots = await AdSlots.listActive();
    return reply.send(slots.map(publicAdSlot));
  });

  // Admin: los 4 espacios completos (activos e inactivos) para gestionarlos.
  app.get("/ad-slots/admin", { preHandler: requireAuth }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const slots = await AdSlots.listAll();
    return reply.send(slots.map(publicAdSlot));
  });

  app.put("/ad-slots/:position", { preHandler: requireAuth }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const paramsParsed = positionParamSchema.safeParse(req.params);
    if (!paramsParsed.success) return reply.status(400).send({ error: "Posición inválida (debe ser 1-4)" });
    const bodyParsed = updateSlotSchema.safeParse(req.body);
    if (!bodyParsed.success) return reply.status(400).send({ error: bodyParsed.error.flatten() });

    const updated = await AdSlots.update(paramsParsed.data.position, bodyParsed.data);
    if (!updated) return reply.status(404).send({ error: "Espacio no encontrado" });
    return reply.send(publicAdSlot(updated));
  });

  app.post("/ad-slots/:position/image", { preHandler: requireAuth }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const paramsParsed = positionParamSchema.safeParse(req.params);
    if (!paramsParsed.success) return reply.status(400).send({ error: "Posición inválida (debe ser 1-4)" });

    const existing = await AdSlots.findByPosition(paramsParsed.data.position);
    if (!existing) return reply.status(404).send({ error: "Espacio no encontrado" });

    const file = await (req as any).file({ limits: { fileSize: MAX_IMAGE_BYTES } });
    if (!file) return reply.status(400).send({ error: "No se recibió ninguna imagen" });
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return reply.status(400).send({ error: "Formato no soportado. Usa imagen JPG/PNG/WEBP/HEIC." });
    }

    const { relativePath } = await saveUploadedFile("ad-slots", file.filename, file.file);
    if (file.file.truncated) {
      return reply.status(400).send({ error: "La imagen excede el tamaño máximo permitido (8MB)" });
    }

    const updated = await AdSlots.setImage(paramsParsed.data.position, relativePath);
    return reply.send(publicAdSlot(updated!));
  });
}
