import type {
  AuthResponse,
  Booking,
  Club,
  Court,
  Match,
  Payment,
  Sponsorship,
  Tournament,
  User,
} from "./types";

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
}

/**
 * Cliente HTTP mínimo compartido entre la web (Next.js) y la app móvil (Expo).
 * Evita depender de librerías pesadas para que funcione igual en ambos entornos.
 */
export class ApiClient {
  private baseUrl: string;
  private getToken?: () => string | null | undefined;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getToken = options.getToken;
  }

  private async request<T>(
    path: string,
    method: string = "GET",
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = this.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${method} ${path} -> ${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  }

  // Auth
  register(input: {
    name: string;
    email: string;
    password: string;
    role?: string;
    city?: string;
    dominantArm: "DERECHA" | "IZQUIERDA";
    frequency: "DIARIO" | "VARIAS_VECES_SEMANA" | "SEMANAL" | "QUINCENAL" | "MENSUAL" | "OCASIONAL";
    yearsPlaying: number;
    selfAssessment: 1 | 2 | 3 | 4 | 5;
    competes: boolean;
  }) {
    return this.request<AuthResponse>("/auth/register", "POST", input);
  }

  login(input: { email: string; password: string }) {
    return this.request<AuthResponse>("/auth/login", "POST", input);
  }

  me() {
    return this.request<User>("/auth/me");
  }

  // Clubs & courts
  listClubs(params?: { city?: string }) {
    const qs = params?.city ? `?city=${encodeURIComponent(params.city)}` : "";
    return this.request<Club[]>(`/clubs${qs}`);
  }

  getClub(id: string) {
    return this.request<Club>(`/clubs/${id}`);
  }

  createClub(input: { name: string; description?: string; address: string; city: string }) {
    return this.request<Club>("/clubs", "POST", input);
  }

  updateClubHours(clubId: string, input: { openHour: number; closeHour: number }) {
    return this.request<Club>(`/clubs/${clubId}/hours`, "PATCH", input);
  }

  addCourt(
    clubId: string,
    input: { name: string; type: string; indoor: boolean; lighting: boolean; pricePerHourUsd: number }
  ) {
    return this.request<Court>(`/clubs/${clubId}/courts`, "POST", input);
  }

  updateCourt(
    courtId: string,
    input: Partial<{ name: string; type: string; indoor: boolean; lighting: boolean; pricePerHourUsd: number }>
  ) {
    return this.request<Court>(`/courts/${courtId}`, "PATCH", input);
  }

  listClubBookings(clubId: string) {
    return this.request<Booking[]>(`/clubs/${clubId}/bookings`);
  }

  // Bookings
  listAvailability(courtId: string, date: string) {
    return this.request<Booking[]>(`/courts/${courtId}/availability?date=${date}`);
  }

  createBooking(input: { courtId: string; date: string; startTime: string; endTime: string }) {
    return this.request<Booking>("/bookings", "POST", input);
  }

  // Matches
  listMatches(params?: { city?: string; levelMin?: number; levelMax?: number }) {
    const qs = new URLSearchParams();
    if (params?.city) qs.set("city", params.city);
    if (params?.levelMin) qs.set("levelMin", String(params.levelMin));
    if (params?.levelMax) qs.set("levelMax", String(params.levelMax));
    const s = qs.toString();
    return this.request<Match[]>(`/matches${s ? `?${s}` : ""}`);
  }

  createMatch(input: { bookingId: string; type: string; levelMin: number; levelMax: number }) {
    return this.request<Match>("/matches", "POST", input);
  }

  joinMatch(matchId: string, team: 1 | 2) {
    return this.request<Match>(`/matches/${matchId}/join`, "POST", { team });
  }

  listMyMatches() {
    return this.request<Match[]>("/matches/mine");
  }

  submitMatchResult(matchId: string, winnerTeam: 1 | 2) {
    return this.request<Match>(`/matches/${matchId}/result`, "POST", { winnerTeam });
  }

  // Tournaments
  listTournaments(params?: { city?: string }) {
    const qs = params?.city ? `?city=${encodeURIComponent(params.city)}` : "";
    return this.request<Tournament[]>(`/tournaments${qs}`);
  }

  createTournament(input: {
    name: string;
    description?: string;
    city: string;
    clubId?: string;
    levelMin: number;
    levelMax: number;
    startDate: string;
    endDate?: string;
    maxPlayers: number;
  }) {
    return this.request<Tournament>("/tournaments", "POST", input);
  }

  registerForTournament(tournamentId: string) {
    return this.request<Tournament>(`/tournaments/${tournamentId}/register`, "POST");
  }

  // Payments
  submitPayment(input: {
    amount: number;
    currency: string;
    method: string;
    reference?: string;
    proofUrl?: string;
    purpose: string;
    relatedId?: string;
  }) {
    return this.request<Payment>("/payments", "POST", input);
  }

  listMyPayments() {
    return this.request<Payment[]>("/payments/me");
  }

  // Sponsorships
  listSponsorships() {
    return this.request<Sponsorship[]>("/sponsorships");
  }

  requestSponsorship(input: {
    sponsorName: string;
    planName: string;
    clubId?: string;
    bannerUrl?: string;
    linkUrl?: string;
  }) {
    return this.request<Sponsorship>("/sponsorships", "POST", input);
  }
}
