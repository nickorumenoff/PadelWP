import React, { useState } from "react";
import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    try {
      await login(email, password);
    } catch {
      setError("Email o contraseña incorrectos.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inicia sesión</Text>
      <Text style={styles.subtitle}>Entra para reservar pistas y unirte a partidas.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={onSubmit}>
        <Text style={styles.buttonText}>Entrar</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
      </Pressable>

      <Text style={styles.hint}>Usuario de prueba: maria@example.com / padel123</Text>
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
  hint: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 24 },
});
