import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import type { BracketMatch, CategoryDetail, Club, GroupMatch, Tournament, TournamentPair } from "@padel-ve/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

const genderLabel: Record<string, string> = { MASCULINO: "Masculino", FEMENINO: "Femenino", MIXTO: "Mixto" };
const statusLabel: Record<string, string> = {
  REGISTRATION: "Inscripciones abiertas",
  GROUPS: "Fase de grupos",
  KNOCKOUT: "Llave (eliminación directa)",
  COMPLETED: "Finalizada",
};

function pairName(pair?: TournamentPair | null): string {
  if (!pair) return "Por definir";
  return `${pair.player1?.name ?? "?"} / ${pair.player2?.name ?? "?"}`;
}

function roundLabel(round: number, totalRounds: number, bracketSize: number): string {
  const matchesInRound = bracketSize / Math.pow(2, round);
  const playersInRound = matchesInRound * 2;
  if (round === totalRounds) return "Final";
  if (playersInRound === 4) return "Semifinal";
  if (playersInRound === 8) return "Cuartos de final";
  if (playersInRound === 16) return "Octavos de final";
  if (playersInRound === 32) return "Dieciseisavos de final";
  if (playersInRound === 64) return "Treintaidosavos de final";
  return `Ronda ${round}`;
}

function ResultForm({
  pairAId,
  pairBId,
  nameA,
  nameB,
  onSubmit,
}: {
  pairAId: string;
  pairBId: string;
  nameA: string;
  nameB: string;
  onSubmit: (winnerPairId: string, setsA?: number, setsB?: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [winner, setWinner] = useState(pairAId);
  const [setsA, setSetsA] = useState("");
  const [setsB, setSetsB] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <Pressable style={styles.smallOutlineBtn} onPress={() => setOpen(true)}>
        <Text style={styles.smallOutlineBtnText}>Reportar resultado</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.resultForm}>
      <View style={styles.row}>
        <Pressable
          style={[styles.chip, { flex: 1 }, winner === pairAId && styles.chipActive]}
          onPress={() => setWinner(pairAId)}
        >
          <Text style={[styles.chipText, winner === pairAId && styles.chipTextActive]} numberOfLines={1}>
            {nameA}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.chip, { flex: 1 }, winner === pairBId && styles.chipActive]}
          onPress={() => setWinner(pairBId)}
        >
          <Text style={[styles.chipText, winner === pairBId && styles.chipTextActive]} numberOfLines={1}>
            {nameB}
          </Text>
        </Pressable>
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <TextInput
          style={[styles.smallInput, { flex: 1 }]}
          placeholder="Sets A"
          keyboardType="number-pad"
          value={setsA}
          onChangeText={setSetsA}
        />
        <TextInput
          style={[styles.smallInput, { flex: 1 }]}
          placeholder="Sets B"
          keyboardType="number-pad"
          value={setsB}
          onChangeText={setSetsB}
        />
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Pressable style={[styles.smallOutlineBtn, { flex: 1 }]} onPress={() => setOpen(false)}>
          <Text style={styles.smallOutlineBtnText}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={[styles.smallSolidBtn, { flex: 1 }]}
          disabled={submitting}
          onPress={async () => {
            setSubmitting(true);
            try {
              await onSubmit(winner, setsA ? Number(setsA) : undefined, setsB ? Number(setsB) : undefined);
              setOpen(false);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <Text style={styles.smallSolidBtnText}>{submitting ? "Guardando…" : "Guardar"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CategoryDetailScreen({ route }: any) {
  const { categoryId } = route.params;
  const { user } = useAuth();

  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [busy, setBusy] = useState(false);

  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");

  const canManage = !!user && (user.role === "PLATFORM_ADMIN" || (!!club && club.ownerId === user.id));

  async function load() {
    try {
      const cat = await api.getCategoryDetail(categoryId);
      setCategory(cat);
      const t = await api.getTournament(cat.tournamentId);
      setTournament(t);
      if (t.clubId) setClub(await api.getClub(t.clubId));
      else setClub(null);
    } catch {
      // estado vacío
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  async function handleRegister() {
    if (!user) return;
    setBusy(true);
    try {
      await api.registerForCategory(categoryId);
      await load();
    } catch {
      Alert.alert("No se pudo inscribir", "Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePair() {
    if (!player1Id || !player2Id || player1Id === player2Id) {
      Alert.alert("Selecciona 2 jugadores", "Elige 2 jugadores distintos.");
      return;
    }
    setBusy(true);
    try {
      await api.createPair(categoryId, { player1Id, player2Id });
      setPlayer1Id("");
      setPlayer2Id("");
      await load();
    } catch {
      Alert.alert("No se pudo armar la pareja", "Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateGroups() {
    setBusy(true);
    try {
      await api.generateGroups(categoryId);
      await load();
    } catch {
      Alert.alert("No se pudieron generar los grupos", "Verifica que haya suficientes parejas armadas.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateKnockout() {
    setBusy(true);
    try {
      await api.generateKnockout(categoryId);
      await load();
    } catch {
      Alert.alert("No se pudo generar la llave", "Verifica que todos los partidos de grupos tengan resultado.");
    } finally {
      setBusy(false);
    }
  }

  async function submitGroupResult(matchId: string, winnerPairId: string, setsA?: number, setsB?: number) {
    try {
      await api.submitGroupMatchResult(matchId, { winnerPairId, setsA, setsB });
      await load();
    } catch {
      Alert.alert("No se pudo guardar", "Intenta de nuevo.");
    }
  }

  async function submitBracketResult(matchId: string, winnerPairId: string, setsA?: number, setsB?: number) {
    try {
      await api.submitBracketMatchResult(matchId, { winnerPairId, setsA, setsB });
      await load();
    } catch {
      Alert.alert("No se pudo guardar", "Intenta de nuevo.");
    }
  }

  if (!category || !tournament) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Cargando categoría…</Text>
      </View>
    );
  }

  const unpaired = category.registrations.filter((r) => !r.pairId);
  const minPairsForGroups = category.bracketSize;
  const totalRounds = Math.log2(category.bracketSize);
  const pairsById = new Map(category.pairs.map((p) => [p.id, p]));

  const allGroupMatchesCompleted =
    category.groups.length > 0 && category.groups.every((g) => g.matches.every((m) => m.status === "COMPLETED"));

  const finalMatch = category.bracket.find((m) => m.round === totalRounds);
  const champion = category.status === "COMPLETED" && finalMatch?.winnerPairId ? pairsById.get(finalMatch.winnerPairId) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>
        {genderLabel[category.genderCategory]} · Nivel {category.level}
      </Text>
      <View style={styles.badgeBlue}>
        <Text style={styles.badgeBlueText}>{statusLabel[category.status]}</Text>
      </View>
      <Text style={styles.meta}>
        Llave de {category.bracketSize} parejas ({category.bracketSize / 2} grupos) · {category.registeredCount ?? 0}{" "}
        inscritos · {category.pairCount ?? 0} parejas armadas
      </Text>

      {champion && (
        <View style={styles.championCard}>
          <Text style={styles.championKicker}>Campeones de la categoría</Text>
          <Text style={styles.championName}>{pairName(champion)}</Text>
        </View>
      )}

      {category.status === "REGISTRATION" && (
        <>
          {user && !category.isRegistered && (
            <Pressable style={[styles.button, { marginTop: 14 }]} disabled={busy} onPress={handleRegister}>
              <Text style={styles.buttonText}>Inscribirme en esta categoría</Text>
            </Pressable>
          )}

          <Text style={styles.sectionLabel}>Inscritos</Text>
          {category.registrations.length === 0 && <Text style={styles.empty}>Todavía no hay inscritos.</Text>}
          {category.registrations.map((r) => (
            <View key={r.id} style={styles.listRow}>
              <Text style={styles.listRowText}>{r.user?.name ?? "Jugador"}</Text>
              <View style={r.pairId ? styles.badgeGreen : styles.badgeMuted}>
                <Text style={r.pairId ? styles.badgeGreenText : styles.badgeMutedText}>
                  {r.pairId ? "Con pareja" : "Sin pareja"}
                </Text>
              </View>
            </View>
          ))}

          {category.pairs.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Parejas armadas</Text>
              {category.pairs.map((p) => (
                <View key={p.id} style={styles.listRow}>
                  <Text style={styles.listRowText}>{pairName(p)}</Text>
                </View>
              ))}
            </>
          )}

          {canManage && (
            <View style={styles.formCard}>
              <Text style={styles.sectionLabel}>Armar pareja</Text>
              <Text style={styles.helperText}>Elige 2 jugadores inscritos y sin pareja todavía.</Text>

              <Text style={styles.label}>Jugador 1</Text>
              <View style={styles.wrapRow}>
                {unpaired.map((r) => (
                  <Pressable
                    key={r.userId}
                    onPress={() => setPlayer1Id(player1Id === r.userId ? "" : r.userId)}
                    style={[styles.chip, player1Id === r.userId && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, player1Id === r.userId && styles.chipTextActive]}>
                      {r.user?.name ?? r.userId}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Jugador 2</Text>
              <View style={styles.wrapRow}>
                {unpaired
                  .filter((r) => r.userId !== player1Id)
                  .map((r) => (
                    <Pressable
                      key={r.userId}
                      onPress={() => setPlayer2Id(player2Id === r.userId ? "" : r.userId)}
                      style={[styles.chip, player2Id === r.userId && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, player2Id === r.userId && styles.chipTextActive]}>
                        {r.user?.name ?? r.userId}
                      </Text>
                    </Pressable>
                  ))}
              </View>

              <Pressable
                style={[styles.button, { marginTop: 14 }]}
                disabled={busy || unpaired.length < 2}
                onPress={handleCreatePair}
              >
                <Text style={styles.buttonText}>Armar pareja</Text>
              </Pressable>

              <Text style={[styles.helperText, { marginTop: 16 }]}>
                Se necesitan {minPairsForGroups} parejas armadas para generar los {category.bracketSize / 2} grupos. Hay{" "}
                {category.pairCount ?? 0}.
              </Text>
              <Pressable
                style={[styles.buttonAccent, { marginTop: 8 }]}
                disabled={busy || (category.pairCount ?? 0) < minPairsForGroups}
                onPress={handleGenerateGroups}
              >
                <Text style={styles.buttonText}>Generar grupos (sorteo aleatorio)</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {category.groups.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Fase de grupos</Text>
          {category.groups.map((g) => (
            <View key={g.id} style={styles.card}>
              <Text style={styles.cardTitle}>Grupo {g.groupIndex + 1}</Text>

              {g.standings.map((s, i) => {
                const pair = g.pairs.find((p) => p.id === s.pairId);
                return (
                  <View key={s.pairId} style={styles.standingRow}>
                    <Text style={[styles.standingName, i < 2 && styles.standingNameTop]} numberOfLines={1}>
                      {pairName(pair)} {i < 2 ? "· Clasifica" : ""}
                    </Text>
                    <Text style={styles.standingStats}>
                      {s.wins}G {s.losses}P · dif {s.setDiff > 0 ? `+${s.setDiff}` : s.setDiff}
                    </Text>
                  </View>
                );
              })}

              <View style={{ marginTop: 10 }}>
                {g.matches.map((m: GroupMatch) => {
                  const pairA = g.pairs.find((p) => p.id === m.pairAId);
                  const pairB = g.pairs.find((p) => p.id === m.pairBId);
                  return (
                    <View key={m.id} style={styles.matchRow}>
                      <View style={styles.matchHeaderRow}>
                        <Text style={styles.matchText} numberOfLines={1}>
                          {pairName(pairA)} vs {pairName(pairB)}
                        </Text>
                        {m.status === "COMPLETED" ? (
                          <View style={styles.badgeGreen}>
                            <Text style={styles.badgeGreenText}>{m.winnerPairId === m.pairAId ? "Ganó A" : "Ganó B"}</Text>
                          </View>
                        ) : (
                          <View style={styles.badgeMuted}>
                            <Text style={styles.badgeMutedText}>Pendiente</Text>
                          </View>
                        )}
                      </View>
                      {canManage && m.status === "PENDING" && (
                        <ResultForm
                          pairAId={m.pairAId}
                          pairBId={m.pairBId}
                          nameA={pairName(pairA)}
                          nameB={pairName(pairB)}
                          onSubmit={(winner, sA, sB) => submitGroupResult(m.id, winner, sA, sB)}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {canManage && category.status === "GROUPS" && (
            <View style={styles.formCard}>
              <Text style={styles.helperText}>
                {allGroupMatchesCompleted
                  ? "Todos los partidos de grupos tienen resultado. Ya puedes generar la llave."
                  : "Faltan partidos de grupos por reportar para poder generar la llave."}
              </Text>
              <Pressable
                style={[styles.buttonAccent, { marginTop: 10 }]}
                disabled={busy || !allGroupMatchesCompleted}
                onPress={handleGenerateKnockout}
              >
                <Text style={styles.buttonText}>Generar llave de eliminación directa</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {category.bracket.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Llave de eliminación directa</Text>
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
            const matches = category.bracket
              .filter((m: BracketMatch) => m.round === round)
              .sort((a, b) => a.slot - b.slot);
            if (matches.length === 0) return null;
            return (
              <View key={round} style={styles.card}>
                <Text style={styles.cardTitle}>{roundLabel(round, totalRounds, category.bracketSize)}</Text>
                {matches.map((m) => {
                  const pairA = m.pairAId ? pairsById.get(m.pairAId) : undefined;
                  const pairB = m.pairBId ? pairsById.get(m.pairBId) : undefined;
                  const ready = !!m.pairAId && !!m.pairBId;
                  return (
                    <View key={m.id} style={styles.matchRow}>
                      <View style={styles.matchHeaderRow}>
                        <Text style={[styles.matchText, !ready && { color: colors.muted }]} numberOfLines={1}>
                          {pairName(pairA)} vs {pairName(pairB)}
                        </Text>
                        {m.status === "COMPLETED" ? (
                          <View style={styles.badgeGreen}>
                            <Text style={styles.badgeGreenText}>{m.winnerPairId === m.pairAId ? "Ganó A" : "Ganó B"}</Text>
                          </View>
                        ) : (
                          <View style={styles.badgeMuted}>
                            <Text style={styles.badgeMutedText}>{ready ? "Pendiente" : "Por definir"}</Text>
                          </View>
                        )}
                      </View>
                      {canManage && ready && m.status === "PENDING" && m.pairAId && m.pairBId && (
                        <ResultForm
                          pairAId={m.pairAId}
                          pairBId={m.pairBId}
                          nameA={pairName(pairA)}
                          nameB={pairName(pairB)}
                          onSubmit={(winner, sA, sB) => submitBracketResult(m.id, winner, sA, sB)}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: 2 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 6 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  helperText: { fontSize: 12, color: colors.muted },
  empty: { fontSize: 13, color: colors.muted },
  championCard: {
    backgroundColor: colors.greenLight,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 14,
  },
  championKicker: { fontSize: 11, fontWeight: "700", color: colors.greenDark, textTransform: "uppercase" },
  championName: { fontSize: 17, fontWeight: "700", color: colors.greenDark, marginTop: 4 },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  listRowText: { fontSize: 13, color: colors.ink, flexShrink: 1 },
  formCard: { backgroundColor: colors.mist, borderRadius: 16, padding: 14, marginTop: 14 },
  label: { fontSize: 11, fontWeight: "700", color: colors.muted, marginTop: 10, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", gap: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#fff" },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blue50 },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.blue, fontWeight: "700" },
  button: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  buttonAccent: { backgroundColor: colors.green, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  badgeBlue: { alignSelf: "flex-start", backgroundColor: colors.blue50, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  badgeBlueText: { fontSize: 11, fontWeight: "700", color: colors.blue },
  badgeGreen: { backgroundColor: colors.greenLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreenText: { fontSize: 10, fontWeight: "700", color: colors.greenDark },
  badgeMuted: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeMutedText: { fontSize: 10, fontWeight: "700", color: colors.muted },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  standingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 },
  standingName: { fontSize: 12, color: colors.muted, flexShrink: 1, marginRight: 8 },
  standingNameTop: { color: colors.ink, fontWeight: "700" },
  standingStats: { fontSize: 11, color: colors.muted },
  matchRow: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginTop: 8 },
  matchHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  matchText: { fontSize: 12, color: colors.ink, flexShrink: 1 },
  smallOutlineBtn: { marginTop: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 7, alignItems: "center" },
  smallOutlineBtnText: { fontSize: 11, fontWeight: "600", color: colors.ink },
  smallSolidBtn: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 7, alignItems: "center" },
  smallSolidBtnText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  resultForm: { marginTop: 8, backgroundColor: colors.mist, borderRadius: 10, padding: 10 },
  smallInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    backgroundColor: "#fff",
    color: colors.ink,
  },
});
