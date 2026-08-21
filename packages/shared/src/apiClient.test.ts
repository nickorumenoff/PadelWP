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

  it("uploadPaymentProof manda el FormData directo como body, sin fijar Content-Type (deja que fetch calcule el boundary)", async () => {
    const fetchMock = mockFetchOnce({ id: "pay_1", proofUrl: "/uploads/payments/x.jpg" });
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient({ baseUrl: "https://api.test", getToken: () => "my-jwt" });
    const formData = new FormData();
    formData.append("proof", new Blob(["fake"]), "comprobante.jpg");
    await client.uploadPaymentProof("pay_1", formData);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/payments/pay_1/proof");
    expect(options.method).toBe("POST");
    expect(options.body).toBe(formData);
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.headers.Authorization).toBe("Bearer my-jwt");
  });

  it("uploadPaymentProof lanza un error descriptivo cuando la respuesta no es ok", async () => {
    const fetchMock = mockFetchOnce({ error: "Archivo demasiado grande" }, { status: 400, ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient({ baseUrl: "https://api.test" });
    await expect(client.uploadPaymentProof("pay_1", new FormData())).rejects.toThrow(
      /API POST \/payments\/pay_1\/proof -> 400/
    );
  });

  it("forgotPassword / resetPassword llaman a las rutas y métodos correctos", async () => {
    const fetchMock = mockFetchOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ApiClient({ baseUrl: "https://api.test" });

    await client.forgotPassword("a@b.com");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/auth/forgot-password");

    await client.resetPassword("raw-token", "newpass123");
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe("https://api.test/auth/reset-password");
    expect(JSON.parse(options.body)).toEqual({ token: "raw-token", password: "newpass123" });
  });

  it("cancelBooking, cancelMatch y leaveMatch llaman a las rutas POST correctas", async () => {
    const fetchMock = mockFetchOnce({});
    vi.stubGlobal("fetch", fetchMock);
    const client = new ApiClient({ baseUrl: "https://api.test" });

    await client.cancelBooking("booking_1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/bookings/booking_1/cancel");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");

    await client.cancelMatch("match_1");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.test/matches/match_1/cancel");

    await client.leaveMatch("match_1");
    expect(fetchMock.mock.calls[2][0]).toBe("https://api.test/matches/match_1/leave");
  });

  it("getClubReport usa el parámetro days (con 30 por defecto)", async () => {
    const fetchMock = mockFetchOnce({});
    vi.stubGlobal("fetch", fetchMock);
    const client = new ApiClient({ baseUrl: "https://api.test" });

    await client.getClubReport("club_1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/clubs/club_1/report?days=30");

    await client.getClubReport("club_1", 7);
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.test/clubs/club_1/report?days=7");
  });

  it("listAdSlots y listAllAdSlots llaman a las rutas correctas (pública vs admin)", async () => {
    const fetchMock = mockFetchOnce([]);
    vi.stubGlobal("fetch", fetchMock);
    const client = new ApiClient({ baseUrl: "https://api.test" });

    await client.listAdSlots();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/ad-slots");

    await client.listAllAdSlots();
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.test/ad-slots/admin");
  });

  it("updateAdSlot manda PUT con la posición en la ruta y el body serializado", async () => {
    const fetchMock = mockFetchOnce({ id: "ad_slot_1", position: 2 });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ApiClient({ baseUrl: "https://api.test" });

    await client.updateAdSlot(2, { title: "Nuevo título", active: true });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/ad-slots/2");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ title: "Nuevo título", active: true });
  });

  it("uploadAdSlotImage manda el FormData directo como body a la ruta con la posición", async () => {
    const fetchMock = mockFetchOnce({ id: "ad_slot_1", position: 3, imageUrl: "/uploads/ad-slots/x.png" });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ApiClient({ baseUrl: "https://api.test", getToken: () => "my-jwt" });

    const formData = new FormData();
    formData.append("image", new Blob(["fake"]), "banner.png");
    await client.uploadAdSlotImage(3, formData);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/ad-slots/3/image");
    expect(options.method).toBe("POST");
    expect(options.body).toBe(formData);
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.headers.Authorization).toBe("Bearer my-jwt");
  });
});
