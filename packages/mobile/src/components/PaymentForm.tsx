import React, { useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../lib/api";
import { colors } from "../theme";

const methods = [
  { value: "PAGO_MOVIL", label: "Pago Móvil" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "ZELLE", label: "Zelle" },
  { value: "USDT", label: "USDT / Binance" },
] as const;

/**
 * En Venezuela no hay pasarela de cobro automatizada: el usuario reporta el
 * pago (Pago Móvil, transferencia, Zelle o USDT) con su referencia, y un
 * administrador lo concilia manualmente. Réplica de VenezuelaPaymentForm (web).
 */
export default function PaymentForm({
  purpose,
  relatedId,
  defaultAmount,
  onDone,
}: {
  purpose: "BOOKING" | "SPONSORSHIP" | "CLUB_PLAN";
  relatedId?: string;
  defaultAmount: number;
  onDone?: () => void;
}) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [currency, setCurrency] = useState<"USD" | "VES">("USD");
  const [method, setMethod] = useState<(typeof methods)[number]["value"]>("PAGO_MOVIL");
  const [reference, setReference] = useState("");
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickProof() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tus fotos para adjuntar el comprobante.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setProofUri(result.assets[0].uri);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payment = await api.submitPayment({ amount: Number(amount) || 0, currency, method, reference, purpose, relatedId });
      if (proofUri) {
        try {
          const formData = new FormData();
          const filename = proofUri.split("/").pop() || "comprobante.jpg";
          const ext = filename.split(".").pop()?.toLowerCase();
          const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
          formData.append("proof", { uri: proofUri, name: filename, type: mimeType } as any);
          await api.uploadPaymentProof(payment.id, formData);
        } catch {
          // El pago ya quedó registrado; el comprobante es un extra, no bloqueamos el flujo.
        }
      }
      setDone(true);
      onDone?.();
    } catch {
      setError("No se pudo registrar el pago. ¿Iniciaste sesión?");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <View style={styles.doneBox}>
        <Text style={styles.doneText}>Reporte de pago recibido. Un administrador lo verificará pronto.</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Monto"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <View style={{ flexDirection: "row", gap: 6 }}>
          {(["USD", "VES"] as const).map((c) => (
            <Pressable key={c} onPress={() => setCurrency(c)} style={[styles.chip, currency === c && styles.chipActive]}>
              <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.label}>Método de pago</Text>
      <View style={styles.wrapRow}>
        {methods.map((m) => (
          <Pressable key={m.value} onPress={() => setMethod(m.value)} style={[styles.chip, method === m.value && styles.chipActive]}>
            <Text style={[styles.chipText, method === m.value && styles.chipTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Número de referencia / comprobante</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. últimos 4 dígitos o ID de transacción"
        value={reference}
        onChangeText={setReference}
      />

      <Text style={styles.label}>Comprobante (foto, opcional)</Text>
      {proofUri ? (
        <View style={{ marginTop: 4 }}>
          <Image source={{ uri: proofUri }} style={{ width: 100, height: 100, borderRadius: 10 }} />
          <Pressable onPress={() => setProofUri(null)} style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: colors.blue }}>Quitar foto</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.chip} onPress={pickProof}>
          <Text style={styles.chipText}>Elegir foto</Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, { marginTop: 10 }]} disabled={submitting} onPress={submit}>
        <Text style={styles.buttonText}>{submitting ? "Enviando…" : "Reportar pago"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  label: { fontSize: 11, fontWeight: "700", color: colors.muted, marginTop: 12, marginBottom: 6, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: "#fff",
    color: colors.ink,
  },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fff" },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blue50 },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.blue, fontWeight: "700" },
  error: { color: "#DC2626", fontSize: 12, marginTop: 8 },
  button: { backgroundColor: colors.green, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  doneBox: { backgroundColor: colors.greenLight, borderRadius: 12, padding: 12 },
  doneText: { color: colors.greenDark, fontSize: 13 },
});
