import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Clubs, Sponsorships, Users } from "../repositories";
import { requireAuth } from "../auth";
import { publicSponsorship } from "../serializers";

// Ventana para que marcas/negocios paguen por presencia dentro de la app,
// y para que un club pague por un plan de visibilidad destacada.
const createSponsorshipSchema = z.object({
  sponsorName: z.string().min(2),
  planName: z.string().min(2),
  clubId: z.string().optional(),
  bannerUrl: z.string().optional(),
  linkUrl: z.string().optional(),
});

export default async function sponsorshipRoutes(app: FastifyInstance) {
  app.get("/sponsorships", async (_req, reply) => {
    const sponsorships = await Sponsorships.listActive();
    return reply.send(sponsorships.map(publicSponsorship));
  });

  app.post("/sponsorships", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createSponsorshipSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    // Se crea como PENDING: pasa a ACTIVE cuando el pago asociado se verifica (flujo manual del admin).
    const sponsorship = await Sponsorships.create(parsed.data);
    return reply.send(publicSponsorship(sponsorship));
  });

  app.post("/sponsorships/:id/activate", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;
    const admin = await Users.findById(userId);
    if (admin?.role !== "PLATFORM_ADMIN") {
      return reply.status(403).send({ error: "Solo un administrador puede activar patrocinios" });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const sponsorship = await Sponsorships.activate(id, endDate.toISOString());
    if (!sponsorship) return reply.status(404).send({ error: "Patrocinio no encontrado" });

    if (sponsorship.clubId) {
      await Clubs.updateVisibilityPlan(sponsorship.clubId, "FEATURED");
    }

    return reply.send(publicSponsorship(sponsorship));
  });
}
