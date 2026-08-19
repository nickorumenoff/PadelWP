import type {
  BookingRow,
  ClubRow,
  CourtRow,
  MatchPlayerRow,
  MatchRow,
  PaymentRow,
  SponsorshipRow,
  TournamentRow,
  UserRow,
} from "./repositories";

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    level: u.level,
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

export function publicClub(c: ClubRow, courts: CourtRow[] = []) {
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
