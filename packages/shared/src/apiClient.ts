import type {
  AppNotification,
  AuthResponse,
  Booking,
  CategoryDetail,
  Club,
  ClubReport,
  Court,
  Match,
  Payment,
  Review,
  Sponsorship,
  Tournament,
  TournamentCategory,
  TournamentPair,
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
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = this.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${method} ${path} -> ${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  }

  /**
   * Sube un archivo (multipart/form-data). No se fuerza el header Content-Type
   * a propósito: tanto fetch en el navegador como en React Native lo calculan
   * solos a partir del FormData (incluyen el boundary correcto).
   */
  private async requestForm<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    const token = this.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API POST ${path} -> ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  // Auth
  register(input: {
    name: string;
    email: string;
    password: string;
    role?: string;
    city?: string;
    gender?: "MASCULINO" | "FEMENINO";
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

  forgotPassword(email: string) {
    return this.request<{ ok: true }>("/auth/forgot-password", "POST", { email });
  }

  resetPassword(token: string, password: string) {
    return this.request<{ ok: true }>("/auth/reset-password", "POST", { token, password });
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

  getClubReport(clubId: string, days: number = 30) {
    return this.request<ClubReport>(`/clubs/${clubId}/report?days=${days}`);
  }

  // Reseñas
  listClubReviews(clubId: string) {
    return this.request<Review[]>(`/clubs/${clubId}/reviews`);
  }

  createClubReview(clubId: string, input: { rating: 1 | 2 | 3 | 4 | 5; comment?: string }) {
    return this.request<Review>(`/clubs/${clubId}/reviews`, "POST", input);
  }

  // Bookings
  listAvailability(courtId: string, date: string) {
    return this.request<Booking[]>(`/courts/${courtId}/availability?date=${date}`);
  }

  createBooking(input: { courtId: string; date: string; startTime: string; endTime: string }) {
    return this.request<Booking>("/bookings", "POST", input);
  }

  cancelBooking(bookingId: string) {
    return this.request<Booking>(`/bookings/${bookingId}/cancel`, "POST");
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

  cancelMatch(matchId: string) {
    return this.request<Match>(`/matches/${matchId}/cancel`, "POST");
  }

  leaveMatch(matchId: string) {
    return this.request<Match>(`/matches/${matchId}/leave`, "POST");
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

  getTournament(id: string) {
    return this.request<Tournament>(`/tournaments/${id}`);
  }

  registerForTournament(tournamentId: string) {
    return this.request<Tournament>(`/tournaments/${tournamentId}/register`, "POST");
  }

  // Categorías (género + nivel + llave) dentro de un torneo
  listCategories(tournamentId: string) {
    return this.request<TournamentCategory[]>(`/tournaments/${tournamentId}/categories`);
  }

  createCategory(
    tournamentId: string,
    input: { genderCategory: "MASCULINO" | "FEMENINO" | "MIXTO"; level: number; bracketSize: number }
  ) {
    return this.request<TournamentCategory>(`/tournaments/${tournamentId}/categories`, "POST", input);
  }

  getCategoryDetail(categoryId: string) {
    return this.request<CategoryDetail>(`/tournament-categories/${categoryId}`);
  }

  registerForCategory(categoryId: string) {
    return this.request<CategoryDetail>(`/tournament-categories/${categoryId}/register`, "POST");
  }

  createPair(categoryId: string, input: { player1Id: string; player2Id: string }) {
    return this.request<TournamentPair>(`/tournament-categories/${categoryId}/pairs`, "POST", input);
  }

  generateGroups(categoryId: string) {
    return this.request<CategoryDetail>(`/tournament-categories/${categoryId}/generate-groups`, "POST");
  }

  submitGroupMatchResult(matchId: string, input: { winnerPairId: string; setsA?: number; setsB?: number }) {
    return this.request<CategoryDetail>(`/group-matches/${matchId}/result`, "POST", input);
  }

  generateKnockout(categoryId: string) {
    return this.request<CategoryDetail>(`/tournament-categories/${categoryId}/generate-knockout`, "POST");
  }

  submitBracketMatchResult(matchId: string, input: { winnerPairId: string; setsA?: number; setsB?: number }) {
    return this.request<CategoryDetail>(`/bracket-matches/${matchId}/result`, "POST", input);
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

  /**
   * Adjunta el comprobante (imagen o PDF) de un pago ya reportado. `formData`
   * debe traer un único campo de archivo (el nombre del campo no importa,
   * el backend toma el primer archivo que llegue).
   */
  uploadPaymentProof(paymentId: string, formData: FormData) {
    return this.requestForm<Payment>(`/payments/${paymentId}/proof`, formData);
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

  // Notificaciones
  listNotifications() {
    return this.request<AppNotification[]>("/notifications/me");
  }

  markNotificationRead(id: string) {
    return this.request<{ ok: true }>(`/notifications/${id}/read`, "POST");
  }

  markAllNotificationsRead() {
    return this.request<{ ok: true }>("/notifications/read-all", "POST");
  }
}
