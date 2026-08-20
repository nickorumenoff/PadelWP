import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import type { Club, Tournament } from "@padel-ve/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export default function AdminScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "PLATFORM_ADMIN";

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("Caracas");
  const [clubId, setClubId] = useState("");
  const [levelMin, setLevelMin] = useState("1");
  const [levelMax, setLevelMax] = useState("8");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("16");

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    Promise.all([api.listTournaments(), api.listClubs()])
      .then(([t, c]) => {
        setTournaments(t);
        setClubs(c);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function handleCreate() {
    setSubmitting(true);
    try {
      const created = await api.createTournament({
        name,
        description: description || undefined,
        city,
        clubId: clubId || undefined,
        levelMin: Number(levelMin) || 1,
        levelMax: Number(levelMax) || 8,
        startDate,
        endDate: endDate || undefined,
        maxPlayers: Number(maxPlayers) || 16,
      });
      setTournaments((prev) => [created, ...prev]);
      setName("");
      setDescription("");
    } catch {
      Alert.alert("No se pudo crear el torneo", "Verifica el nivel mínimo/máximo y la fecha (AAAA-MM-DD).");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Inicia sesión para acceder al panel de administración.</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.restrictedTitle}>Acceso restringido</Text>
        <Text style={styles.helperText}>Esta sección es solo para administradores de la plataforma Padel WP.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Panel de administración</Text>
      <Text style={styles.helperText}>Habilita y publica torneos visibles para todos los jugadores.</Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>Nuevo torneo</Text>
        <TextInput style={styles.input} placeholder="Nombre" value={name} onChangeText={setName} />
        <TextInput
          style={[styles.input, { height: 70 }]}
          placeholder="Descripción"
          multiline
          value={description}
          onChangeText={setDescription}
        />
        <TextInput style={styles.input} placeholder="Ciudad" value={city} onChangeText={setCity} />

        <Text style={styles.label}>Club (opcional)</Text>
        <View style={styles.wrapRow}>
          <Pressable onPress={() => setClubId("")} style={[styles.chip, clubId === "" && styles.chipActive]}>
            <Text style={[styles.chipText, clubId === "" && styles.chipTextActive]}>Sin club asociado</Text>
          </Pressable>
          {clubs.map((c) => (
            <Pressable key={c.id} onPress={() => setClubId(c.id)} style={[styles.chip, clubId === c.id && styles.chipActive]}>
              <Text style={[styles.chipText, clubId === c.id && styles.chipTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Nivel mínimo"
            keyboardType="decimal-pad"
            value={levelMin}
            onChangeText={setLevelMin}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Nivel máximo"
            keyboardType="decimal-pad"
            value={levelMax}
            onChangeText={setLevelMax}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Inicio AAAA-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Fin (opcional)"
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Cupo máximo de jugadores"
          keyboardType="number-pad"
          value={maxPlayers}
          onChangeText={setMaxPlayers}
        />

        <Pressable style={[styles.button, { marginTop: 10 }]} disabled={submitting} onPress={handleCreate}>
          <Text style={styles.buttonText}>{submitting ? "Publicando…" : "Publicar torneo"}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Torneos publicados</Text>
      {loading && <Text style={styles.helperText}>Cargando…</Text>}
      {!loading && tournaments.length === 0 && <Text style={styles.helperText}>Aún no has publicado torneos.</Text>}
      {tournaments.map((t) => (
        <View key={t.id} style={styles.listRow}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>{t.name}</Text>
            <View style={t.status === "OPEN" ? styles.badgeGreen : styles.badgeBlue}>
              <Text style={t.status === "OPEN" ? styles.badgeGreenText : styles.badgeBlueText}>{t.status}</Text>
            </View>
          </View>
          <Text style={styles.listMeta}>
            {t.city} · Nivel {t.levelMin.toFixed(1)}–{t.levelMax.toFixed(1)} · {t.startDate}
          </Text>
          <Text style={styles.listMeta}>
            {t.registeredCount ?? 0}/{t.maxPlayers} inscritos
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper, padding: 24 },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  restrictedTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, marginBottom: 6 },
  helperText: { fontSize: 12, color: colors.muted, marginTop: 6, textAlign: "center" },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: "700", color: colors.muted, marginTop: 10, marginBottom: 6, textTransform: "uppercase" },
  formCard: { backgroundColor: colors.mist, borderRadius: 16, padding: 14, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginTop: 8,
    backgroundColor: "#fff",
    color: colors.ink,
  },
  row: { flexDirection: "row", gap: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fff" },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blue50 },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.blue, fontWeight: "700" },
  button: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  badgeBlue: { backgroundColor: colors.blue50, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBlueText: { fontSize: 10, fontWeight: "700", color: colors.blue },
  badgeGreen: { backgroundColor: colors.greenLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreenText: { fontSize: 10, fontWeight: "700", color: colors.greenDark },
  listRow: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginBottom: 8 },
  listHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  listTitle: { fontSize: 13, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  listMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
