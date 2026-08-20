import { describe, expect, it } from "vitest";
import { publicBooking, publicCourt, publicMatch, publicUser } from "./serializers";
import type { BookingRow, CourtRow, MatchPlayerRow, MatchRow, UserRow } from "./repositories";

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
