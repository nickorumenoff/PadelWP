import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { User } from "@padel-ve/shared";
import ProfileScreen from "./ProfileScreen";

const mockUseAuth = jest.fn();
jest.mock("../context/AuthContext", () => ({
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

describe("ProfileScreen", () => {
  it("no renderiza nada si no hay usuario autenticado", () => {
    mockUseAuth.mockReturnValue({ user: null, logout: jest.fn() });
    const { toJSON } = render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);
    expect(toJSON()).toBeNull();
  });

  it("muestra los datos del jugador pero NO el panel de administración para un PLAYER", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ role: "PLAYER" }), logout: jest.fn() });
    render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);

    expect(screen.getByText("María")).toBeTruthy();
    expect(screen.getByText("3.50")).toBeTruthy();
    expect(screen.queryByText("Panel de administración")).toBeNull();
  });

  it("muestra el panel de administración solo para PLATFORM_ADMIN", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ role: "PLATFORM_ADMIN" }), logout: jest.fn() });
    render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);

    expect(screen.getByText("Panel de administración")).toBeTruthy();
  });

  it("navega a la pantalla de Admin al pulsar el menú de administración", () => {
    const navigate = jest.fn();
    mockUseAuth.mockReturnValue({ user: makeUser({ role: "PLATFORM_ADMIN" }), logout: jest.fn() });
    render(<ProfileScreen navigation={{ navigate }} />);

    fireEvent.press(screen.getByText("Panel de administración"));
    expect(navigate).toHaveBeenCalledWith("Admin");
  });

  it("llama a logout al pulsar 'Cerrar sesión'", () => {
    const logout = jest.fn();
    mockUseAuth.mockReturnValue({ user: makeUser(), logout });
    render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);

    fireEvent.press(screen.getByText("Cerrar sesión"));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("muestra 'Der.' o 'Izq.' según el brazo dominante", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ dominantArm: "IZQUIERDA" }), logout: jest.fn() });
    render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);
    expect(screen.getByText("Izq.")).toBeTruthy();
  });
});
