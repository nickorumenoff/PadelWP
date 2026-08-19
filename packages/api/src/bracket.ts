import {
  BracketMatches,
  GroupMatches,
  TournamentGroups,
  TournamentPairs,
  type BracketMatchRow,
  type GroupMatchRow,
  type TournamentPairRow,
} from "./repositories";

/**
 * Lógica de fase de grupos + eliminación directa, como se juega un torneo de
 * pádel real: las parejas inscritas en una categoría se reparten en grupos
 * (normalmente de 4), juegan todos contra todos dentro del grupo, y los 2
 * mejores de cada grupo avanzan a una llave de eliminación directa cuyo
 * tamaño se define al crear la categoría (bracketSize = cantidad de parejas
 * que llegan a la llave = numGroups * 2).
 */

// Baraja simple tipo Fisher-Yates. No usa Math.random directamente en tests/workflows,
// pero aquí corre en el servidor real así que es seguro.
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function numGroupsForBracketSize(bracketSize: number): number {
  return bracketSize / 2;
}

/**
 * Reparte las parejas registradas en `numGroups` grupos lo más parejo posible
 * (algunos grupos de 4, alguno de 3 o 5 si no es divisible exactamente), crea
 * los grupos y genera los partidos de todos-contra-todos dentro de cada uno.
 */
export function generateGroups(categoryId: string, pairs: TournamentPairRow[], numGroups: number) {
  const shuffled = shuffle(pairs);
  const buckets: TournamentPairRow[][] = Array.from({ length: numGroups }, () => []);
  shuffled.forEach((pair, i) => buckets[i % numGroups].push(pair));

  buckets.forEach((groupPairs, groupIndex) => {
    const group = TournamentGroups.create({ categoryId, groupIndex });
    groupPairs.forEach((pair) => TournamentPairs.setGroup(pair.id, group.id));

    // Todos contra todos dentro del grupo.
    for (let i = 0; i < groupPairs.length; i++) {
      for (let j = i + 1; j < groupPairs.length; j++) {
        GroupMatches.create({
          categoryId,
          groupId: group.id,
          pairAId: groupPairs[i].id,
          pairBId: groupPairs[j].id,
        });
      }
    }
  });
}

export interface GroupStanding {
  pairId: string;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  setDiff: number;
}

/**
 * Calcula la clasificación de un grupo a partir de sus partidos completados.
 * Orden: 1) partidos ganados, 2) diferencia de sets, 3) resultado del
 * enfrentamiento directo (solo si son exactamente 2 parejas empatadas),
 * 4) orden estable (aleatorio ya aplicado al armar el grupo) como último desempate.
 */
export function computeStandings(pairIds: string[], matches: GroupMatchRow[]): GroupStanding[] {
  const standings = new Map<string, GroupStanding>();
  for (const id of pairIds) {
    standings.set(id, { pairId: id, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, setDiff: 0 });
  }

  for (const m of matches) {
    if (m.status !== "COMPLETED" || !m.winnerPairId) continue;
    const a = standings.get(m.pairAId);
    const b = standings.get(m.pairBId);
    if (!a || !b) continue;
    const setsA = m.setsA ?? (m.winnerPairId === m.pairAId ? 1 : 0);
    const setsB = m.setsB ?? (m.winnerPairId === m.pairBId ? 1 : 0);
    a.setsFor += setsA;
    a.setsAgainst += setsB;
    b.setsFor += setsB;
    b.setsAgainst += setsA;
    if (m.winnerPairId === m.pairAId) {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }
  }

  for (const s of standings.values()) s.setDiff = s.setsFor - s.setsAgainst;

  function headToHeadWinner(x: GroupStanding, y: GroupStanding): number {
    const direct = matches.find(
      (m) =>
        m.status === "COMPLETED" &&
        ((m.pairAId === x.pairId && m.pairBId === y.pairId) || (m.pairAId === y.pairId && m.pairBId === x.pairId))
    );
    if (!direct || !direct.winnerPairId) return 0;
    if (direct.winnerPairId === x.pairId) return -1;
    if (direct.winnerPairId === y.pairId) return 1;
    return 0;
  }

  return [...standings.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    const h2h = headToHeadWinner(a, b);
    if (h2h !== 0) return h2h;
    return 0;
  });
}

/**
 * Construye la llave de eliminación directa a partir de los clasificados de
 * cada grupo (1º y 2º lugar). Empareja 1º del grupo i contra 2º de otro
 * grupo (nunca el mismo, para no repetir cruce de fase de grupos), y crea
 * placeholders vacíos para las rondas siguientes.
 */
export function generateKnockoutFromGroups(
  categoryId: string,
  groupWinners: string[],
  groupRunnersUp: string[]
): void {
  const numGroups = groupWinners.length;
  const bracketSize = numGroups * 2;
  const totalRounds = Math.log2(bracketSize);

  // Cruce: ganador del grupo i vs 2º del grupo (i+1) % numGroups, así nunca
  // se repite el cruce de la fase de grupos en la primera ronda.
  const round1Pairs: [string, string][] = groupWinners.map((winner, i) => [
    winner,
    groupRunnersUp[(i + 1) % numGroups],
  ]);

  round1Pairs.forEach(([pairAId, pairBId], slot) => {
    BracketMatches.create({ categoryId, round: 1, slot, pairAId, pairBId });
  });

  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let slot = 0; slot < matchesInRound; slot++) {
      BracketMatches.create({ categoryId, round, slot });
    }
  }
}

/**
 * Tras reportar el resultado de un partido de la llave, hace avanzar al
 * ganador a la ronda siguiente (si existe).
 */
export function advanceBracketWinner(match: BracketMatchRow, totalRounds: number) {
  if (match.round >= totalRounds || !match.winnerPairId) return;
  const nextRound = match.round + 1;
  const nextSlot = Math.floor(match.slot / 2);
  const position: "A" | "B" = match.slot % 2 === 0 ? "A" : "B";
  const nextMatch = BracketMatches.findByCategoryRoundSlot(match.categoryId, nextRound, nextSlot);
  if (nextMatch) BracketMatches.setPairSlot(nextMatch.id, position, match.winnerPairId);
}

export function totalRoundsForBracketSize(bracketSize: number): number {
  return Math.log2(bracketSize);
}
