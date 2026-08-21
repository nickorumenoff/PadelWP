import type { DominantArm, PlayFrequency } from "./level";

export type Role = "PLAYER" | "CLUB_ADMIN" | "SPONSOR" | "PLATFORM_ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  /**
   * Nivel de juego, escala 1.00 (mejor categoría) a 8.00 (principiante), 2 decimales.
   * Se calcula a partir de la encuesta de perfil (ver computePlayerLevel en ./level).
   */
  level: number;
  gender?: "MASCULINO" | "FEMENINO" | null;
  dominantArm?: DominantArm | null;
  frequency?: PlayFrequency | null;
  yearsPlaying?: number | null;
  selfAssessment?: number | null;
  competes?: boolean | null;
  city?: string | null;
  photoUrl?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type ClubStatus = "PENDING" | "APPROVED" | "REJECTED";
export type VisibilityPlan = "NONE" | "BASIC" | "FEATURED" | "PREMIUM";

export interface Club {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  status: ClubStatus;
  visibilityPlan: VisibilityPlan;
  /** Hora de apertura (0-23) usada para generar los horarios disponibles de todas sus pistas. */
  openHour: number;
  /** Hora de cierre (0-23). */
  closeHour: number;
  createdAt: string;
  courts?: Court[];
  /** Promedio de reseñas (0 si no tiene ninguna todavía). */
  avgRating?: number;
  reviewCount?: number;
}

export interface Review {
  id: string;
  clubId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string | null;
  createdAt: string;
  user?: User;
}

export type NotificationType =
  | "MATCH_JOINED"
  | "MATCH_CANCELLED"
  | "MATCH_LEFT"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_REJECTED"
  | "SPONSORSHIP_ACTIVATED";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType | string;
  message: string;
  relatedId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface ClubReport {
  periodDays: number;
  totalBookings: number;
  estimatedRevenueUsd: number;
  occupancyRate: number;
  byCourt: {
    courtId: string;
    courtName: string;
    bookings: number;
    estimatedRevenueUsd: number;
    occupancyRate: number;
  }[];
}

export type CourtType = "CRISTAL" | "MURO" | "PANORAMICA";

export interface Court {
  id: string;
  clubId: string;
  name: string;
  type: CourtType;
  indoor: boolean;
  /** Si la pista tiene iluminación para jugar de noche. */
  lighting: boolean;
  pricePerHourUsd: number;
}

export type BookingStatus = "AVAILABLE" | "BOOKED" | "BLOCKED" | "CANCELLED";

export interface Booking {
  id: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: BookingStatus;
  userId?: string | null;
}

export type MatchType = "OPEN" | "PRIVATE";
export type MatchStatus = "OPEN" | "FULL" | "COMPLETED" | "CANCELLED";

export interface Match {
  id: string;
  bookingId: string;
  creatorId: string;
  type: MatchType;
  levelMin: number;
  levelMax: number;
  status: MatchStatus;
  /** Equipo ganador (1 o 2) una vez que la partida se marca como completada. */
  winnerTeam?: 1 | 2 | null;
  completedAt?: string | null;
  createdAt: string;
  players?: MatchPlayer[];
  booking?: Booking;
}

export interface MatchPlayer {
  id: string;
  matchId: string;
  userId: string;
  team: 1 | 2;
  confirmed: boolean;
  user?: User;
}

export type PaymentMethod = "PAGO_MOVIL" | "TRANSFERENCIA" | "ZELLE" | "USDT";
export type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type PaymentPurpose = "BOOKING" | "SPONSORSHIP" | "CLUB_PLAN";

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: "VES" | "USD";
  method: PaymentMethod;
  reference?: string | null;
  proofUrl?: string | null;
  status: PaymentStatus;
  purpose: PaymentPurpose;
  relatedId?: string | null;
  createdAt: string;
}

export type SponsorshipStatus = "PENDING" | "ACTIVE" | "EXPIRED";

export interface Sponsorship {
  id: string;
  sponsorName: string;
  planName: string;
  clubId?: string | null;
  requestedBy?: string | null;
  bannerUrl?: string | null;
  linkUrl?: string | null;
  startDate: string;
  endDate: string;
  status: SponsorshipStatus;
  amountPaidUsd: number;
}

export type TournamentStatus = "OPEN" | "CLOSED" | "CANCELLED";

export interface Tournament {
  id: string;
  createdBy: string;
  clubId?: string | null;
  name: string;
  description?: string | null;
  city: string;
  levelMin: number;
  levelMax: number;
  startDate: string;
  endDate?: string | null;
  maxPlayers: number;
  status: TournamentStatus;
  createdAt: string;
  registeredCount?: number;
  isRegistered?: boolean;
}

export type GenderCategory = "MASCULINO" | "FEMENINO" | "MIXTO";
export type CategoryStatus = "REGISTRATION" | "GROUPS" | "KNOCKOUT" | "COMPLETED";

/**
 * Categoría de un torneo: se juega por género y nivel (1-8). `bracketSize`
 * es la cantidad de parejas que llegan a la llave de eliminación directa
 * (numGroups = bracketSize / 2, ya que avanzan los 2 mejores de cada grupo).
 */
export interface TournamentCategory {
  id: string;
  tournamentId: string;
  genderCategory: GenderCategory;
  level: number;
  bracketSize: number;
  status: CategoryStatus;
  createdAt: string;
  registeredCount?: number;
  pairCount?: number;
  isRegistered?: boolean;
}

export interface CategoryRegistration {
  id: string;
  categoryId: string;
  userId: string;
  pairId?: string | null;
  createdAt: string;
  user?: User;
}

export interface TournamentPair {
  id: string;
  categoryId: string;
  player1Id: string;
  player2Id: string;
  groupId?: string | null;
  createdAt: string;
  player1?: User;
  player2?: User;
}

export interface GroupStanding {
  pairId: string;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  setDiff: number;
}

export interface GroupMatch {
  id: string;
  categoryId: string;
  groupId: string;
  pairAId: string;
  pairBId: string;
  setsA?: number | null;
  setsB?: number | null;
  winnerPairId?: string | null;
  status: "PENDING" | "COMPLETED";
  createdAt: string;
  completedAt?: string | null;
}

export interface TournamentGroup {
  id: string;
  categoryId: string;
  groupIndex: number;
  createdAt: string;
  pairs: TournamentPair[];
  matches: GroupMatch[];
  standings: GroupStanding[];
}

export interface BracketMatch {
  id: string;
  categoryId: string;
  round: number;
  slot: number;
  pairAId?: string | null;
  pairBId?: string | null;
  setsA?: number | null;
  setsB?: number | null;
  winnerPairId?: string | null;
  status: "PENDING" | "COMPLETED";
  createdAt: string;
  completedAt?: string | null;
}

export interface CategoryDetail extends TournamentCategory {
  registrations: CategoryRegistration[];
  pairs: TournamentPair[];
  groups: TournamentGroup[];
  bracket: BracketMatch[];
}
