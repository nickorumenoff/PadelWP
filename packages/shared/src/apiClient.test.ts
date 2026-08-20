import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./apiClient";

function mockFetchOnce(body: unknown, init?: { status?: number; ok?: boolean }) {
  const status = init?.status ?? 200;
  const ok = init?.ok ?? (status >= 200 && status < 300);
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("ApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("no manda Content-Type ni body en peticiones GET/POST sin cuerpo (regresión FST_ERR_CTP_EMPTY_JSON_BODY)", async () => {
    const fetchMock = mockFetchOnce({ id: "tourney_1" });
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient({ baseUrl: "https://api.test" });
    await client.registerForTournament("tourney_1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.body).toBeUndefined();
    expect(options.headers["Content-Type"]).toBeUndefined();
  });

  it("manda Content-Type: application/json y el body serializado cuando sí hay cuerpo", async () => {
    const fetchMock = mockFetchOnce({ token: "abc", user: { id: "u1" } });
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient({ baseUrl: "https://api.test" });
    await client.login({ email: "a@b.com", password: "secret" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/auth/login");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({ email: "a@b.com", password: "secret" });
  });

  it("agrega el header Authorization cuando getToken devuelve un token", async () => {
    const fetchMock = mockFetchOnce({ id: "u1" });
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient({ baseUrl: "https://api.test", getToken: () => "my-jwt" });
    await client.me();

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer my-jwt");
  });

  it("no agrega Authorization cuando getToken devuelve null/undefined", async () => {
    const fetchMock = mockFetchOnce([]);
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient({ baseUrl: "https://api.test", getToken: () => null });
    await client.listClubs();

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("quita la barra final de baseUrl para no duplicar '//' en las rutas", async () => {
    const fetchMock = mockFetchOnce([]);
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient({ baseUrl: "https://api.test/" });
    await client.listClubs();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/clubs");
  });

  it("lanza un error descriptivo cuando la respuesta no es ok", async () => {
    const fetchMock = mockFetchOnce({ error: "Credenciales inválidas" }, { status: 401, ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient({ baseUrl: "https://api.test" });
    await expect(client.login({ email: "x@y.com", password: "bad" })).rejects.toThrow(
      /API POST \/auth\/login -> 401/
    );
  });

  it("codifica los parámetros de query (ej. ciudad) correctamente", async () => {
    const fetchMock = mockFetchOnce([]);
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient({ baseUrl: "https://api.test" });
    await client.listClubs({ city: "Caracas Este" });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/clubs?city=Caracas%20Este");
  });
});
