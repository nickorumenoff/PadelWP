import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, View, StyleSheet } from "react-native";
import type { Match } from "@padel-ve/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export default function MatchesScreen() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);

  async function load() {
    try {
      const res = await api.listMatches();
      setMatches(res);
    } catch {
      // estado vacío
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function join(matchId: string, team: 1 | 2) {
    if (!user) {
      Alert.alert("Inicia sesión", "Necesitas iniciar sesión para unirte a una partida.");
      return;
    }
    try {
      await api.joinMatch(matchId, team);
      load();
    } catch {
      Alert.alert("No se pudo unir", "La partida puede que ya esté completa.");
    }
  }

  function confirmCancel(matchId: string) {
    Alert.alert("Cancelar partida", "¿Cancelar esta partida? Se liberará el horario reservado.", [
      { text: "No", style: "cancel" },
      {
        text: "Sí, cancelar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.cancelMatch(matchId);
            load();
          } catch {
            Alert.alert("No se pudo cancelar la partida.");
          }
        },
      },
    ]);
  }

  function confirmLeave(matchId: string) {
    Alert.alert("Salir de la partida", "¿Salir de esta partida?", [
      { text: "No", style: "cancel" },
      {
        text: "Sí, salir",
        style: "destructive",
        onPress: async () => {
          try {
            await api.leaveMatch(matchId);
            load();
          } catch {
            Alert.alert("No se pudo salir de la partida.");
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Partidas abiertas</Text>
      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No hay partidas abiertas todavía.</Text>}
        renderItem={({ item }) => {
          const players = item.players ?? [];
          const team1 = players.filter((p) => p.team === 1);
          const team2 = players.filter((p) => p.team === 2);
          const booking: any = item.booking;
          const alreadyIn = players.some((p) => p.userId === user?.id);
          const isCreator = !!user && item.creatorId === user.id;
          const isActive = item.status === "OPEN" || item.status === "FULL";
          const canCancel = isCreator && isActive;
          const canLeave = !isCreator && alreadyIn && isActive;
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{booking?.court?.club?.name ?? "Club"}</Text>
              <Text style={styles.cardSubtitle}>
                {booking?.date} · {booking?.startTime}-{booking?.endTime}
              </Text>
              <Text style={styles.levelBadge}>
                Nivel {item.levelMin.toFixed(1)}–{item.levelMax.toFixed(1)}
              </Text>
              {item.status === "CANCELLED" && <Text style={styles.cancelledBadge}>Cancelada</Text>}

              <View style={styles.teamsRow}>
                {[team1, team2].map((team, idx) => (
                  <View key={idx} style={styles.teamBox}>
                    <Text style={styles.teamLabel}>Equipo {idx + 1}</Text>
                    {team.map((p) => (
                      <Text key={p.id} style={styles.playerName}>
                        {p.user?.name} ({p.user?.level.toFixed(2)})
                      </Text>
                    ))}
                    {team.length < 2 && item.status === "OPEN" && (
                      <Pressable onPress={() => join(item.id, (idx + 1) as 1 | 2)} style={styles.joinBtn}>
                        <Text style={styles.joinBtnText}>Unirme</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              {(canCancel || canLeave) && (
                <View style={styles.dangerRow}>
                  {canCancel && (
                    <Pressable onPress={() => confirmCancel(item.id)} style={styles.dangerBtn}>
                      <Text style={styles.dangerBtnText}>Cancelar partida</Text>
                    </Pressable>
                  )}
                  {canLeave && (
                    <Pressable onPress={() => confirmLeave(item.id)} style={styles.dangerBtn}>
                      <Text style={styles.dangerBtnText}>Salir de la partida</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 12 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  cardSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  levelBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.blue50,
    color: colors.blue,
    fontSize: 12,
    fontWeight: "700",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  teamsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  teamBox: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10 },
  teamLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginBottom: 4 },
  playerName: { fontSize: 13, color: colors.ink },
  joinBtn: { marginTop: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingVertical: 6, alignItems: "center" },
  joinBtnText: { fontSize: 12, fontWeight: "600", color: colors.ink },
  cancelledBadge: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#DC2626" },
  dangerRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 8 },
  dangerBtn: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  dangerBtnText: { fontSize: 12, fontWeight: "600", color: "#DC2626" },
});
