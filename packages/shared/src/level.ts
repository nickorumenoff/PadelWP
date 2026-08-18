export type DominantArm = "DERECHA" | "IZQUIERDA";

export type PlayFrequency =
  | "DIARIO"
  | "VARIAS_VECES_SEMANA"
  | "SEMANAL"
  | "QUINCENAL"
  | "MENSUAL"
  | "OCASIONAL";

export interface SkillSurvey {
  dominantArm: DominantArm;
  frequency: PlayFrequency;
  /** Años jugando pádel (acepta decimales, ej. 0.5) */
  yearsPlaying: number;
  /** Autoevaluación 1 (principiante) a 5 (avanzado/competitivo) */
  selfAssessment: 1 | 2 | 3 | 4 | 5;
  /** Si compite en torneos/ligas */
  competes: boolean;
}

const FREQUENCY_POINTS: Record<PlayFrequency, number> = {
  DIARIO: 3,
  VARIAS_VECES_SEMANA: 2.5,
  SEMANAL: 1.5,
  QUINCENAL: 1,
  MENSUAL: 0.5,
  OCASIONAL: 0,
};

function experiencePoints(years: number): number {
  if (years >= 6) return 3;
  if (years >= 3) return 2;
  if (years >= 1) return 1;
  return 0;
}

const RAW_MIN = 2; // selfAssessment(1)*2 + 0 + 0 + 0
const RAW_MAX = 17; // selfAssessment(5)*2 + 3 + 3 + 1

/**
 * Calcula el nivel de un jugador a partir de la encuesta de perfil, en una escala
 * de 1.00 (mejor categoría) a 8.00 (categoría más baja), con hasta 2 decimales.
 * Cuanto más cerca de 1, mejor jugador; cuanto más cerca de 8, más principiante.
 */
export function computePlayerLevel(survey: SkillSurvey): number {
  const raw =
    survey.selfAssessment * 2 +
    FREQUENCY_POINTS[survey.frequency] +
    experiencePoints(survey.yearsPlaying) +
    (survey.competes ? 1 : 0);

  const normalized = Math.min(1, Math.max(0, (raw - RAW_MIN) / (RAW_MAX - RAW_MIN)));
  const level = 8 - normalized * 7;
  return Math.round(level * 100) / 100;
}
