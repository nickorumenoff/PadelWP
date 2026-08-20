import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { computePlayerLevel, type DominantArm, type PlayFrequency } from "@padel-ve/shared";
import { api, saveToken } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

const frequencyOptions: { value: PlayFrequency; label: string }[] = [
  { value: "DIARIO", label: "Todos los días" },
  { value: "VARIAS_VECES_SEMANA", label: "Varias veces/semana" },
  { value: "SEMANAL", label: "1 vez/semana" },
  { value: "QUINCENAL", label: "Cada 2 semanas" },
  { value: "MENSUAL", label: "1 vez/mes" },
  { value: "OCASIONAL", label: "Ocasional" },
];

const selfAssessmentOptions = [
  { value: 1 as const, label: "1 — Recién empiezo" },
  { value: 2 as const, label: "2 — Nivel básico" },
  { value: 3 as const, label: "3 — Juego regular" },
  { value: 4 as const, label: "4 — Avanzado" },
  { value: 5 as const, label: "5 — Competitivo" },
];

export default function RegisterScreen({ navigation }: any) {
  const { refresh } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("Caracas");
  const [gender, setGender] = useState<"MASCULINO" | "FEMENINO" | "">("");

  const [dominantArm, setDominantArm] = useState<DominantArm>("DERECHA");
  const [frequency, setFrequency] = useState<PlayFrequency>("SEMANAL");
  const [yearsPlaying, setYearsPlaying] = useState("1");
  const [selfAssessment, setSelfAssessment] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [competes, setCompetes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewLevel = useMemo(
    () =>
      computePlayerLevel({
        dominantArm,
        frequency,
        yearsPlaying: Number(yearsPlaying) || 0,
        selfAssessment,
        competes,
      }),
    [dominantArm, frequency, yearsPlaying, selfAssessment, competes]
  );

  async function onSubmit() {
    setError(null);
    try {
      const res = await api.register({
        name,
        email,
        password,
        city,
        gender: gender || undefined,
        dominantArm,
        frequency,
        yearsPlaying: Number(yearsPlaying) || 0,
        selfAssessment,
        competes,
      });
      await saveToken(res.token);
      await refresh();
    } catch {
      setError("No se pudo crear la cuenta. Verifica los datos.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Crea tu perfil de jugador</Text>
      <Text style={styles.subtitle}>Paso {step} de 2 — {step === 1 ? "tus datos" : "encuesta de nivel"}</Text>

      {step === 1 ? (
        <View style={{ marginTop: 16 }}>
          <TextInput style={styles.input} placeholder="Nombre completo" value={name} onChangeText={setName} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
          <TextInput style={styles.input} placeholder="Ciudad" value={city} onChangeText={setCity} />
          <Text style={styles.label}>Género (opcional, para torneos por categoría)</Text>
          <View style={styles.row}>
            {(["MASCULINO", "FEMENINO"] as const).map((v) => (
              <Pressable key={v} onPress={() => setGender(gender === v ? "" : v)} style={[styles.chip, gender === v && styles.chipActive]}>
                <Text style={[styles.chipText, gender === v && styles.chipTextActive]}>
                  {v === "MASCULINO" ? "Masculino" : "Femenino"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.button, { marginTop: 14 }]} onPress={() => setStep(2)}>
            <Text style={styles.buttonText}>Continuar a la encuesta</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.label}>Brazo dominante</Text>
          <View style={styles.row}>
            {(["DERECHA", "IZQUIERDA"] as DominantArm[]).map((v) => (
              <Pressable
                key={v}
                onPress={() => setDominantArm(v)}
                style={[styles.chip, dominantArm === v && styles.chipActive]}
              >
                <Text style={[styles.chipText, dominantArm === v && styles.chipTextActive]}>
                  {v === "DERECHA" ? "Derecha" : "Izquierda"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>¿Con qué frecuencia juegas?</Text>
          <View style={styles.wrapRow}>
            {frequencyOptions.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => setFrequency(o.value)}
                style={[styles.chip, frequency === o.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, frequency === o.value && styles.chipTextActive]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>¿Hace cuántos años juegas?</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={yearsPlaying}
            onChangeText={setYearsPlaying}
            placeholder="Ej. 0.5"
          />

          <Text style={styles.label}>¿Cómo describirías tu nivel?</Text>
          {selfAssessmentOptions.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => setSelfAssessment(o.value)}
              style={[styles.optionRow, selfAssessment === o.value && styles.optionRowActive]}
            >
              <Text style={styles.optionText}>{o.label}</Text>
            </Pressable>
          ))}

          <Text style={styles.label}>¿Compites en torneos o ligas?</Text>
          <View style={styles.row}>
            <Pressable onPress={() => setCompetes(true)} style={[styles.chip, competes && styles.chipActive]}>
              <Text style={[styles.chipText, competes && styles.chipTextActive]}>Sí</Text>
            </Pressable>
            <Pressable onPress={() => setCompetes(false)} style={[styles.chip, !competes && styles.chipActive]}>
              <Text style={[styles.chipText, !competes && styles.chipTextActive]}>No</Text>
            </Pressable>
          </View>

          <View style={styles.levelPreview}>
            <Text style={styles.levelPreviewLabel}>Tu nivel calculado (1.00 mejor — 8.00 principiante)</Text>
            <Text style={styles.levelPreviewValue}>{previewLevel.toFixed(2)}</Text>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.row}>
            <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setStep(1)}>
              <Text style={styles.secondaryButtonText}>Atrás</Text>
            </Pressable>
            <Pressable style={[styles.button, { flex: 1 }]} onPress={onSubmit}>
              <Text style={styles.buttonText}>Crear cuenta</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 20 },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginTop: 16, marginBottom: 8, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 10,
    color: colors.ink,
  },
  row: { flexDirection: "row", gap: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blue50 },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.blue, fontWeight: "700" },
  optionRow: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginBottom: 8 },
  optionRowActive: { borderColor: colors.blue, backgroundColor: colors.blue50 },
  optionText: { fontSize: 13, color: colors.ink },
  levelPreview: { backgroundColor: colors.greenLight, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8, marginBottom: 12 },
  levelPreviewLabel: { fontSize: 11, color: colors.greenDark, textAlign: "center" },
  levelPreviewValue: { fontSize: 24, fontWeight: "700", color: colors.greenDark, marginTop: 4 },
  error: { color: "#DC2626", fontSize: 13, marginBottom: 8 },
  button: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  secondaryButtonText: { color: colors.ink, fontWeight: "600", fontSize: 14 },
  link: { textAlign: "center", color: colors.blue, marginTop: 20, fontSize: 13, fontWeight: "600" },
});
