import { ApiClient } from "@padel-ve/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => (typeof window !== "undefined" ? window.localStorage.getItem("padelve_token") : null),
});

export function saveSession(token: string) {
  window.localStorage.setItem("padelve_token", token);
}

export function clearSession() {
  window.localStorage.removeItem("padelve_token");
}
