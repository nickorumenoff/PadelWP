import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { initSchema } from "./db";
import { UPLOADS_DIR, ensureUploadsDir } from "./storage";
import authRoutes from "./routes/auth";
import clubRoutes from "./routes/clubs";
import bookingRoutes from "./routes/bookings";
import matchRoutes from "./routes/matches";
import paymentRoutes from "./routes/payments";
import sponsorshipRoutes from "./routes/sponsorships";
import tournamentRoutes from "./routes/tournaments";
import reviewRoutes from "./routes/reviews";
import notificationRoutes from "./routes/notifications";
import adSlotRoutes from "./routes/ad-slots";

async function main() {
  await initSchema();
  await ensureUploadsDir();

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart);
  // Sirve los archivos subidos (comprobantes de pago) bajo /uploads/*. Ver
  // storage.ts para el aviso sobre almacenamiento efímero en Railway.
  await app.register(fastifyStatic, { root: UPLOADS_DIR, prefix: "/uploads/" });

  app.get("/health", async () => ({ ok: true, service: "padel-ve-api" }));

  await app.register(authRoutes);
  await app.register(clubRoutes);
  await app.register(bookingRoutes);
  await app.register(matchRoutes);
  await app.register(paymentRoutes);
  await app.register(sponsorshipRoutes);
  await app.register(tournamentRoutes);
  await app.register(reviewRoutes);
  await app.register(notificationRoutes);
  await app.register(adSlotRoutes);

  const port = Number(process.env.PORT) || 4000;
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
