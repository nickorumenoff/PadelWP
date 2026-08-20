import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { initSchema } from "./db";
import authRoutes from "./routes/auth";
import clubRoutes from "./routes/clubs";
import bookingRoutes from "./routes/bookings";
import matchRoutes from "./routes/matches";
import paymentRoutes from "./routes/payments";
import sponsorshipRoutes from "./routes/sponsorships";
import tournamentRoutes from "./routes/tournaments";

async function main() {
  await initSchema();

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true, service: "padel-ve-api" }));

  await app.register(authRoutes);
  await app.register(clubRoutes);
  await app.register(bookingRoutes);
  await app.register(matchRoutes);
  await app.register(paymentRoutes);
  await app.register(sponsorshipRoutes);
  await app.register(tournamentRoutes);

  const port = Number(process.env.PORT) || 4000;
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
