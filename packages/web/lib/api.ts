import { ApiClient } from "@padel-ve/shared";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => (typeof window !== "undefined" ? window.localStorage.getItem("padelve_token") : null),
});

/** Convierte una ruta relativa devuelta por la API (ej. /uploads/ad-slots/x.png) en una URL absoluta. */
export function resolveUploadUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export function saveSession(token: string) {
  window.localStorage.setItem("padelve_token", token);
}

export function clearSession() {
  window.localStorage.removeItem("padelve_token");
}
