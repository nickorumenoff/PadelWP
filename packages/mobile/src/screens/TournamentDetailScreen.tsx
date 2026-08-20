import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import type { Club, GenderCategory, Tournament, TournamentCategory } from "@padel-ve/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

const BRACKET_SIZES = [4, 8, 16, 32, 64] as const;
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

const genderLabel: Record<string, string> = { MASCULINO: "Masculino", FEMENINO: "Femenino", MIXTO: "Mixto" };
const statusLabel: Record<string, string> = {
  REGISTRATION: "Inscripciones abiertas",
  GROUPS: "Fase de grupos",
  KNOCKOUT: "Llave (eliminación directa)",
  COMPLETED: "Finalizada",
};

export default function TournamentDetailScreen({ route, navigation }: any) {
  const { tournamentId } = route.params;
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [categories, setCategories] = useState<TournamentCategory[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [genderCategory, setGenderCategory] = useState<GenderCategory>("MASCULINO");
  const [level, setLevel] = useState(3);
  const [bracketSize, setBracketSize] = useState<(typeof BRACKET_SIZES)[number]>(8);
  const [creating, setCreating] = useState(false);

  const canManage = !!user && (user.role === "PLATFORM_ADMIN" || (!!club && club.ownerId === user.id));

  async function load() {
    try {
      const t = await api.getTournament(tournamentId);
      setTournament(t);
      const cats = await api.listCategories(tournamentId);
      setCategories(cats);
      if (t.clubId) setClub(await api.getClub(t.clubId));
      else setClub(null);
    } catch {
      // estado vacío
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function handleCreateCategory() {
    setCreating(true);
    try {
      await api.createCategory(tournamentId, { genderCategory, level, bracketSize });
      setShowForm(false);
      await load();
    } catch {
      Alert.alert("No se pudo crear", "Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRegister(categoryId: string) {
    if (!user) {
      navigation.navigate("Perfil", { screen: "Login" });
      return;
    }
    try {
      await api.registerForCategory(categoryId);
      await load();
    } catch {
      Alert.alert("No se pudo inscribir", "Intenta de nuevo.");
    }
  }

  if (!tournament) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Cargando torneo…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.city}>{tournament.city}</Text>
      <Text style={styles.title}>{tournament.name}</Text>
      <Text style={styles.meta}>
        {tournament.startDate}
        {tournament.endDate ? ` – ${tournament.endDate}` : ""}
      </Text>
      {tournament.description ? <Text style={styles.description}>{tournament.description}</Text> : null}

      <Text style={styles.sectionLabel}>Categorías (género, nivel y llave)</Text>
      {categories.length === 0 && <Text style={styles.empty}>Todavía no hay categorías creadas.</Text>}

      {categories.map((c) => {
        const numGroups = c.bracketSize / 2;
        return (
          <Pressable key={c.id} style={styles.card} onPress={() => navigation.navigate("CategoryDetail", { categoryId: c.id })}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {genderLabel[c.genderCategory]} · Nivel {c.level}
              </Text>
              <View style={styles.badgeBlue}>
                <Text style={styles.badgeBlueText}>{statusLabel[c.status]}</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              Llave de {c.bracketSize} parejas ({numGroups} grupos)
            </Text>
            <Text style={styles.cardMeta}>
              {c.registeredCount ?? 0} inscritos · {c.pairCount ?? 0} parejas armadas
            </Text>
            {user && c.status === "REGISTRATION" && !c.isRegistered && (
              <Pressable style={styles.registerBtn} onPress={() => handleRegister(c.id)}>
                <Text style={styles.registerBtnText}>Inscribirme en esta categoría</Text>
              </Pressable>
            )}
            {c.isRegistered && <Text style={styles.registered}>Inscrito</Text>}
          </Pressable>
        );
      })}

      {canManage && (
        <View style={styles.formCard}>
          <Pressable onPress={() => setShowForm((v) => !v)}>
            <Text style={styles.sectionLabel}>{showForm ? "Cancelar" : "+ Nueva categoría"}</Text>
          </Pressable>

          {showForm && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Género</Text>
              <View style={styles.row}>
                {(["MASCULINO", "FEMENINO", "MIXTO"] as GenderCategory[]).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGenderCategory(g)}
                    style={[styles.chip, genderCategory === g && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, genderCategory === g && styles.chipTextActive]}>{genderLabel[g]}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Nivel (1–8)</Text>
              <View style={styles.wrapRow}>
                {LEVELS.map((l) => (
                  <Pressable key={l} onPress={() => setLevel(l)} style={[styles.chip, level === l && styles.chipActive]}>
                    <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{l}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Tamaño de la llave</Text>
              <View style={styles.wrapRow}>
                {BRACKET_SIZES.map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => setBracketSize(b)}
                    style={[styles.chip, bracketSize === b && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, bracketSize === b && styles.chipTextActive]}>
                      {b} ({b / 2} grupos)
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={[styles.button, { marginTop: 14 }]} disabled={creating} onPress={handleCreateCategory}>
                <Text style={styles.buttonText}>{creating ? "Creando…" : "Crear categoría"}</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  city: { color: colors.blue, fontSize: 13, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: 2 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  description: { fontSize: 14, color: colors.muted, marginTop: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  empty: { fontSize: 13, color: colors.muted },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 10 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  cardSubtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  badgeBlue: { backgroundColor: colors.blue50, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBlueText: { fontSize: 10, fontWeight: "700", color: colors.blue },
  registerBtn: { marginTop: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 8, alignItems: "center" },
  registerBtnText: { fontSize: 12, fontWeight: "600", color: colors.ink },
  registered: { marginTop: 8, fontSize: 12, fontWeight: "700", color: colors.green },
  formCard: { backgroundColor: colors.mist, borderRadius: 16, padding: 14, marginTop: 12 },
  label: { fontSize: 11, fontWeight: "700", color: colors.muted, marginTop: 10, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", gap: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#fff" },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blue50 },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.blue, fontWeight: "700" },
  button: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
