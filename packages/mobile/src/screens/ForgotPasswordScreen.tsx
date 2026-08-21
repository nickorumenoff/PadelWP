import React, { useState } from "react";
import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { api } from "../lib/api";
import { colors } from "../theme";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
    } catch {
      // Intencional: no revelamos si el email existe o no.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar contraseña</Text>
      <Text style={styles.subtitle}>Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</Text>

      {sent ? (
        <View style={styles.doneBox}>
          <Text style={styles.doneText}>
            Si ese email está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.
          </Text>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Pressable style={styles.button} disabled={submitting} onPress={onSubmit}>
            <Text style={styles.buttonText}>{submitting ? "Enviando…" : "Enviar enlace"}</Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={() => navigation.navigate("ResetPassword")}>
        <Text style={styles.link}>Ya tengo un código de recuperación</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Volver a iniciar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 24, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
    color: colors.ink,
  },
  button: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  link: { textAlign: "center", color: colors.blue, marginTop: 18, fontSize: 13, fontWeight: "600" },
  doneBox: { backgroundColor: colors.blue50, borderRadius: 12, padding: 14 },
  doneText: { color: colors.blue, fontSize: 13 },
});
