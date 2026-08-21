import { describe, expect, it } from "vitest";
import {
  publicAdSlot,
  publicBooking,
  publicClub,
  publicCourt,
  publicMatch,
  publicNotification,
  publicReview,
  publicUser,
} from "./serializers";
import type {
  AdSlotRow,
  BookingRow,
  ClubRow,
  CourtRow,
  MatchPlayerRow,
  MatchRow,
  NotificationRow,
  ReviewRow,
  UserRow,
} from "./repositories";

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "user_1",
    name: "Jugador Test",
    email: "test@example.com",
    passwordHash: "$2a$10$superSecretHashThatShouldNeverLeak",
    phone: null,
    role: "PLAYER",
    level: 4.5,
    gender: "MASCULINO",
    dominantArm: "DERECHA",
    frequency: "SEMANAL",
    yearsPlaying: 3,
    selfAssessment: 3,
    competes: true,
    city: "Caracas",
    photoUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("publicUser", () => {
  it("nunca incluye passwordHash en la respuesta (regresión de seguridad)", () => {
    const result = publicUser(makeUser());
    expect(result).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(result)).not.toContain("superSecretHash");
  });

  it("expone los campos públicos esperados", () => {
    const result = publicUser(makeUser());
    expect(result).toMatchObject({
      id: "user_1",
      name: "Jugador Test",
      email: "test@example.com",
      role: "PLAYER",
      level: 4.5,
      city: "Caracas",
    });
  });

  it("convierte competes a booleano explícito, preservando null cuando no se completó la encuesta", () => {
    expect(publicUser(makeUser({ competes: true })).competes).toBe(true);
    expect(publicUser(makeUser({ competes: false })).competes).toBe(false);
    expect(publicUser(makeUser({ competes: null })).competes).toBeNull();
  });
});

describe("publicCourt", () => {
  it("convierte indoor/lighting a booleanos", () => {
    const court: CourtRow = {
      id: "court_1",
      clubId: "club_1",
      name: "Pista 1",
      type: "CRISTAL",
      indoor: true,
      lighting: false,
      pricePerHourUsd: 25,
    };
    const result = publicCourt(court);
    expect(result.indoor).toBe(true);
    expect(result.lighting).toBe(false);
  });
});

describe("publicMatch", () => {
  it("serializa jugadores anidando publicUser (sin passwordHash) y booking cuando existen", () => {
    const match: MatchRow = {
      id: "match_1",
      bookingId: "booking_1",
      creatorId: "user_1",
      type: "OPEN",
      levelMin: 1,
      levelMax: 8,
      status: "FULL",
      winnerTeam: null,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const player: MatchPlayerRow & { user?: UserRow } = {
      id: "mp_1",
      matchId: "match_1",
      userId: "user_1",
      team: 1,
      confirmed: true,
      user: makeUser(),
    };
    const booking: BookingRow = {
      id: "booking_1",
      courtId: "court_1",
      date: "2026-09-01",
      startTime: "18:00",
      endTime: "19:00",
      status: "BOOKED",
      userId: "user_1",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const result = publicMatch(match, [player], booking);

    expect(result.players).toHaveLength(1);
    expect(result.players[0].user).not.toHaveProperty("passwordHash");
    expect(result.players[0].confirmed).toBe(true);
    expect(result.booking).toEqual(publicBooking(booking));
  });

  it("usa valores por defecto (sin jugadores/booking) cuando no se pasan", () => {
    const match: MatchRow = {
      id: "match_2",
      bookingId: "booking_2",
      creatorId: "user_2",
      type: "OPEN",
      levelMin: 1,
      levelMax: 8,
      status: "OPEN",
      winnerTeam: null,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const result = publicMatch(match);
    expect(result.players).toEqual([]);
    expect(result.booking).toBeUndefined();
  });
});

function makeClub(overrides: Partial<ClubRow> = {}): ClubRow {
  return {
    id: "club_1",
    ownerId: "owner_1",
    name: "Las Mercedes Pádel Club",
    description: "Club de pádel",
    address: "Av. Principal",
    city: "Caracas",
    status: "APPROVED",
    visibilityPlan: "NONE",
    openHour: 8,
    closeHour: 22,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as ClubRow;
}

describe("publicClub", () => {
  it("usa 0/0 como calificación por defecto cuando no se pasa ratingSummary", () => {
    const result = publicClub(makeClub());
    expect(result.avgRating).toBe(0);
    expect(result.reviewCount).toBe(0);
  });

  it("expone el promedio y conteo de reseñas cuando se pasan", () => {
    const result = publicClub(makeClub(), [], { avgRating: 4.25, reviewCount: 12 });
    expect(result.avgRating).toBe(4.25);
    expect(result.reviewCount).toBe(12);
  });

  it("serializa las pistas anidadas con publicCourt", () => {
    const court: CourtRow = {
      id: "court_1",
      clubId: "club_1",
      name: "Pista 1",
      type: "CRISTAL",
      indoor: true,
      lighting: false,
      pricePerHourUsd: 25,
    };
    const result = publicClub(makeClub(), [court]);
    expect(result.courts).toEqual([publicCourt(court)]);
  });
});

describe("publicReview", () => {
  it("expone los campos de la reseña y anida publicUser (sin passwordHash) cuando se pasa el usuario", () => {
    const review: ReviewRow & { user?: UserRow } = {
      id: "review_1",
      clubId: "club_1",
      userId: "user_1",
      rating: 5,
      comment: "Excelente club",
      createdAt: "2026-01-01T00:00:00.000Z",
      user: makeUser(),
    };
    const result = publicReview(review);
    expect(result).toMatchObject({ id: "review_1", clubId: "club_1", rating: 5, comment: "Excelente club" });
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("deja user undefined cuando no se pasa", () => {
    const review: ReviewRow = {
      id: "review_2",
      clubId: "club_1",
      userId: "user_2",
      rating: 3,
      comment: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    expect(publicReview(review).user).toBeUndefined();
  });
});

describe("publicAdSlot", () => {
  function makeAdSlot(overrides: Partial<AdSlotRow> = {}): AdSlotRow {
    return {
      id: "ad_slot_1",
      position: 1,
      title: "Marca X",
      text: "Descuento especial en pádel",
      imageUrl: "/uploads/ad-slots/img.png",
      linkUrl: "https://example.com",
      active: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("expone los campos públicos del espacio publicitario", () => {
    const result = publicAdSlot(makeAdSlot());
    expect(result).toMatchObject({
      id: "ad_slot_1",
      position: 1,
      title: "Marca X",
      text: "Descuento especial en pádel",
      imageUrl: "/uploads/ad-slots/img.png",
      linkUrl: "https://example.com",
    });
  });

  it("convierte active a booleano explícito", () => {
    expect(publicAdSlot(makeAdSlot({ active: 0 as any })).active).toBe(false);
    expect(publicAdSlot(makeAdSlot({ active: 1 as any })).active).toBe(true);
  });
});

describe("publicNotification", () => {
  it("convierte read a booleano explícito", () => {
    const notification: NotificationRow = {
      id: "notif_1",
      userId: "user_1",
      type: "MATCH_CANCELLED",
      message: "Tu partida fue cancelada",
      relatedId: "match_1",
      read: 0 as any,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    expect(publicNotification(notification).read).toBe(false);
    expect(publicNotification({ ...notification, read: 1 as any }).read).toBe(true);
  });
});
