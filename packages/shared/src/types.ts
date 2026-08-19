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

export type BookingStatus = "AVAILABLE" | "BOOKED" | "BLOCKED";

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
