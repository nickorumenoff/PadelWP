import { db, newId, nowIso } from "./db";

// ---------- Tipos de fila cruda (tal como vienen de SQLite) ----------

export interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  role: string;
  level: number;
  dominantArm: string | null;
  frequency: string | null;
  yearsPlaying: number | null;
  selfAssessment: number | null;
  competes: number | null;
  city: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface ClubRow {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  status: string;
  visibilityPlan: string;
  createdAt: string;
}

export interface CourtRow {
  id: string;
  clubId: string;
  name: string;
  type: string;
  indoor: number;
  pricePerHourUsd: number;
}

export interface BookingRow {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  userId: string | null;
  createdAt: string;
}

export interface MatchRow {
  id: string;
  bookingId: string;
  creatorId: string;
  type: string;
  levelMin: number;
  levelMax: number;
  status: string;
  createdAt: string;
}

export interface MatchPlayerRow {
  id: string;
  matchId: string;
  userId: string;
  team: number;
  confirmed: number;
}

export interface PaymentRow {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  proofUrl: string | null;
  status: string;
  purpose: string;
  relatedId: string | null;
  createdAt: string;
}

export interface SponsorshipRow {
  id: string;
  sponsorName: string;
  planName: string;
  clubId: string | null;
  bannerUrl: string | null;
  linkUrl: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  amountPaidUsd: number;
}

// ---------- Users ----------

export const Users = {
  create(input: {
    name: string;
    email: string;
    passwordHash: string;
    role: string;
    city?: string;
    level?: number;
    dominantArm?: string;
    frequency?: string;
    yearsPlaying?: number;
    selfAssessment?: number;
    competes?: boolean;
  }): UserRow {
    const row: UserRow = {
      id: newId("user"),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      phone: null,
      role: input.role,
      level: input.level ?? 8.0,
      dominantArm: input.dominantArm ?? null,
      frequency: input.frequency ?? null,
      yearsPlaying: input.yearsPlaying ?? null,
      selfAssessment: input.selfAssessment ?? null,
      competes: input.competes === undefined ? null : input.competes ? 1 : 0,
      city: input.city ?? null,
      photoUrl: null,
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO users (id,name,email,passwordHash,phone,role,level,dominantArm,frequency,yearsPlaying,selfAssessment,competes,city,photoUrl,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.name,
      row.email,
      row.passwordHash,
      row.phone,
      row.role,
      row.level,
      row.dominantArm,
      row.frequency,
      row.yearsPlaying,
      row.selfAssessment,
      row.competes,
      row.city,
      row.photoUrl,
      row.createdAt
    );
    return row;
  },
  findByEmail(email: string): UserRow | undefined {
    return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as UserRow | undefined;
  },
  findById(id: string): UserRow | undefined {
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
  },
};

// ---------- Clubs ----------

export const Clubs = {
  create(input: { ownerId: string; name: string; description?: string; address: string; city: string }): ClubRow {
    const row: ClubRow = {
      id: newId("club"),
      ownerId: input.ownerId,
      name: input.name,
      description: input.description ?? null,
      address: input.address,
      city: input.city,
      status: "APPROVED",
      visibilityPlan: "NONE",
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO clubs (id,ownerId,name,description,address,city,status,visibilityPlan,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(row.id, row.ownerId, row.name, row.description, row.address, row.city, row.status, row.visibilityPlan, row.createdAt);
    return row;
  },
  findById(id: string): ClubRow | undefined {
    return db.prepare(`SELECT * FROM clubs WHERE id = ?`).get(id) as ClubRow | undefined;
  },
  listApproved(city?: string): ClubRow[] {
    if (city) {
      return db.prepare(`SELECT * FROM clubs WHERE status = 'APPROVED' AND city = ?`).all(city) as unknown as ClubRow[];
    }
    return db.prepare(`SELECT * FROM clubs WHERE status = 'APPROVED'`).all() as unknown as ClubRow[];
  },
  updateVisibilityPlan(id: string, plan: string) {
    db.prepare(`UPDATE clubs SET visibilityPlan = ? WHERE id = ?`).run(plan, id);
  },
};

// ---------- Courts ----------

export const Courts = {
  create(input: { clubId: string; name: string; type: string; indoor: boolean; pricePerHourUsd: number }): CourtRow {
    const row: CourtRow = {
      id: newId("court"),
      clubId: input.clubId,
      name: input.name,
      type: input.type,
      indoor: input.indoor ? 1 : 0,
      pricePerHourUsd: input.pricePerHourUsd,
    };
    db.prepare(`INSERT INTO courts (id,clubId,name,type,indoor,pricePerHourUsd) VALUES (?,?,?,?,?,?)`).run(
      row.id,
      row.clubId,
      row.name,
      row.type,
      row.indoor,
      row.pricePerHourUsd
    );
    return row;
  },
  findById(id: string): CourtRow | undefined {
    return db.prepare(`SELECT * FROM courts WHERE id = ?`).get(id) as CourtRow | undefined;
  },
  listByClub(clubId: string): CourtRow[] {
    return db.prepare(`SELECT * FROM courts WHERE clubId = ?`).all(clubId) as unknown as CourtRow[];
  },
};

// ---------- Bookings ----------

export const Bookings = {
  create(input: { courtId: string; date: string; startTime: string; endTime: string; userId: string }): BookingRow {
    const row: BookingRow = {
      id: newId("booking"),
      courtId: input.courtId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      status: "BOOKED",
      userId: input.userId,
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO bookings (id,courtId,date,startTime,endTime,status,userId,createdAt) VALUES (?,?,?,?,?,?,?,?)`
    ).run(row.id, row.courtId, row.date, row.startTime, row.endTime, row.status, row.userId, row.createdAt);
    return row;
  },
  findById(id: string): BookingRow | undefined {
    return db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id) as BookingRow | undefined;
  },
  findByCourtDateStart(courtId: string, date: string, startTime: string): BookingRow | undefined {
    return db
      .prepare(`SELECT * FROM bookings WHERE courtId = ? AND date = ? AND startTime = ?`)
      .get(courtId, date, startTime) as BookingRow | undefined;
  },
  listByCourtAndDate(courtId: string, date: string): BookingRow[] {
    return db.prepare(`SELECT * FROM bookings WHERE courtId = ? AND date = ?`).all(courtId, date) as unknown as BookingRow[];
  },
  listByUser(userId: string): BookingRow[] {
    return db.prepare(`SELECT * FROM bookings WHERE userId = ? ORDER BY date DESC`).all(userId) as unknown as BookingRow[];
  },
};

// ---------- Matches ----------

export const Matches = {
  create(input: { bookingId: string; creatorId: string; type: string; levelMin: number; levelMax: number }): MatchRow {
    const row: MatchRow = {
      id: newId("match"),
      bookingId: input.bookingId,
      creatorId: input.creatorId,
      type: input.type,
      levelMin: input.levelMin,
      levelMax: input.levelMax,
      status: "OPEN",
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO matches (id,bookingId,creatorId,type,levelMin,levelMax,status,createdAt) VALUES (?,?,?,?,?,?,?,?)`
    ).run(row.id, row.bookingId, row.creatorId, row.type, row.levelMin, row.levelMax, row.status, row.createdAt);
    return row;
  },
  findById(id: string): MatchRow | undefined {
    return db.prepare(`SELECT * FROM matches WHERE id = ?`).get(id) as MatchRow | undefined;
  },
  findByBookingId(bookingId: string): MatchRow | undefined {
    return db.prepare(`SELECT * FROM matches WHERE bookingId = ?`).get(bookingId) as MatchRow | undefined;
  },
  updateStatus(id: string, status: string) {
    db.prepare(`UPDATE matches SET status = ? WHERE id = ?`).run(status, id);
  },
  list(filters: { city?: string; levelMin?: number; levelMax?: number }): MatchRow[] {
    // Join manual con bookings/courts/clubs para filtrar por ciudad.
    let sql = `
      SELECT m.* FROM matches m
      JOIN bookings b ON b.id = m.bookingId
      JOIN courts c ON c.id = b.courtId
      JOIN clubs cl ON cl.id = c.clubId
      WHERE m.status IN ('OPEN','FULL')
    `;
    const params: (string | number)[] = [];
    if (filters.city) {
      sql += ` AND cl.city = ?`;
      params.push(filters.city);
    }
    if (filters.levelMin !== undefined) {
      sql += ` AND m.levelMax >= ?`;
      params.push(filters.levelMin);
    }
    if (filters.levelMax !== undefined) {
      sql += ` AND m.levelMin <= ?`;
      params.push(filters.levelMax);
    }
    sql += ` ORDER BY m.createdAt DESC`;
    return db.prepare(sql).all(...params) as unknown as MatchRow[];
  },
};

export const MatchPlayers = {
  create(input: { matchId: string; userId: string; team: number }): MatchPlayerRow {
    const row: MatchPlayerRow = {
      id: newId("mp"),
      matchId: input.matchId,
      userId: input.userId,
      team: input.team,
      confirmed: 1,
    };
    db.prepare(`INSERT INTO match_players (id,matchId,userId,team,confirmed) VALUES (?,?,?,?,?)`).run(
      row.id,
      row.matchId,
      row.userId,
      row.team,
      row.confirmed
    );
    return row;
  },
  listByMatch(matchId: string): MatchPlayerRow[] {
    return db.prepare(`SELECT * FROM match_players WHERE matchId = ?`).all(matchId) as unknown as MatchPlayerRow[];
  },
  isPlayerInMatch(matchId: string, userId: string): boolean {
    const row = db
      .prepare(`SELECT id FROM match_players WHERE matchId = ? AND userId = ?`)
      .get(matchId, userId);
    return !!row;
  },
};

// ---------- Payments ----------

export const Payments = {
  create(input: {
    userId: string;
    amount: number;
    currency: string;
    method: string;
    reference?: string;
    proofUrl?: string;
    purpose: string;
    relatedId?: string;
  }): PaymentRow {
    const row: PaymentRow = {
      id: newId("pay"),
      userId: input.userId,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      reference: input.reference ?? null,
      proofUrl: input.proofUrl ?? null,
      status: "PENDING",
      purpose: input.purpose,
      relatedId: input.relatedId ?? null,
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO payments (id,userId,amount,currency,method,reference,proofUrl,status,purpose,relatedId,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.userId,
      row.amount,
      row.currency,
      row.method,
      row.reference,
      row.proofUrl,
      row.status,
      row.purpose,
      row.relatedId,
      row.createdAt
    );
    return row;
  },
  listByUser(userId: string): PaymentRow[] {
    return db.prepare(`SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC`).all(userId) as unknown as PaymentRow[];
  },
  findById(id: string): PaymentRow | undefined {
    return db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id) as PaymentRow | undefined;
  },
  updateStatus(id: string, status: string): PaymentRow | undefined {
    db.prepare(`UPDATE payments SET status = ? WHERE id = ?`).run(status, id);
    return Payments.findById(id);
  },
};

// ---------- Sponsorships ----------

export const Sponsorships = {
  create(input: {
    sponsorName: string;
    planName: string;
    clubId?: string;
    bannerUrl?: string;
    linkUrl?: string;
  }): SponsorshipRow {
    const row: SponsorshipRow = {
      id: newId("sponsor"),
      sponsorName: input.sponsorName,
      planName: input.planName,
      clubId: input.clubId ?? null,
      bannerUrl: input.bannerUrl ?? null,
      linkUrl: input.linkUrl ?? null,
      startDate: nowIso(),
      endDate: null,
      status: "PENDING",
      amountPaidUsd: 0,
    };
    db.prepare(
      `INSERT INTO sponsorships (id,sponsorName,planName,clubId,bannerUrl,linkUrl,startDate,endDate,status,amountPaidUsd)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.sponsorName,
      row.planName,
      row.clubId,
      row.bannerUrl,
      row.linkUrl,
      row.startDate,
      row.endDate,
      row.status,
      row.amountPaidUsd
    );
    return row;
  },
  listActive(): SponsorshipRow[] {
    return db.prepare(`SELECT * FROM sponsorships WHERE status = 'ACTIVE' ORDER BY startDate DESC`).all() as unknown as SponsorshipRow[];
  },
  findById(id: string): SponsorshipRow | undefined {
    return db.prepare(`SELECT * FROM sponsorships WHERE id = ?`).get(id) as SponsorshipRow | undefined;
  },
  activate(id: string, endDate: string): SponsorshipRow | undefined {
    db.prepare(`UPDATE sponsorships SET status = 'ACTIVE', endDate = ? WHERE id = ?`).run(endDate, id);
    return Sponsorships.findById(id);
  },
};
