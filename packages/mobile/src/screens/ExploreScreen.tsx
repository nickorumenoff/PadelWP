import React, { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, TextInput, View, StyleSheet } from "react-native";
import type { Club, Sponsorship } from "@padel-ve/shared";
import { api } from "../lib/api";
import { colors } from "../theme";
import AdSlotBanner from "../components/AdSlotBanner";

export default function ExploreScreen({ navigation }: any) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [city, setCity] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const [c, s] = await Promise.all([
        api.listClubs(city ? { city } : undefined),
        api.listSponsorships(),
      ]);
      setClubs(c);
      setSponsorships(s);
    } catch {
      // silencioso: se muestra estado vacío
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>Pádel en Venezuela</Text>
        <Text style={styles.heroTitle}>Reserva tu pista y arma tu partida</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          onSubmitEditing={load}
          placeholder="Busca por ciudad (ej. Caracas)"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      {sponsorships[0] && (
        <View style={styles.sponsorBanner}>
          <Text style={styles.sponsorKicker}>Patrocinado</Text>
          <Text style={styles.sponsorName}>{sponsorships[0].sponsorName}</Text>
          <Text style={styles.sponsorPlan}>{sponsorships[0].planName}</Text>
        </View>
      )}

      <AdSlotBanner />

      <FlatList
        data={clubs}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.blue} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay clubes registrados todavía para esa ciudad.</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate("ClubDetail", { clubId: item.id })}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.visibilityPlan !== "NONE" && (
                <View style={styles.badgeGreen}>
                  <Text style={styles.badgeGreenText}>Destacado</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardSubtitle}>{item.city}</Text>
            <Text style={styles.cardMeta}>{item.courts?.length ?? 0} pista(s)</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  hero: { backgroundColor: colors.blue, borderRadius: 20, padding: 20, marginBottom: 16 },
  heroKicker: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 6, marginBottom: 14 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  sponsorBanner: {
    backgroundColor: colors.greenLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  sponsorKicker: { fontSize: 11, fontWeight: "700", color: colors.greenDark, textTransform: "uppercase" },
  sponsorName: { fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: 2 },
  sponsorPlan: { fontSize: 13, color: colors.muted },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  cardSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cardMeta: { fontSize: 13, color: colors.blue, marginTop: 8, fontWeight: "600" },
  badgeGreen: { backgroundColor: colors.greenLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreenText: { fontSize: 11, fontWeight: "700", color: colors.greenDark },
});
