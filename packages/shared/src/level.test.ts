import { describe, expect, it } from "vitest";
import { computeLevelAfterMatch, computePlayerLevel } from "./level";
import type { SkillSurvey } from "./level";

describe("computePlayerLevel", () => {
  const base: SkillSurvey = {
    dominantArm: "DERECHA",
    frequency: "SEMANAL",
    yearsPlaying: 2,
    selfAssessment: 3,
    competes: false,
  };

  it("devuelve el mejor nivel posible (1.00) para la encuesta más fuerte", () => {
    const level = computePlayerLevel({
      dominantArm: "DERECHA",
      frequency: "DIARIO",
      yearsPlaying: 10,
      selfAssessment: 5,
      competes: true,
    });
    expect(level).toBe(1);
  });

  it("devuelve el peor nivel posible (8.00) para la encuesta más débil", () => {
    const level = computePlayerLevel({
      dominantArm: "IZQUIERDA",
      frequency: "OCASIONAL",
      yearsPlaying: 0,
      selfAssessment: 1,
      competes: false,
    });
    expect(level).toBe(8);
  });

  it("siempre devuelve un nivel dentro del rango [1, 8]", () => {
    const level = computePlayerLevel(base);
    expect(level).toBeGreaterThanOrEqual(1);
    expect(level).toBeLessThanOrEqual(8);
  });

  it("redondea a 2 decimales", () => {
    const level = computePlayerLevel(base);
    expect(level).toBe(Math.round(level * 100) / 100);
  });

  it("una autoevaluación más alta produce un nivel mejor (número más bajo), con todo lo demás igual", () => {
    const weak = computePlayerLevel({ ...base, selfAssessment: 1 });
    const strong = computePlayerLevel({ ...base, selfAssessment: 5 });
    expect(strong).toBeLessThan(weak);
  });

  it("jugar con más frecuencia produce un nivel mejor (número más bajo), con todo lo demás igual", () => {
    const rare = computePlayerLevel({ ...base, frequency: "OCASIONAL" });
    const often = computePlayerLevel({ ...base, frequency: "DIARIO" });
    expect(often).toBeLessThan(rare);
  });

  it("más años jugando produce un nivel mejor o igual (número más bajo o igual)", () => {
    const newPlayer = computePlayerLevel({ ...base, yearsPlaying: 0 });
    const veteran = computePlayerLevel({ ...base, yearsPlaying: 10 });
    expect(veteran).toBeLessThanOrEqual(newPlayer);
  });

  it("competir en torneos mejora el nivel (número más bajo), con todo lo demás igual", () => {
    const noncompetitive = computePlayerLevel({ ...base, competes: false });
    const competitive = computePlayerLevel({ ...base, competes: true });
    expect(competitive).toBeLessThan(noncompetitive);
  });

  it("el brazo dominante no afecta el cálculo del nivel", () => {
    const right = computePlayerLevel({ ...base, dominantArm: "DERECHA" });
    const left = computePlayerLevel({ ...base, dominantArm: "IZQUIERDA" });
    expect(right).toBe(left);
  });
});

describe("computeLevelAfterMatch", () => {
  it("ganar contra un rival de nivel similar mejora el nivel (número más bajo)", () => {
    const newLevel = computeLevelAfterMatch({ currentLevel: 4, opponentAvgLevel: 4, won: true });
    expect(newLevel).toBeLessThan(4);
  });

  it("perder contra un rival de nivel similar empeora el nivel (número más alto)", () => {
    const newLevel = computeLevelAfterMatch({ currentLevel: 4, opponentAvgLevel: 4, won: false });
    expect(newLevel).toBeGreaterThan(4);
  });

  it("ganarle a un rival mucho mejor (número más bajo) sube más el nivel que ganarle a uno peor", () => {
    const beatingBetter = computeLevelAfterMatch({ currentLevel: 5, opponentAvgLevel: 2, won: true });
    const beatingWorse = computeLevelAfterMatch({ currentLevel: 5, opponentAvgLevel: 7, won: true });
    const improvementVsBetter = 5 - beatingBetter;
    const improvementVsWorse = 5 - beatingWorse;
    expect(improvementVsBetter).toBeGreaterThan(improvementVsWorse);
  });

  it("perder contra un rival mucho peor (número más alto) baja más el nivel que perder contra uno mejor", () => {
    const losingToWorse = computeLevelAfterMatch({ currentLevel: 3, opponentAvgLevel: 7, won: false });
    const losingToBetter = computeLevelAfterMatch({ currentLevel: 3, opponentAvgLevel: 1, won: false });
    expect(losingToWorse).toBeGreaterThan(losingToBetter);
  });

  it("nunca baja del nivel 1 (mejor categoría), incluso con una racha de victorias", () => {
    let level = 1.2;
    for (let i = 0; i < 20; i++) {
      level = computeLevelAfterMatch({ currentLevel: level, opponentAvgLevel: 1, won: true, kFactor: 5 });
    }
    expect(level).toBeGreaterThanOrEqual(1);
  });

  it("nunca sube del nivel 8 (peor categoría), incluso con una racha de derrotas", () => {
    let level = 7.8;
    for (let i = 0; i < 20; i++) {
      level = computeLevelAfterMatch({ currentLevel: level, opponentAvgLevel: 8, won: false, kFactor: 5 });
    }
    expect(level).toBeLessThanOrEqual(8);
  });

  it("un kFactor más alto produce un cambio de nivel más grande", () => {
    const smallK = computeLevelAfterMatch({ currentLevel: 4, opponentAvgLevel: 4, won: true, kFactor: 0.2 });
    const bigK = computeLevelAfterMatch({ currentLevel: 4, opponentAvgLevel: 4, won: true, kFactor: 2 });
    expect(4 - bigK).toBeGreaterThan(4 - smallK);
  });

  it("usa kFactor=0.6 por defecto", () => {
    const withDefault = computeLevelAfterMatch({ currentLevel: 4, opponentAvgLevel: 4, won: true });
    const explicit = computeLevelAfterMatch({ currentLevel: 4, opponentAvgLevel: 4, won: true, kFactor: 0.6 });
    expect(withDefault).toBe(explicit);
  });
});
