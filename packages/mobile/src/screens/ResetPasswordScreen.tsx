import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { api } from "../lib/api";
import { colors } from "../theme";

export default function ResetPasswordScreen({ navigation }: any) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!token) {
      setError("Pega el código que recibiste para restablecer tu contraseña.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(token, password);
      Alert.alert("¡Listo!", "Tu contraseña fue actualizada. Ahora puedes iniciar sesión.");
      navigation.navigate("Login");
    } catch {
      setError("El código no es válido o expiró. Solicita uno nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restablecer contraseña</Text>
      <Text style={styles.subtitle}>Pega el código de recuperación y elige tu nueva contraseña.</Text>

      <TextInput
        style={styles.input}
        placeholder="Código de recuperación"
        autoCapitalize="none"
        value={token}
        onChangeText={setToken}
      />
      <TextInput
        style={styles.input}
        placeholder="Nueva contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmar contraseña"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} disabled={submitting} onPress={onSubmit}>
        <Text style={styles.buttonText}>{submitting ? "Guardando…" : "Guardar contraseña"}</Text>
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
  error: { color: "#DC2626", fontSize: 13, marginBottom: 8 },
  button: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  link: { textAlign: "center", color: colors.blue, marginTop: 18, fontSize: 13, fontWeight: "600" },
});
