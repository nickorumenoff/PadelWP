import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface JwtPayload {
  userId: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId } as JwtPayload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Middleware simple: exige un Bearer token válido y adjunta userId a la request.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "No autorizado" });
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) {
    return reply.status(401).send({ error: "Token inválido o expirado" });
  }
  (req as any).userId = payload.userId;
}
