import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import type { Sponsorship } from "@padel-ve/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import PaymentForm from "../components/PaymentForm";
import AdSlotBanner from "../components/AdSlotBanner";

const PLANS = ["Banner destacado - 1 mes", "Club destacado - 1 mes", "Club premium - 3 meses"];

export default function SponsorsScreen() {
  const { user } = useAuth();
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [sponsorName, setSponsorName] = useState("");
  const [planName, setPlanName] = useState(PLANS[0]);
  const [linkUrl, setLinkUrl] = useState("");
  const [created, setCreated] = useState<Sponsorship | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listSponsorships().then(setSponsorships).catch(() => {});
  }, []);

  async function requestSponsorship() {
    if (!user) return;
    setError(null);
    try {
      const s = await api.requestSponsorship({ sponsorName, planName, linkUrl });
      setCreated(s);
    } catch {
      setError("No se pudo enviar la solicitud.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Espacio de patrocinadores</Text>
      <Text style={styles.helperText}>
        Marcas y negocios pueden pagar por presencia destacada dentro de Padel WP: banners, posicionamiento y
        promociones dirigidas a jugadores de pádel en toda Venezuela.
      </Text>

      <AdSlotBanner />

      <Text style={styles.sectionLabel}>Patrocinadores activos</Text>
      {sponsorships.length === 0 && <Text style={styles.helperText}>Todavía no hay patrocinadores activos.</Text>}
      {sponsorships.map((s) => (
        <View key={s.id} style={styles.sponsorRow}>
          <Text style={styles.sponsorName}>{s.sponsorName}</Text>
          <Text style={styles.helperText}>{s.planName}</Text>
          {!!s.bannerUrl && <Image source={{ uri: s.bannerUrl }} style={styles.banner} />}
        </View>
      ))}

      <Text style={styles.sectionLabel}>Quiero patrocinar / destacar mi club</Text>
      <Text style={styles.helperText}>
        Completa la solicitud y reporta el pago. Un administrador la activará al conciliar el pago.
      </Text>

      {!user ? (
        <Text style={styles.helperText}>Inicia sesión para solicitar un espacio de patrocinio.</Text>
      ) : !created ? (
        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la marca / negocio"
            value={sponsorName}
            onChangeText={setSponsorName}
          />
          <View style={styles.wrapRow}>
            {PLANS.map((p) => (
              <Pressable key={p} onPress={() => setPlanName(p)} style={[styles.chip, planName === p && styles.chipActive]}>
                <Text style={[styles.chipText, planName === p && styles.chipTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Enlace (opcional)" value={linkUrl} onChangeText={setLinkUrl} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={[styles.button, { marginTop: 10 }]} onPress={requestSponsorship}>
            <Text style={styles.buttonText}>Continuar al pago</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.helperText}>
            Solicitud creada para {created.sponsorName}. Reporta el pago para activarla.
          </Text>
          <PaymentForm purpose="SPONSORSHIP" relatedId={created.id} defaultAmount={150} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  helperText: { fontSize: 12, color: colors.muted, marginTop: 6 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  sponsorRow: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, marginBottom: 8 },
  sponsorName: { fontSize: 13, fontWeight: "700", color: colors.ink },
  banner: { marginTop: 8, height: 64, width: "100%", borderRadius: 10 },
  formCard: { backgroundColor: colors.mist, borderRadius: 16, padding: 14, marginTop: 4 },
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
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fff" },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blue50 },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.blue, fontWeight: "700" },
  button: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  error: { color: "#DC2626", fontSize: 12, marginTop: 8 },
});
