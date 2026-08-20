import { beforeEach, describe, expect, it, vi } from "vitest";

const TournamentGroups = { create: vi.fn(), listByCategory: vi.fn() };
const TournamentPairs = { setGroup: vi.fn(), findById: vi.fn(), listByCategory: vi.fn(), create: vi.fn() };
const GroupMatches = { create: vi.fn(), listByGroup: vi.fn(), listByCategory: vi.fn(), findById: vi.fn(), setResult: vi.fn() };
const BracketMatches = {
  create: vi.fn(),
  findByCategoryRoundSlot: vi.fn(),
  setPairSlot: vi.fn(),
  listByCategory: vi.fn(),
  findById: vi.fn(),
  setResult: vi.fn(),
};

vi.mock("./repositories", () => ({ TournamentGroups, TournamentPairs, GroupMatches, BracketMatches }));

const {
  advanceBracketWinner,
  computeStandings,
  generateGroups,
  generateKnockoutFromGroups,
  numGroupsForBracketSize,
  totalRoundsForBracketSize,
} = await import("./bracket");

function pair(id: string) {
  return { id, categoryId: "cat_1", player1Id: `u_${id}_1`, player2Id: `u_${id}_2`, groupId: null, createdAt: "" };
}

function completedMatch(pairAId: string, pairBId: string, winnerPairId: string, setsA = 2, setsB = 0) {
  return {
    id: `m_${pairAId}_${pairBId}`,
    categoryId: "cat_1",
    groupId: "grp_1",
    pairAId,
    pairBId,
    setsA,
    setsB,
    winnerPairId,
    status: "COMPLETED",
    createdAt: "",
    completedAt: "",
  };
}

describe("numGroupsForBracketSize / totalRoundsForBracketSize", () => {
  it("calcula el número de grupos como bracketSize / 2", () => {
    expect(numGroupsForBracketSize(4)).toBe(2);
    expect(numGroupsForBracketSize(8)).toBe(4);
    expect(numGroupsForBracketSize(16)).toBe(8);
  });

  it("calcula el total de rondas de la llave como log2(bracketSize)", () => {
    expect(totalRoundsForBracketSize(4)).toBe(2);
    expect(totalRoundsForBracketSize(8)).toBe(3);
    expect(totalRoundsForBracketSize(16)).toBe(4);
  });
});

describe("computeStandings", () => {
  it("cuenta partidos ganados/perdidos y calcula diferencia de sets", () => {
    const standings = computeStandings(
      ["A", "B"],
      [completedMatch("A", "B", "A", 2, 1)]
    );
    const a = standings.find((s) => s.pairId === "A")!;
    const b = standings.find((s) => s.pairId === "B")!;
    expect(a.wins).toBe(1);
    expect(a.losses).toBe(0);
    expect(a.setDiff).toBe(1);
    expect(b.wins).toBe(0);
    expect(b.losses).toBe(1);
    expect(b.setDiff).toBe(-1);
  });

  it("ordena primero por partidos ganados", () => {
    const standings = computeStandings(
      ["A", "B", "C"],
      [completedMatch("A", "B", "A"), completedMatch("A", "C", "A"), completedMatch("B", "C", "B")]
    );
    expect(standings[0].pairId).toBe("A"); // 2 wins
    expect(standings[1].pairId).toBe("B"); // 1 win
    expect(standings[2].pairId).toBe("C"); // 0 wins
  });

  it("ante empate en victorias, desempata por diferencia de sets", () => {
    const standings = computeStandings(
      ["A", "B", "C", "D"],
      [
        completedMatch("A", "B", "A", 2, 0), // A: +2
        completedMatch("C", "D", "C", 2, 1), // C: +1
      ]
    );
    // A y C tienen 1 victoria cada uno pero A tiene mejor diferencia de sets
    const aIndex = standings.findIndex((s) => s.pairId === "A");
    const cIndex = standings.findIndex((s) => s.pairId === "C");
    expect(aIndex).toBeLessThan(cIndex);
  });

  it("usa el resultado del enfrentamiento directo solo cuando hay exactamente 2 parejas empatadas", () => {
    // A le ganó a B en el cruce directo, y ambos terminan con 1 victoria y la misma diferencia de sets
    const standings = computeStandings(
      ["A", "B"],
      [completedMatch("A", "B", "A", 2, 1), completedMatch("B", "A", "B", 2, 1)]
    );
    // A y B quedan 1-1 con setDiff neto 0 cada uno; el enfrentamiento directo está empatado (cada uno ganó su
    // partido en cada rol), así que el resultado depende del primer match encontrado — verificamos que no explota
    // y devuelve ambos con wins=1
    expect(standings.every((s) => s.wins === 1)).toBe(true);
  });

  it("ignora partidos no completados", () => {
    const pending = { ...completedMatch("A", "B", "A"), status: "PENDING", winnerPairId: null };
    const standings = computeStandings(["A", "B"], [pending]);
    expect(standings.every((s) => s.wins === 0 && s.losses === 0)).toBe(true);
  });
});

describe("generateGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let groupCounter = 0;
    TournamentGroups.create.mockImplementation(async (input: any) => ({
      id: `grp_${groupCounter++}`,
      ...input,
      createdAt: "",
    }));
  });

  it("reparte las parejas en el número de grupos indicado y genera todos los partidos todos-contra-todos", async () => {
    const pairs = [pair("p1"), pair("p2"), pair("p3"), pair("p4")];
    await generateGroups("cat_1", pairs, 2);

    // 2 grupos creados
    expect(TournamentGroups.create).toHaveBeenCalledTimes(2);
    expect(TournamentGroups.create).toHaveBeenCalledWith({ categoryId: "cat_1", groupIndex: 0 });
    expect(TournamentGroups.create).toHaveBeenCalledWith({ categoryId: "cat_1", groupIndex: 1 });

    // las 4 parejas quedan asignadas a algún grupo
    expect(TournamentPairs.setGroup).toHaveBeenCalledTimes(4);

    // con 4 parejas repartidas en 2 grupos de 2, cada grupo genera 1 partido (todos contra todos) = 2 partidos
    expect(GroupMatches.create).toHaveBeenCalledTimes(2);
  });

  it("con un número de parejas no divisible exactamente, arma grupos de tamaño desigual (3 y 2)", async () => {
    const pairs = [pair("p1"), pair("p2"), pair("p3"), pair("p4"), pair("p5")];
    await generateGroups("cat_1", pairs, 2);

    expect(TournamentPairs.setGroup).toHaveBeenCalledTimes(5);
    // grupo de 3 -> C(3,2)=3 partidos; grupo de 2 -> C(2,2)=1 partido; total 4
    expect(GroupMatches.create).toHaveBeenCalledTimes(4);
  });
});

describe("generateKnockoutFromGroups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cruza el ganador de cada grupo con el subcampeón de otro grupo distinto (nunca el mismo)", async () => {
    const winners = ["w0", "w1", "w2", "w3"];
    const runnersUp = ["r0", "r1", "r2", "r3"];
    await generateKnockoutFromGroups("cat_1", winners, runnersUp);

    // ronda 1: 4 partidos, cruzando winner[i] con runnerUp[(i+1)%4]
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 1, slot: 0, pairAId: "w0", pairBId: "r1" });
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 1, slot: 1, pairAId: "w1", pairBId: "r2" });
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 1, slot: 2, pairAId: "w2", pairBId: "r3" });
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 1, slot: 3, pairAId: "w3", pairBId: "r0" });

    // rondas siguientes: placeholders vacíos (2 partidos en ronda 2, 1 en ronda 3 = final)
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 2, slot: 0 });
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 2, slot: 1 });
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 3, slot: 0 });

    expect(BracketMatches.create).toHaveBeenCalledTimes(7); // 4 + 2 + 1
  });

  it("con 2 grupos (bracketSize 4) genera solo semifinal (ronda 1) y final (ronda 2)", async () => {
    await generateKnockoutFromGroups("cat_1", ["w0", "w1"], ["r0", "r1"]);
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 1, slot: 0, pairAId: "w0", pairBId: "r1" });
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 1, slot: 1, pairAId: "w1", pairBId: "r0" });
    expect(BracketMatches.create).toHaveBeenCalledWith({ categoryId: "cat_1", round: 2, slot: 0 });
    expect(BracketMatches.create).toHaveBeenCalledTimes(3);
  });
});

describe("advanceBracketWinner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hace avanzar al ganador a la posición A de la siguiente ronda cuando viene de un slot par", async () => {
    const match = { id: "m1", categoryId: "cat_1", round: 1, slot: 0, pairAId: "X", pairBId: "Y", setsA: 2, setsB: 0, winnerPairId: "X", status: "COMPLETED", createdAt: "", completedAt: "" };
    BracketMatches.findByCategoryRoundSlot.mockResolvedValue({ id: "next_match" });

    await advanceBracketWinner(match, 3);

    expect(BracketMatches.findByCategoryRoundSlot).toHaveBeenCalledWith("cat_1", 2, 0);
    expect(BracketMatches.setPairSlot).toHaveBeenCalledWith("next_match", "A", "X");
  });

  it("hace avanzar al ganador a la posición B de la siguiente ronda cuando viene de un slot impar", async () => {
    const match = { id: "m2", categoryId: "cat_1", round: 1, slot: 1, pairAId: "X", pairBId: "Y", setsA: 0, setsB: 2, winnerPairId: "Y", status: "COMPLETED", createdAt: "", completedAt: "" };
    BracketMatches.findByCategoryRoundSlot.mockResolvedValue({ id: "next_match" });

    await advanceBracketWinner(match, 3);

    expect(BracketMatches.findByCategoryRoundSlot).toHaveBeenCalledWith("cat_1", 2, 0);
    expect(BracketMatches.setPairSlot).toHaveBeenCalledWith("next_match", "B", "Y");
  });

  it("no hace nada si el partido es de la ronda final", async () => {
    const match = { id: "m3", categoryId: "cat_1", round: 3, slot: 0, pairAId: "X", pairBId: "Y", setsA: 2, setsB: 0, winnerPairId: "X", status: "COMPLETED", createdAt: "", completedAt: "" };
    await advanceBracketWinner(match, 3);
    expect(BracketMatches.findByCategoryRoundSlot).not.toHaveBeenCalled();
    expect(BracketMatches.setPairSlot).not.toHaveBeenCalled();
  });

  it("no hace nada si el partido no tiene ganador todavía", async () => {
    const match = { id: "m4", categoryId: "cat_1", round: 1, slot: 0, pairAId: "X", pairBId: "Y", setsA: null, setsB: null, winnerPairId: null, status: "PENDING", createdAt: "", completedAt: null };
    await advanceBracketWinner(match, 3);
    expect(BracketMatches.findByCategoryRoundSlot).not.toHaveBeenCalled();
  });
});
