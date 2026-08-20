import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Match, User } from "@padel-ve/shared";
import MatchCard from "./MatchCard";

const mockUseAuth = vi.fn();
vi.mock("@/app/providers", () => ({
  useAuth: () => mockUseAuth(),
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_1",
    name: "María",
    email: "maria@example.com",
    phone: null,
    role: "PLAYER",
    level: 3.5,
    gender: "FEMENINO",
    dominantArm: "DERECHA",
    frequency: "SEMANAL",
    yearsPlaying: 3,
    selfAssessment: 3,
    competes: true,
    city: "Caracas",
    photoUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "match_1",
    bookingId: "booking_1",
    creatorId: "user_1",
    type: "OPEN",
    levelMin: 1,
    levelMax: 8,
    status: "OPEN",
    winnerTeam: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    players: [],
    booking: { id: "booking_1", courtId: "court_1", date: "2026-09-01", startTime: "18:00", endTime: "19:00", status: "BOOKED", userId: "user_1" } as any,
    ...overrides,
  } as Match;
}

describe("MatchCard", () => {
  it("muestra el botón de 'Unirme aquí' en un equipo con cupo, para partidas abiertas", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ id: "other_user" }) });
    const onJoin = vi.fn();
    render(<MatchCard match={makeMatch()} onJoin={onJoin} />);
    const joinButtons = screen.getAllByText("Unirme aquí");
    expect(joinButtons.length).toBeGreaterThan(0);
    expect(joinButtons[0]).not.toBeDisabled();
  });

  it("no muestra botón de unirse en un equipo que ya tiene 2 jugadores", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ id: "other_user" }) });
    const match = makeMatch({
      players: [
        { id: "mp1", matchId: "match_1", userId: "p1", team: 1, confirmed: true, user: makeUser({ id: "p1", name: "Jugador 1" }) },
        { id: "mp2", matchId: "match_1", userId: "p2", team: 1, confirmed: true, user: makeUser({ id: "p2", name: "Jugador 2" }) },
      ] as any,
    });
    render(<MatchCard match={match} onJoin={vi.fn()} />);
    // solo debe quedar el botón del equipo 2 (que sigue vacío)
    expect(screen.getAllByText("Unirme aquí")).toHaveLength(1);
  });

  it("deshabilita 'Unirme aquí' si el usuario actual ya está en la partida", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ id: "me" }) });
    const match = makeMatch({
      players: [{ id: "mp1", matchId: "match_1", userId: "me", team: 1, confirmed: true, user: makeUser({ id: "me" }) }] as any,
    });
    render(<MatchCard match={match} onJoin={vi.fn()} />);
    const joinButtons = screen.getAllByText("Unirme aquí");
    joinButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("muestra los botones de reportar resultado solo cuando la partida está FULL y el usuario participa", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ id: "me" }) });
    const fullMatch = makeMatch({
      status: "FULL",
      players: [{ id: "mp1", matchId: "match_1", userId: "me", team: 1, confirmed: true, user: makeUser({ id: "me" }) }] as any,
    });
    render(<MatchCard match={fullMatch} onSubmitResult={vi.fn()} />);
    expect(screen.getByText("Ganó equipo 1")).toBeInTheDocument();
    expect(screen.getByText("Ganó equipo 2")).toBeInTheDocument();
  });

  it("no muestra los botones de reportar resultado si el usuario no participó en la partida", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ id: "spectator" }) });
    const fullMatch = makeMatch({
      status: "FULL",
      players: [{ id: "mp1", matchId: "match_1", userId: "someone_else", team: 1, confirmed: true, user: makeUser({ id: "someone_else" }) }] as any,
    });
    render(<MatchCard match={fullMatch} onSubmitResult={vi.fn()} />);
    expect(screen.queryByText("Ganó equipo 1")).not.toBeInTheDocument();
  });

  it("muestra el resultado final cuando la partida está completada", () => {
    mockUseAuth.mockReturnValue({ user: null });
    const completed = makeMatch({ status: "COMPLETED", winnerTeam: 2 });
    render(<MatchCard match={completed} />);
    expect(screen.getByText(/Finalizada · Ganó equipo 2/)).toBeInTheDocument();
  });
});
