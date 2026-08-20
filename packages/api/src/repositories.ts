import { insertRow, newId, nowIso, pool, selectMany, selectOne, updateRow } from "./db";

// ---------- Tipos de fila cruda (tal como vienen de Postgres) ----------

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
  competes: boolean | null;
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
  indoor: boolean;
  lighting: boolean;
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
  confirmed: boolean;
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
  async create(input: {
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
  }): Promise<UserRow> {
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
      competes: input.competes === undefined ? null : input.competes,
      city: input.city ?? null,
      photoUrl: null,
      createdAt: nowIso(),
    };
    return insertRow("users", row);
  },
  findByEmail(email: string): Promise<UserRow | undefined> {
    return selectOne<UserRow>("users", { email });
  },
  findById(id: string): Promise<UserRow | undefined> {
    return selectOne<UserRow>("users", { id });
  },
  updateLevel(id: string, level: number): Promise<void> {
    return updateRow("users", "id", id, { level });
  },
};

// ---------- Clubs ----------

export const Clubs = {
  async create(input: { ownerId: string; name: string; description?: string; address: string; city: string }): Promise<ClubRow> {
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
    return insertRow("clubs", row);
  },
  findById(id: string): Promise<ClubRow | undefined> {
    return selectOne<ClubRow>("clubs", { id });
  },
  listApproved(city?: string): Promise<ClubRow[]> {
    return selectMany<ClubRow>("clubs", city ? { status: "APPROVED", city } : { status: "APPROVED" });
  },
  updateVisibilityPlan(id: string, plan: string): Promise<void> {
    return updateRow("clubs", "id", id, { visibilityPlan: plan });
  },
  async updateHours(id: string, openHour: number, closeHour: number): Promise<ClubRow | undefined> {
    await updateRow("clubs", "id", id, { openHour, closeHour });
    return Clubs.findById(id);
  },
};

// ---------- Courts ----------

export const Courts = {
  async create(input: {
    clubId: string;
    name: string;
    type: string;
    indoor: boolean;
    lighting: boolean;
    pricePerHourUsd: number;
  }): Promise<CourtRow> {
    const row: CourtRow = {
      id: newId("court"),
      clubId: input.clubId,
      name: input.name,
      type: input.type,
      indoor: !!input.indoor,
      lighting: !!input.lighting,
      pricePerHourUsd: input.pricePerHourUsd,
    };
    return insertRow("courts", row);
  },
  findById(id: string): Promise<CourtRow | undefined> {
    return selectOne<CourtRow>("courts", { id });
  },
  listByClub(clubId: string): Promise<CourtRow[]> {
    return selectMany<CourtRow>("courts", { clubId });
  },
  async update(
    id: string,
    input: { name?: string; type?: string; indoor?: boolean; lighting?: boolean; pricePerHourUsd?: number }
  ): Promise<CourtRow | undefined> {
    const current = await Courts.findById(id);
    if (!current) return undefined;
    await updateRow("courts", "id", id, {
      name: input.name ?? current.name,
      type: input.type ?? current.type,
      indoor: input.indoor === undefined ? current.indoor : input.indoor,
      lighting: input.lighting === undefined ? current.lighting : input.lighting,
      pricePerHourUsd: input.pricePerHourUsd ?? current.pricePerHourUsd,
    });
    return Courts.findById(id);
  },
};

// ---------- Bookings ----------

export const Bookings = {
  async create(input: { courtId: string; date: string; startTime: string; endTime: string; userId: string }): Promise<BookingRow> {
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
    return insertRow("bookings", row);
  },
  findById(id: string): Promise<BookingRow | undefined> {
    return selectOne<BookingRow>("bookings", { id });
  },
  findByCourtDateStart(courtId: string, date: string, startTime: string): Promise<BookingRow | undefined> {
    return selectOne<BookingRow>("bookings", { courtId, date, startTime });
  },
  listByCourtAndDate(courtId: string, date: string): Promise<BookingRow[]> {
    return selectMany<BookingRow>("bookings", { courtId, date });
  },
  listByUser(userId: string): Promise<BookingRow[]> {
    return selectMany<BookingRow>("bookings", { userId }, `"date" DESC`);
  },
  async listByClub(clubId: string): Promise<BookingRow[]> {
    const res = await pool.query(
      `SELECT b.* FROM bookings b
       JOIN courts c ON c."id" = b."courtId"
       WHERE c."clubId" = $1
       ORDER BY b."date" DESC, b."startTime" ASC`,
      [clubId]
    );
    return res.rows as BookingRow[];
  },
};

// ---------- Matches ----------

export const Matches = {
  async create(input: { bookingId: string; creatorId: string; type: string; levelMin: number; levelMax: number }): Promise<MatchRow> {
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
    return insertRow("matches", row);
  },
  findById(id: string): Promise<MatchRow | undefined> {
    return selectOne<MatchRow>("matches", { id });
  },
  findByBookingId(bookingId: string): Promise<MatchRow | undefined> {
    return selectOne<MatchRow>("matches", { bookingId });
  },
  updateStatus(id: string, status: string): Promise<void> {
    return updateRow("matches", "id", id, { status });
  },
  async setResult(id: string, winnerTeam: 1 | 2): Promise<MatchRow | undefined> {
    await updateRow("matches", "id", id, { status: "COMPLETED", winnerTeam, completedAt: nowIso() });
    return Matches.findById(id);
  },
  async list(filters: { city?: string; levelMin?: number; levelMax?: number }): Promise<MatchRow[]> {
    // Join manual con bookings/courts/clubs para filtrar por ciudad.
    let sql = `
      SELECT m.* FROM matches m
      JOIN bookings b ON b."id" = m."bookingId"
      JOIN courts c ON c."id" = b."courtId"
      JOIN clubs cl ON cl."id" = c."clubId"
      WHERE m."status" IN ('OPEN','FULL')
    `;
    const params: (string | number)[] = [];
    if (filters.city) {
      params.push(filters.city);
      sql += ` AND cl."city" = $${params.length}`;
    }
    if (filters.levelMin !== undefined) {
      params.push(filters.levelMin);
      sql += ` AND m."levelMax" >= $${params.length}`;
    }
    if (filters.levelMax !== undefined) {
      params.push(filters.levelMax);
      sql += ` AND m."levelMin" <= $${params.length}`;
    }
    sql += ` ORDER BY m."createdAt" DESC`;
    const res = await pool.query(sql, params);
    return res.rows as MatchRow[];
  },
  async listForUser(userId: string): Promise<MatchRow[]> {
    const res = await pool.query(
      `SELECT m.* FROM matches m
       JOIN match_players mp ON mp."matchId" = m."id"
       WHERE mp."userId" = $1
       ORDER BY m."createdAt" DESC`,
      [userId]
    );
    return res.rows as MatchRow[];
  },
};

export const MatchPlayers = {
  create(input: { matchId: string; userId: string; team: number }): Promise<MatchPlayerRow> {
    const row: MatchPlayerRow = {
      id: newId("mp"),
      matchId: input.matchId,
      userId: input.userId,
      team: input.team,
      confirmed: true,
    };
    return insertRow("match_players", row);
  },
  listByMatch(matchId: string): Promise<MatchPlayerRow[]> {
    return selectMany<MatchPlayerRow>("match_players", { matchId });
  },
  async isPlayerInMatch(matchId: string, userId: string): Promise<boolean> {
    const row = await selectOne<{ id: string }>("match_players", { matchId, userId });
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
  }): Promise<PaymentRow> {
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
    return insertRow("payments", row);
  },
  listByUser(userId: string): Promise<PaymentRow[]> {
    return selectMany<PaymentRow>("payments", { userId }, `"createdAt" DESC`);
  },
  findById(id: string): Promise<PaymentRow | undefined> {
    return selectOne<PaymentRow>("payments", { id });
  },
  async updateStatus(id: string, status: string): Promise<PaymentRow | undefined> {
    await updateRow("payments", "id", id, { status });
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
  }): Promise<SponsorshipRow> {
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
    return insertRow("sponsorships", row);
  },
  listActive(): Promise<SponsorshipRow[]> {
    return selectMany<SponsorshipRow>("sponsorships", { status: "ACTIVE" }, `"startDate" DESC`);
  },
  findById(id: string): Promise<SponsorshipRow | undefined> {
    return selectOne<SponsorshipRow>("sponsorships", { id });
  },
  async activate(id: string, endDate: string): Promise<SponsorshipRow | undefined> {
    await updateRow("sponsorships", "id", id, { status: "ACTIVE", endDate });
    return Sponsorships.findById(id);
  },
};

// ---------- Tournaments ----------

export const Tournaments = {
  async create(input: {
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
  }): Promise<TournamentRow> {
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
    return insertRow("tournaments", row);
  },
  findById(id: string): Promise<TournamentRow | undefined> {
    return selectOne<TournamentRow>("tournaments", { id });
  },
  list(city?: string): Promise<TournamentRow[]> {
    return selectMany<TournamentRow>("tournaments", city ? { city } : {}, `"startDate" ASC`);
  },
  updateStatus(id: string, status: string): Promise<void> {
    return updateRow("tournaments", "id", id, { status });
  },
};

export const TournamentRegistrations = {
  create(input: { tournamentId: string; userId: string }): Promise<TournamentRegistrationRow> {
    const row: TournamentRegistrationRow = {
      id: newId("treg"),
      tournamentId: input.tournamentId,
      userId: input.userId,
      createdAt: nowIso(),
    };
    return insertRow("tournament_registrations", row);
  },
  listByTournament(tournamentId: string): Promise<TournamentRegistrationRow[]> {
    return selectMany<TournamentRegistrationRow>("tournament_registrations", { tournamentId });
  },
  async isRegistered(tournamentId: string, userId: string): Promise<boolean> {
    const row = await selectOne<{ id: string }>("tournament_registrations", { tournamentId, userId });
    return !!row;
  },
};

// ---------- Categorías de torneo (género + nivel + tamaño de llave) ----------

export const TournamentCategories = {
  create(input: { tournamentId: string; genderCategory: string; level: number; bracketSize: number }): Promise<TournamentCategoryRow> {
    const row: TournamentCategoryRow = {
      id: newId("tcat"),
      tournamentId: input.tournamentId,
      genderCategory: input.genderCategory,
      level: input.level,
      bracketSize: input.bracketSize,
      status: "REGISTRATION",
      createdAt: nowIso(),
    };
    return insertRow("tournament_categories", row);
  },
  findById(id: string): Promise<TournamentCategoryRow | undefined> {
    return selectOne<TournamentCategoryRow>("tournament_categories", { id });
  },
  listByTournament(tournamentId: string): Promise<TournamentCategoryRow[]> {
    return selectMany<TournamentCategoryRow>("tournament_categories", { tournamentId }, `"level" ASC`);
  },
  updateStatus(id: string, status: string): Promise<void> {
    return updateRow("tournament_categories", "id", id, { status });
  },
};

export const CategoryRegistrations = {
  create(input: { categoryId: string; userId: string }): Promise<CategoryRegistrationRow> {
    const row: CategoryRegistrationRow = {
      id: newId("creg"),
      categoryId: input.categoryId,
      userId: input.userId,
      pairId: null,
      createdAt: nowIso(),
    };
    return insertRow("tournament_category_registrations", row);
  },
  listByCategory(categoryId: string): Promise<CategoryRegistrationRow[]> {
    return selectMany<CategoryRegistrationRow>("tournament_category_registrations", { categoryId }, `"createdAt" ASC`);
  },
  async isRegistered(categoryId: string, userId: string): Promise<boolean> {
    const row = await selectOne<{ id: string }>("tournament_category_registrations", { categoryId, userId });
    return !!row;
  },
  setPair(categoryId: string, userId: string, pairId: string): Promise<void> {
    return updateRow2("tournament_category_registrations", { categoryId, userId }, { pairId });
  },
};

export const TournamentPairs = {
  create(input: { categoryId: string; player1Id: string; player2Id: string }): Promise<TournamentPairRow> {
    const row: TournamentPairRow = {
      id: newId("pair"),
      categoryId: input.categoryId,
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      groupId: null,
      createdAt: nowIso(),
    };
    return insertRow("tournament_pairs", row);
  },
  findById(id: string): Promise<TournamentPairRow | undefined> {
    return selectOne<TournamentPairRow>("tournament_pairs", { id });
  },
  listByCategory(categoryId: string): Promise<TournamentPairRow[]> {
    return selectMany<TournamentPairRow>("tournament_pairs", { categoryId });
  },
  setGroup(id: string, groupId: string): Promise<void> {
    return updateRow("tournament_pairs", "id", id, { groupId });
  },
};

export const TournamentGroups = {
  create(input: { categoryId: string; groupIndex: number }): Promise<TournamentGroupRow> {
    const row: TournamentGroupRow = {
      id: newId("grp"),
      categoryId: input.categoryId,
      groupIndex: input.groupIndex,
      createdAt: nowIso(),
    };
    return insertRow("tournament_groups", row);
  },
  listByCategory(categoryId: string): Promise<TournamentGroupRow[]> {
    return selectMany<TournamentGroupRow>("tournament_groups", { categoryId }, `"groupIndex" ASC`);
  },
};

export const GroupMatches = {
  create(input: { categoryId: string; groupId: string; pairAId: string; pairBId: string }): Promise<GroupMatchRow> {
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
    return insertRow("group_matches", row);
  },
  findById(id: string): Promise<GroupMatchRow | undefined> {
    return selectOne<GroupMatchRow>("group_matches", { id });
  },
  listByGroup(groupId: string): Promise<GroupMatchRow[]> {
    return selectMany<GroupMatchRow>("group_matches", { groupId });
  },
  listByCategory(categoryId: string): Promise<GroupMatchRow[]> {
    return selectMany<GroupMatchRow>("group_matches", { categoryId });
  },
  async setResult(id: string, winnerPairId: string, setsA?: number, setsB?: number): Promise<GroupMatchRow | undefined> {
    await updateRow("group_matches", "id", id, {
      status: "COMPLETED",
      winnerPairId,
      setsA: setsA ?? null,
      setsB: setsB ?? null,
      completedAt: nowIso(),
    });
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
  }): Promise<BracketMatchRow> {
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
    return insertRow("bracket_matches", row);
  },
  findById(id: string): Promise<BracketMatchRow | undefined> {
    return selectOne<BracketMatchRow>("bracket_matches", { id });
  },
  findByCategoryRoundSlot(categoryId: string, round: number, slot: number): Promise<BracketMatchRow | undefined> {
    return selectOne<BracketMatchRow>("bracket_matches", { categoryId, round, slot });
  },
  listByCategory(categoryId: string): Promise<BracketMatchRow[]> {
    return selectMany<BracketMatchRow>("bracket_matches", { categoryId }, `"round" ASC, "slot" ASC`);
  },
  setPairSlot(id: string, position: "A" | "B", pairId: string): Promise<void> {
    return updateRow("bracket_matches", "id", id, position === "A" ? { pairAId: pairId } : { pairBId: pairId });
  },
  async setResult(id: string, winnerPairId: string, setsA?: number, setsB?: number): Promise<BracketMatchRow | undefined> {
    await updateRow("bracket_matches", "id", id, {
      status: "COMPLETED",
      winnerPairId,
      setsA: setsA ?? null,
      setsB: setsB ?? null,
      completedAt: nowIso(),
    });
    return BracketMatches.findById(id);
  },
};

// Variante de updateRow con múltiples columnas en el WHERE (usada por
// CategoryRegistrations.setPair, cuya clave lógica es categoryId+userId).
async function updateRow2(table: string, where: Record<string, unknown>, sets: Record<string, unknown>): Promise<void> {
  const setKeys = Object.keys(sets);
  const whereKeys = Object.keys(where);
  const setClause = setKeys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
  const whereClause = whereKeys.map((k, i) => `"${k}" = $${setKeys.length + i + 1}`).join(" AND ");
  const values = [...setKeys.map((k) => sets[k]), ...whereKeys.map((k) => where[k])];
  await pool.query(`UPDATE ${table} SET ${setClause} WHERE ${whereClause}`, values);
}
