import type { FastifyInstance } from "fastify";
import { Notifications } from "../repositories";
import { requireAuth } from "../auth";
import { publicNotification } from "../serializers";

export default async function notificationRoutes(app: FastifyInstance) {
  app.get("/notifications/me", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const notifications = await Notifications.listByUser(userId);
    return reply.send(notifications.map(publicNotification));
  });

  app.post("/notifications/:id/read", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId as string;

    const notification = await Notifications.findById(id);
    if (!notification) return reply.status(404).send({ error: "Notificación no encontrada" });
    if (notification.userId !== userId) {
      return reply.status(403).send({ error: "Esta notificación no te pertenece" });
    }

    await Notifications.markRead(id);
    return reply.send({ ok: true });
  });

  app.post("/notifications/read-all", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    await Notifications.markAllRead(userId);
    return reply.send({ ok: true });
  });
}
