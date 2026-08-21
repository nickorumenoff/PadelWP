import type {
  BookingRow,
  BracketMatchRow,
  ClubRow,
  CourtRow,
  GroupMatchRow,
  MatchPlayerRow,
  MatchRow,
  NotificationRow,
  PaymentRow,
  ReviewRow,
  SponsorshipRow,
  TournamentCategoryRow,
  TournamentGroupRow,
  TournamentPairRow,
  TournamentRow,
  UserRow,
} from "./repositories";
import type { GroupStanding } from "./bracket";

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    level: u.level,
    gender: u.gender,
    dominantArm: u.dominantArm,
    frequency: u.frequency,
    yearsPlaying: u.yearsPlaying,
    selfAssessment: u.selfAssessment,
    competes: u.competes === null ? null : !!u.competes,
    city: u.city,
    photoUrl: u.photoUrl,
    createdAt: u.createdAt,
  };
}

export function publicCourt(c: CourtRow) {
  return {
    id: c.id,
    clubId: c.clubId,
    name: c.name,
    type: c.type,
    indoor: !!c.indoor,
    lighting: !!c.lighting,
    pricePerHourUsd: c.pricePerHourUsd,
  };
}

export function publicClub(
  c: ClubRow,
  courts: CourtRow[] = [],
  ratingSummary: { avgRating: number; reviewCount: number } = { avgRating: 0, reviewCount: 0 }
) {
  return {
    id: c.id,
    ownerId: c.ownerId,
    name: c.name,
    description: c.description,
    address: c.address,
    city: c.city,
    status: c.status,
    visibilityPlan: c.visibilityPlan,
    openHour: c.openHour,
    closeHour: c.closeHour,
    createdAt: c.createdAt,
    courts: courts.map(publicCourt),
    avgRating: ratingSummary.avgRating,
    reviewCount: ratingSummary.reviewCount,
  };
}

export function publicReview(r: ReviewRow & { user?: UserRow }) {
  return {
    id: r.id,
    clubId: r.clubId,
    userId: r.userId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    user: r.user ? publicUser(r.user) : undefined,
  };
}

export function publicNotification(n: NotificationRow) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    message: n.message,
    relatedId: n.relatedId,
    read: !!n.read,
    createdAt: n.createdAt,
  };
}

export function publicBooking(b: BookingRow) {
  return {
    id: b.id,
    courtId: b.courtId,
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    userId: b.userId,
  };
}

export function publicMatch(
  m: MatchRow,
  players: (MatchPlayerRow & { user?: UserRow })[] = [],
  booking?: BookingRow
) {
  return {
    id: m.id,
    bookingId: m.bookingId,
    creatorId: m.creatorId,
    type: m.type,
    levelMin: m.levelMin,
    levelMax: m.levelMax,
    status: m.status,
    winnerTeam: m.winnerTeam,
    completedAt: m.completedAt,
    createdAt: m.createdAt,
    players: players.map((p) => ({
      id: p.id,
      matchId: p.matchId,
      userId: p.userId,
      team: p.team,
      confirmed: !!p.confirmed,
      user: p.user ? publicUser(p.user) : undefined,
    })),
    booking: booking ? publicBooking(booking) : undefined,
  };
}

export function publicPayment(p: PaymentRow) {
  return { ...p };
}

export function publicSponsorship(s: SponsorshipRow) {
  return { ...s };
}

export function publicTournament(
  t: TournamentRow,
  extra: { registeredCount?: number; isRegistered?: boolean } = {}
) {
  return {
    ...t,
    registeredCount: extra.registeredCount ?? 0,
    isRegistered: extra.isRegistered ?? false,
  };
}

export function publicCategory(
  c: TournamentCategoryRow,
  extra: { registeredCount?: number; pairCount?: number; isRegistered?: boolean } = {}
) {
  return {
    ...c,
    registeredCount: extra.registeredCount ?? 0,
    pairCount: extra.pairCount ?? 0,
    isRegistered: extra.isRegistered ?? false,
  };
}

export function publicPair(p: TournamentPairRow, player1?: UserRow, player2?: UserRow) {
  return {
    ...p,
    player1: player1 ? publicUser(player1) : undefined,
    player2: player2 ? publicUser(player2) : undefined,
  };
}

export function publicGroupMatch(m: GroupMatchRow) {
  return { ...m };
}

export function publicBracketMatch(m: BracketMatchRow) {
  return { ...m };
}

export function publicGroup(
  g: TournamentGroupRow,
  pairs: ReturnType<typeof publicPair>[],
  matches: GroupMatchRow[],
  standings: GroupStanding[]
) {
  return {
    ...g,
    pairs,
    matches: matches.map(publicGroupMatch),
    standings,
  };
}
