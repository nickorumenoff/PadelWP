import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { computePlayerLevel } from "@padel-ve/shared";
import { PasswordResetTokens, Users } from "../repositories";
import { requireAuth, signToken } from "../auth";
import { publicUser } from "../serializers";
import { emailSender } from "../notifier";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { name, email, password, role, city, gender, dominantArm, frequency, yearsPlaying, selfAssessment, competes } =
      parsed.data;

    const existing = await Users.findByEmail(email);
    if (existing) {
      return reply.status(409).send({ error: "Ya existe una cuenta con ese email" });
    }

    const level = computePlayerLevel({ dominantArm, frequency, yearsPlaying, selfAssessment, competes });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Users.create({
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

    const user = await Users.findByEmail(email);
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
    const user = await Users.findById(userId);
    if (!user) return reply.status(404).send({ error: "Usuario no encontrado" });
    return reply.send(publicUser(user));
  });

  // No revela si el email existe o no (siempre responde igual), para no filtrar
  // qué correos están registrados. Si el usuario existe, genera un token de un
  // solo uso (expira en 1h) y "envía" el link de recuperación (ver notifier.ts:
  // por ahora queda registrado en los logs del servidor, no se envía un correo real).
  app.post("/auth/forgot-password", async (req, reply) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { email } = parsed.data;

    const user = await Users.findByEmail(email);
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
      await PasswordResetTokens.create({ userId: user.id, tokenHash: hashToken(rawToken), expiresAt });

      const webUrl = process.env.WEB_URL || "https://padel-wp-web.vercel.app";
      const resetLink = `${webUrl}/reset-password?token=${rawToken}`;
      await emailSender.send({
        to: user.email,
        subject: "Recupera tu contraseña — Padel WP",
        body: `Hola ${user.name}, entra a este link para elegir una nueva contraseña (válido 1 hora):\n${resetLink}`,
      });
    }

    return reply.send({ ok: true });
  });

  app.post("/auth/reset-password", async (req, reply) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { token, password } = parsed.data;

    const record = await PasswordResetTokens.findByTokenHash(hashToken(token));
    if (!record) return reply.status(400).send({ error: "Link de recuperación inválido" });
    if (record.usedAt) return reply.status(400).send({ error: "Este link ya fue utilizado" });
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return reply.status(400).send({ error: "Este link expiró, solicita uno nuevo" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await Users.updatePassword(record.userId, passwordHash);
    await PasswordResetTokens.markUsed(record.id);

    return reply.send({ ok: true });
  });
}
