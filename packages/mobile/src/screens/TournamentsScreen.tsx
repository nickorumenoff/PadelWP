import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, View, StyleSheet } from "react-native";
import type { Tournament } from "@padel-ve/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export default function TournamentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  async function load() {
    setRefreshing(true);
    try {
      const res = await api.listTournaments();
      setTournaments(res);
    } catch {
      // estado vacío
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRegister(id: string) {
    if (!user) {
      navigation.navigate("Perfil", { screen: "Login" });
      return;
    }
    setRegisteringId(id);
    try {
      await api.registerForTournament(id);
      await load();
    } catch {
      Alert.alert("No se pudo inscribir", "Verifica el cupo y tu nivel de juego.");
    } finally {
      setRegisteringId(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Torneos</Text>
      <Text style={styles.subtitle}>Torneos publicados por clubes y administradores de Padel WP.</Text>

      <FlatList
        data={tournaments}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.blue} />}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>Todavía no hay torneos publicados.</Text>}
        renderItem={({ item }) => {
          const full = (item.registeredCount ?? 0) >= item.maxPlayers;
          const outOfLevel = user ? user.level < item.levelMin || user.level > item.levelMax : false;
          return (
            <Pressable style={styles.card} onPress={() => navigation.navigate("TournamentDetail", { tournamentId: item.id })}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.badgeBlue}>
                  <Text style={styles.badgeBlueText}>
                    Nivel {item.levelMin.toFixed(1)}–{item.levelMax.toFixed(1)}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>{item.city}</Text>
              <Text style={styles.cardMeta}>
                {item.startDate} · {item.registeredCount ?? 0}/{item.maxPlayers} inscritos
              </Text>

              <View style={styles.footerRow}>
                <View style={[styles.badgeGreen, item.status !== "OPEN" && styles.badgeMuted]}>
                  <Text style={[styles.badgeGreenText, item.status !== "OPEN" && styles.badgeMutedText]}>{item.status}</Text>
                </View>
                {item.isRegistered ? (
                  <Text style={styles.registered}>Ya estás inscrito</Text>
                ) : (
                  <Pressable
                    disabled={item.status !== "OPEN" || full || outOfLevel || registeringId === item.id}
                    onPress={() => handleRegister(item.id)}
                    style={[styles.registerBtn, (item.status !== "OPEN" || full || outOfLevel) && styles.registerBtnDisabled]}
                  >
                    <Text style={styles.registerBtnText}>
                      {registeringId === item.id ? "Inscribiendo…" : full ? "Cupo lleno" : outOfLevel ? "Fuera de nivel" : "Inscribirme"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  cardSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 6 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  badgeBlue: { backgroundColor: colors.blue50, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBlueText: { fontSize: 11, fontWeight: "700", color: colors.blue },
  badgeGreen: { backgroundColor: colors.greenLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreenText: { fontSize: 11, fontWeight: "700", color: colors.greenDark },
  badgeMuted: { backgroundColor: colors.mist },
  badgeMutedText: { color: colors.muted },
  registered: { fontSize: 12, fontWeight: "700", color: colors.green },
  registerBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  registerBtnDisabled: { opacity: 0.5 },
  registerBtnText: { fontSize: 12, fontWeight: "600", color: colors.ink },
});
