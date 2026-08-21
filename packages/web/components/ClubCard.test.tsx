import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Club } from "@padel-ve/shared";
import ClubCard from "./ClubCard";

function makeClub(overrides: Partial<Club> = {}): Club {
  return {
    id: "club_1",
    ownerId: "owner_1",
    name: "Las Mercedes Pádel Club",
    description: "Club de pádel en el este de Caracas.",
    address: "Av. Principal",
    city: "Caracas",
    status: "APPROVED",
    visibilityPlan: "NONE",
    openHour: 8,
    closeHour: 22,
    createdAt: "2026-01-01T00:00:00.000Z",
    courts: [],
    ...overrides,
  } as Club;
}

describe("ClubCard", () => {
  it("muestra el nombre y la ciudad del club", () => {
    render(<ClubCard club={makeClub()} />);
    expect(screen.getByText("Las Mercedes Pádel Club")).toBeInTheDocument();
    expect(screen.getByText("Caracas")).toBeInTheDocument();
  });

  it("muestra el precio más bajo entre las pistas del club", () => {
    const club = makeClub({
      courts: [
        { id: "c1", clubId: "club_1", name: "Pista 1", type: "CRISTAL", indoor: false, lighting: true, pricePerHourUsd: 30 },
        { id: "c2", clubId: "club_1", name: "Pista 2", type: "MURO", indoor: true, lighting: true, pricePerHourUsd: 22 },
      ] as any,
    });
    render(<ClubCard club={club} />);
    expect(screen.getByText("Desde $22/h")).toBeInTheDocument();
  });

  it("no muestra precio cuando el club no tiene pistas", () => {
    render(<ClubCard club={makeClub({ courts: [] })} />);
    expect(screen.queryByText(/Desde \$/)).not.toBeInTheDocument();
    expect(screen.getByText("0 pista(s)")).toBeInTheDocument();
  });

  it("muestra la insignia de plan solo cuando el club tiene un plan de visibilidad activo", () => {
    const { rerender } = render(<ClubCard club={makeClub({ visibilityPlan: "NONE" })} />);
    expect(screen.queryByText("Club Destacado")).not.toBeInTheDocument();

    rerender(<ClubCard club={makeClub({ visibilityPlan: "FEATURED" })} />);
    expect(screen.getByText("Club Destacado")).toBeInTheDocument();
  });

  it("enlaza al detalle del club correcto", () => {
    render(<ClubCard club={makeClub({ id: "club_42" })} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/clubs/club_42");
  });

  it("muestra la calificación promedio y el número de reseñas cuando el club tiene reseñas", () => {
    render(<ClubCard club={makeClub({ avgRating: 4.5, reviewCount: 8 })} />);
    expect(screen.getByText("4.5 (8)")).toBeInTheDocument();
  });

  it("no muestra calificación cuando el club no tiene reseñas todavía", () => {
    render(<ClubCard club={makeClub({ avgRating: 0, reviewCount: 0 })} />);
    expect(screen.queryByText(/\(0\)/)).not.toBeInTheDocument();
  });
});
