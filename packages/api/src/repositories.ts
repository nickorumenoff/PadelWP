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
  gender: string | null;
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
  openHour: number;
  closeHour: number;
  createdAt: string;
}

export interface CourtRow {
  id: string;
  clubId: string;
  name: string;
  type: string;
  indoor: number;
  lighting: number;
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
  winnerTeam: number | null;
  completedAt: string | null;
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

export interface TournamentRow {
  id: string;
  createdBy: string;
  clubId: string | null;
  name: string;
  description: string | null;
  city: string;
  levelMin: number;
  levelMax: number;
  startDate: string;
  endDate: string | null;
  maxPlayers: number;
  status: string;
  createdAt: string;
}

export interface TournamentRegistrationRow {
  id: string;
  tournamentId: string;
  userId: string;
  createdAt: string;
}

export interface TournamentCategoryRow {
  id: string;
  tournamentId: string;
  genderCategory: string;
  level: number;
  bracketSize: number;
  status: string;
  createdAt: string;
}

export interface CategoryRegistrationRow {
  id: string;
  categoryId: string;
  userId: string;
  pairId: string | null;
  createdAt: string;
}

export interface TournamentPairRow {
  id: string;
  categoryId: string;
  player1Id: string;
  player2Id: string;
  groupId: string | null;
  createdAt: string;
}

export interface TournamentGroupRow {
  id: string;
  categoryId: string;
  groupIndex: number;
  createdAt: string;
}

export interface GroupMatchRow {
  id: string;
  categoryId: string;
  groupId: string;
  pairAId: string;
  pairBId: string;
  setsA: number | null;
  setsB: number | null;
  winnerPairId: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export interface BracketMatchRow {
  id: string;
  categoryId: string;
  round: number;
  slot: number;
  pairAId: string | null;
  pairBId: string | null;
  setsA: number | null;
  setsB: number | null;
  winnerPairId: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
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
    gender?: string;
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
      gender: input.gender ?? null,
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
      `INSERT INTO users (id,name,email,passwordHash,phone,role,level,gender,dominantArm,frequency,yearsPlaying,selfAssessment,competes,city,photoUrl,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.name,
      row.email,
      row.passwordHash,
      row.phone,
      row.role,
      row.level,
      row.gender,
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
  updateLevel(id: string, level: number) {
    db.prepare(`UPDATE users SET level = ? WHERE id = ?`).run(level, id);
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
      openHour: 8,
      closeHour: 22,
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO clubs (id,ownerId,name,description,address,city,status,visibilityPlan,openHour,closeHour,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.ownerId,
      row.name,
      row.description,
      row.address,
      row.city,
      row.status,
      row.visibilityPlan,
      row.openHour,
      row.closeHour,
      row.createdAt
    );
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
  updateHours(id: string, openHour: number, closeHour: number): ClubRow | undefined {
    db.prepare(`UPDATE clubs SET openHour = ?, closeHour = ? WHERE id = ?`).run(openHour, closeHour, id);
    return Clubs.findById(id);
  },
};

// ---------- Courts ----------

export const Courts = {
  create(input: {
    clubId: string;
    name: string;
    type: string;
    indoor: boolean;
    lighting: boolean;
    pricePerHourUsd: number;
  }): CourtRow {
    const row: CourtRow = {
      id: newId("court"),
      clubId: input.clubId,
      name: input.name,
      type: input.type,
      indoor: input.indoor ? 1 : 0,
      lighting: input.lighting ? 1 : 0,
      pricePerHourUsd: input.pricePerHourUsd,
    };
    db.prepare(`INSERT INTO courts (id,clubId,name,type,indoor,lighting,pricePerHourUsd) VALUES (?,?,?,?,?,?,?)`).run(
      row.id,
      row.clubId,
      row.name,
      row.type,
      row.indoor,
      row.lighting,
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
  update(
    id: string,
    input: { name?: string; type?: string; indoor?: boolean; lighting?: boolean; pricePerHourUsd?: number }
  ): CourtRow | undefined {
    const current = Courts.findById(id);
    if (!current) return undefined;
    const next = {
      name: input.name ?? current.name,
      type: input.type ?? current.type,
      indoor: input.indoor === undefined ? current.indoor : input.indoor ? 1 : 0,
      lighting: input.lighting === undefined ? current.lighting : input.lighting ? 1 : 0,
      pricePerHourUsd: input.pricePerHourUsd ?? current.pricePerHourUsd,
    };
    db.prepare(`UPDATE courts SET name = ?, type = ?, indoor = ?, lighting = ?, pricePerHourUsd = ? WHERE id = ?`).run(
      next.name,
      next.type,
      next.indoor,
      next.lighting,
      next.pricePerHourUsd,
      id
    );
    return Courts.findById(id);
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
  listByClub(clubId: string): BookingRow[] {
    return db
      .prepare(
        `SELECT b.* FROM bookings b
         JOIN courts c ON c.id = b.courtId
         WHERE c.clubId = ?
         ORDER BY b.date DESC, b.startTime ASC`
      )
      .all(clubId) as unknown as BookingRow[];
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
      winnerTeam: null,
      completedAt: null,
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO matches (id,bookingId,creatorId,type,levelMin,levelMax,status,winnerTeam,completedAt,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.bookingId,
      row.creatorId,
      row.type,
      row.levelMin,
      row.levelMax,
      row.status,
      row.winnerTeam,
      row.completedAt,
      row.createdAt
    );
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
  setResult(id: string, winnerTeam: 1 | 2): MatchRow | undefined {
    db.prepare(`UPDATE matches SET status = 'COMPLETED', winnerTeam = ?, completedAt = ? WHERE id = ?`).run(
      winnerTeam,
      nowIso(),
      id
    );
    return Matches.findById(id);
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
  listForUser(userId: string): MatchRow[] {
    return db
      .prepare(
        `SELECT m.* FROM matches m
         JOIN match_players mp ON mp.matchId = m.id
         WHERE mp.userId = ?
         ORDER BY m.createdAt DESC`
      )
      .all(userId) as unknown as MatchRow[];
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

// ---------- Tournaments ----------

export const Tournaments = {
  create(input: {
    createdBy: string;
    clubId?: string;
    name: string;
    description?: string;
    city: string;
    levelMin: number;
    levelMax: number;
    startDate: string;
    endDate?: string;
    maxPlayers: number;
  }): TournamentRow {
    const row: TournamentRow = {
      id: newId("tourney"),
      createdBy: input.createdBy,
      clubId: input.clubId ?? null,
      name: input.name,
      description: input.description ?? null,
      city: input.city,
      levelMin: input.levelMin,
      levelMax: input.levelMax,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      maxPlayers: input.maxPlayers,
      status: "OPEN",
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO tournaments (id,createdBy,clubId,name,description,city,levelMin,levelMax,startDate,endDate,maxPlayers,status,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.createdBy,
      row.clubId,
      row.name,
      row.description,
      row.city,
      row.levelMin,
      row.levelMax,
      row.startDate,
      row.endDate,
      row.maxPlayers,
      row.status,
      row.createdAt
    );
    return row;
  },
  findById(id: string): TournamentRow | undefined {
    return db.prepare(`SELECT * FROM tournaments WHERE id = ?`).get(id) as TournamentRow | undefined;
  },
  list(city?: string): TournamentRow[] {
    if (city) {
      return db
        .prepare(`SELECT * FROM tournaments WHERE city = ? ORDER BY startDate ASC`)
        .all(city) as unknown as TournamentRow[];
    }
    return db.prepare(`SELECT * FROM tournaments ORDER BY startDate ASC`).all() as unknown as TournamentRow[];
  },
  updateStatus(id: string, status: string) {
    db.prepare(`UPDATE tournaments SET status = ? WHERE id = ?`).run(status, id);
  },
};

export const TournamentRegistrations = {
  create(input: { tournamentId: string; userId: string }): TournamentRegistrationRow {
    const row: TournamentRegistrationRow = {
      id: newId("treg"),
      tournamentId: input.tournamentId,
      userId: input.userId,
      createdAt: nowIso(),
    };
    db.prepare(`INSERT INTO tournament_registrations (id,tournamentId,userId,createdAt) VALUES (?,?,?,?)`).run(
      row.id,
      row.tournamentId,
      row.userId,
      row.createdAt
    );
    return row;
  },
  listByTournament(tournamentId: string): TournamentRegistrationRow[] {
    return db
      .prepare(`SELECT * FROM tournament_registrations WHERE tournamentId = ?`)
      .all(tournamentId) as unknown as TournamentRegistrationRow[];
  },
  isRegistered(tournamentId: string, userId: string): boolean {
    const row = db
      .prepare(`SELECT id FROM tournament_registrations WHERE tournamentId = ? AND userId = ?`)
      .get(tournamentId, userId);
    return !!row;
  },
};

// ---------- Categorías de torneo (género + nivel + tamaño de llave) ----------

export const TournamentCategories = {
  create(input: { tournamentId: string; genderCategory: string; level: number; bracketSize: number }): TournamentCategoryRow {
    const row: TournamentCategoryRow = {
      id: newId("tcat"),
      tournamentId: input.tournamentId,
      genderCategory: input.genderCategory,
      level: input.level,
      bracketSize: input.bracketSize,
      status: "REGISTRATION",
      createdAt: nowIso(),
    };
    db.prepare(
      `INSERT INTO tournament_categories (id,tournamentId,genderCategory,level,bracketSize,status,createdAt) VALUES (?,?,?,?,?,?,?)`
    ).run(row.id, row.tournamentId, row.genderCategory, row.level, row.bracketSize, row.status, row.createdAt);
    return row;
  },
  findById(id: string): TournamentCategoryRow | undefined {
    return db.prepare(`SELECT * FROM tournament_categories WHERE id = ?`).get(id) as TournamentCategoryRow | undefined;
  },
  listByTournament(tournamentId: string): TournamentCategoryRow[] {
    return db
      .prepare(`SELECT * FROM tournament_categories WHERE tournamentId = ? ORDER BY level ASC`)
      .all(tournamentId) as unknown as TournamentCategoryRow[];
  },
  updateStatus(id: string, status: string) {
    db.prepare(`UPDATE tournament_categories SET status = ? WHERE id = ?`).run(status, id);
  },
};

export const CategoryRegistrations = {
  create(input: { categoryId: string; userId: string }): CategoryRegistrationRow {
    const row: CategoryRegistrationRow = {
      id: newId("creg"),
      categoryId: input.categoryId,
      userId: input.userId,
      pairId: null,
      createdAt: nowIso(),
    };
    db.prepare(`INSERT INTO tournament_category_registrations (id,categoryId,userId,pairId,createdAt) VALUES (?,?,?,?,?)`).run(
      row.id,
      row.categoryId,
      row.userId,
      row.pairId,
      row.createdAt
    );
    return row;
  },
  listByCategory(categoryId: string): CategoryRegistrationRow[] {
    return db
      .prepare(`SELECT * FROM tournament_category_registrations WHERE categoryId = ? ORDER BY createdAt ASC`)
      .all(categoryId) as unknown as CategoryRegistrationRow[];
  },
  isRegistered(categoryId: string, userId: string): boolean {
    const row = db
      .prepare(`SELECT id FROM tournament_category_registrations WHERE categoryId = ? AND userId = ?`)
      .get(categoryId, userId);
    return !!row;
  },
  setPair(categoryId: string, userId: string, pairId: string) {
    db.prepare(`UPDATE tournament_category_registrations SET pairId = ? WHERE categoryId = ? AND userId = ?`).run(
      pairId,
      categoryId,
      userId
    );
  },
};

export const TournamentPairs = {
  create(input: { categoryId: string; player1Id: string; player2Id: string }): TournamentPairRow {
    const row: TournamentPairRow = {
      id: newId("pair"),
      categoryId: input.categoryId,
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      groupId: null,
      createdAt: nowIso(),
    };
    db.prepare(`INSERT INTO tournament_pairs (id,categoryId,player1Id,player2Id,groupId,createdAt) VALUES (?,?,?,?,?,?)`).run(
      row.id,
      row.categoryId,
      row.player1Id,
      row.player2Id,
      row.groupId,
      row.createdAt
    );
    return row;
  },
  findById(id: string): TournamentPairRow | undefined {
    return db.prepare(`SELECT * FROM tournament_pairs WHERE id = ?`).get(id) as TournamentPairRow | undefined;
  },
  listByCategory(categoryId: string): TournamentPairRow[] {
    return db.prepare(`SELECT * FROM tournament_pairs WHERE categoryId = ?`).all(categoryId) as unknown as TournamentPairRow[];
  },
  setGroup(id: string, groupId: string) {
    db.prepare(`UPDATE tournament_pairs SET groupId = ? WHERE id = ?`).run(groupId, id);
  },
};

export const TournamentGroups = {
  create(input: { categoryId: string; groupIndex: number }): TournamentGroupRow {
    const row: TournamentGroupRow = {
      id: newId("grp"),
      categoryId: input.categoryId,
      groupIndex: input.groupIndex,
      createdAt: nowIso(),
    };
    db.prepare(`INSERT INTO tournament_groups (id,categoryId,groupIndex,createdAt) VALUES (?,?,?,?)`).run(
      row.id,
      row.categoryId,
      row.groupIndex,
      row.createdAt
    );
    return row;
  },
  listByCategory(categoryId: string): TournamentGroupRow[] {
    return db
      .prepare(`SELECT * FROM tournament_groups WHERE categoryId = ? ORDER BY groupIndex ASC`)
      .all(categoryId) as unknown as TournamentGroupRow[];
  },
};

export const GroupMatches = {
  create(input: { categoryId: string; groupId: string; pairAId: string; pairBId: string }): GroupMatchRow {
    const row: GroupMatchRow = {
      id: newId("gmatch"),
      categoryId: input.categoryId,
      groupId: input.groupId,
      pairAId: input.pairAId,
      pairBId: input.pairBId,
      setsA: null,
      setsB: null,
      winnerPairId: null,
      status: "PENDING",
      createdAt: nowIso(),
      completedAt: null,
    };
    db.prepare(
      `INSERT INTO group_matches (id,categoryId,groupId,pairAId,pairBId,setsA,setsB,winnerPairId,status,createdAt,completedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.categoryId,
      row.groupId,
      row.pairAId,
      row.pairBId,
      row.setsA,
      row.setsB,
      row.winnerPairId,
      row.status,
      row.createdAt,
      row.completedAt
    );
    return row;
  },
  findById(id: string): GroupMatchRow | undefined {
    return db.prepare(`SELECT * FROM group_matches WHERE id = ?`).get(id) as GroupMatchRow | undefined;
  },
  listByGroup(groupId: string): GroupMatchRow[] {
    return db.prepare(`SELECT * FROM group_matches WHERE groupId = ?`).all(groupId) as unknown as GroupMatchRow[];
  },
  listByCategory(categoryId: string): GroupMatchRow[] {
    return db.prepare(`SELECT * FROM group_matches WHERE categoryId = ?`).all(categoryId) as unknown as GroupMatchRow[];
  },
  setResult(id: string, winnerPairId: string, setsA?: number, setsB?: number): GroupMatchRow | undefined {
    db.prepare(
      `UPDATE group_matches SET status = 'COMPLETED', winnerPairId = ?, setsA = ?, setsB = ?, completedAt = ? WHERE id = ?`
    ).run(winnerPairId, setsA ?? null, setsB ?? null, nowIso(), id);
    return GroupMatches.findById(id);
  },
};

export const BracketMatches = {
  create(input: {
    categoryId: string;
    round: number;
    slot: number;
    pairAId?: string | null;
    pairBId?: string | null;
  }): BracketMatchRow {
    const row: BracketMatchRow = {
      id: newId("bmatch"),
      categoryId: input.categoryId,
      round: input.round,
      slot: input.slot,
      pairAId: input.pairAId ?? null,
      pairBId: input.pairBId ?? null,
      setsA: null,
      setsB: null,
      winnerPairId: null,
      status: "PENDING",
      createdAt: nowIso(),
      completedAt: null,
    };
    db.prepare(
      `INSERT INTO bracket_matches (id,categoryId,round,slot,pairAId,pairBId,setsA,setsB,winnerPairId,status,createdAt,completedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.categoryId,
      row.round,
      row.slot,
      row.pairAId,
      row.pairBId,
      row.setsA,
      row.setsB,
      row.winnerPairId,
      row.status,
      row.createdAt,
      row.completedAt
    );
    return row;
  },
  findById(id: string): BracketMatchRow | undefined {
    return db.prepare(`SELECT * FROM bracket_matches WHERE id = ?`).get(id) as BracketMatchRow | undefined;
  },
  findByCategoryRoundSlot(categoryId: string, round: number, slot: number): BracketMatchRow | undefined {
    return db
      .prepare(`SELECT * FROM bracket_matches WHERE categoryId = ? AND round = ? AND slot = ?`)
      .get(categoryId, round, slot) as BracketMatchRow | undefined;
  },
  listByCategory(categoryId: string): BracketMatchRow[] {
    return db
      .prepare(`SELECT * FROM bracket_matches WHERE categoryId = ? ORDER BY round ASC, slot ASC`)
      .all(categoryId) as unknown as BracketMatchRow[];
  },
  setPairSlot(id: string, position: "A" | "B", pairId: string) {
    if (position === "A") db.prepare(`UPDATE bracket_matches SET pairAId = ? WHERE id = ?`).run(pairId, id);
    else db.prepare(`UPDATE bracket_matches SET pairBId = ? WHERE id = ?`).run(pairId, id);
  },
  setResult(id: string, winnerPairId: string, setsA?: number, setsB?: number): BracketMatchRow | undefined {
    db.prepare(
      `UPDATE bracket_matches SET status = 'COMPLETED', winnerPairId = ?, setsA = ?, setsB = ?, completedAt = ? WHERE id = ?`
    ).run(winnerPairId, setsA ?? null, setsB ?? null, nowIso(), id);
    return BracketMatches.findById(id);
  },
};
