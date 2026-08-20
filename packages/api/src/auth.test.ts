import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuth, signToken, verifyToken } from "./auth";

describe("signToken / verifyToken", () => {
  it("un token firmado se puede verificar y devuelve el userId original", () => {
    const token = signToken("user_123");
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user_123");
  });

  it("devuelve null para un token inválido o malformado", () => {
    expect(verifyToken("esto-no-es-un-jwt")).toBeNull();
  });

  it("devuelve null para un token firmado con otro secreto", () => {
    // jsonwebtoken firma con JWT_SECRET (o "dev-secret" por defecto); un token con
    // formato válido pero firma distinta debe rechazarse.
    const fakeToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJoYWNrZXIifQ.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(verifyToken(fakeToken)).toBeNull();
  });
});

describe("requireAuth (middleware)", () => {
  function mockReply() {
    const reply: any = {};
    reply.status = vi.fn().mockReturnValue(reply);
    reply.send = vi.fn().mockReturnValue(reply);
    return reply;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 cuando no hay header Authorization", async () => {
    const req: any = { headers: {} };
    const reply = mockReply();
    await requireAuth(req, reply);
    expect(reply.status).toHaveBeenCalledWith(401);
    expect(req.userId).toBeUndefined();
  });

  it("responde 401 cuando el header no empieza con 'Bearer '", async () => {
    const req: any = { headers: { authorization: "Basic abc123" } };
    const reply = mockReply();
    await requireAuth(req, reply);
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it("responde 401 cuando el token es inválido", async () => {
    const req: any = { headers: { authorization: "Bearer not-a-real-token" } };
    const reply = mockReply();
    await requireAuth(req, reply);
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it("adjunta userId a la request y no responde con error cuando el token es válido", async () => {
    const token = signToken("user_456");
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const reply = mockReply();
    await requireAuth(req, reply);
    expect(reply.status).not.toHaveBeenCalled();
    expect(req.userId).toBe("user_456");
  });
});
