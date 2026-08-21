import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consoleEmailSender } from "./notifier";

describe("consoleEmailSender", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("registra el mensaje en consola en vez de fallar (modo registro, sin proveedor de email real)", async () => {
    await expect(
      consoleEmailSender.send({ to: "user@example.com", subject: "Recupera tu contraseña", body: "link aquí" })
    ).resolves.not.toThrow();
    expect(logSpy).toHaveBeenCalled();
  });

  it("incluye el destinatario y el asunto en la salida registrada", async () => {
    await consoleEmailSender.send({ to: "user@example.com", subject: "Recupera tu contraseña", body: "link aquí" });
    const loggedText = logSpy.mock.calls.flat().join(" ");
    expect(loggedText).toContain("user@example.com");
    expect(loggedText).toContain("Recupera tu contraseña");
  });
});
