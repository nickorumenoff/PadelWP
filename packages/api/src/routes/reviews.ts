import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Clubs, Reviews, Users } from "../repositories";
import { requireAuth } from "../auth";
import { publicReview } from "../serializers";

const reviewSchema = z.object({
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  comment: z.string().max(500).optional(),
});

export default async function reviewRoutes(app: FastifyInstance) {
  app.get("/clubs/:id/reviews", async (req, reply) => {
    const { id } = req.params as { id: string };
    const reviews = await Reviews.listByClub(id);
    const withUser = await Promise.all(
      reviews.map(async (r) => ({ ...r, user: await Users.findById(r.userId) }))
    );
    return reply.send(withUser.map(publicReview));
  });

  // Upsert: si el jugador ya reseñó este club, esto actualiza su reseña anterior
  // en vez de crear una duplicada (una reseña por jugador por club).
  app.post("/clubs/:id/reviews", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = (req as any).userId as string;

    const club = await Clubs.findById(id);
    if (!club) return reply.status(404).send({ error: "Club no encontrado" });

    const review = await Reviews.upsert({ clubId: id, userId, ...parsed.data });
    const user = await Users.findById(userId);
    return reply.send(publicReview({ ...review, user }));
  });
}
