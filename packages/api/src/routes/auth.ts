import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { computePlayerLevel } from "@padel-ve/shared";
import { Users } from "../repositories";
import { requireAuth, signToken } from "../auth";
import { publicUser } from "../serializers";

// La encuesta de nivel se completa al crear el perfil. A partir de ella se calcula
// automáticamente el nivel del jugador (1.00 mejor categoría - 8.00 principiante).
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["PLAYER", "CLUB_ADMIN", "SPONSOR"]).optional(),
  city: z.string().optional(),
  gender: z.enum(["MASCULINO", "FEMENINO"]).optional(),
  dominantArm: z.enum(["DERECHA", "IZQUIERDA"]),
  frequency: z.enum([
    "DIARIO",
    "VARIAS_VECES_SEMANA",
    "SEMANAL",
    "QUINCENAL",
    "MENSUAL",
    "OCASIONAL",
  ]),
  yearsPlaying: z.number().min(0).max(60),
  selfAssessment: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  competes: z.boolean(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { name, email, password, role, city, gender, dominantArm, frequency, yearsPlaying, selfAssessment, competes } =
      parsed.data;

    const existing = Users.findByEmail(email);
    if (existing) {
      return reply.status(409).send({ error: "Ya existe una cuenta con ese email" });
    }

    const level = computePlayerLevel({ dominantArm, frequency, yearsPlaying, selfAssessment, competes });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = Users.create({
      name,
      email,
      passwordHash,
      role: role ?? "PLAYER",
      city,
      level,
      gender,
      dominantArm,
      frequency,
      yearsPlaying,
      selfAssessment,
      competes,
    });

    const token = signToken(user.id);
    return reply.send({ token, user: publicUser(user) });
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = Users.findByEmail(email);
    if (!user) {
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    const token = signToken(user.id);
    return reply.send({ token, user: publicUser(user) });
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const user = Users.findById(userId);
    if (!user) return reply.status(404).send({ error: "Usuario no encontrado" });
    return reply.send(publicUser(user));
  });
}
