import React from "react";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

const frequencyLabel: Record<string, string> = {
  DIARIO: "Todos los días",
  VARIAS_VECES_SEMANA: "Varias veces por semana",
  SEMANAL: "Una vez por semana",
  QUINCENAL: "Cada dos semanas",
  MENSUAL: "Una vez al mes",
  OCASIONAL: "Ocasional",
};

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
        </View>
        <View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.greenLight }]}>
          <Text style={[styles.statLabel, { color: colors.greenDark }]}>Nivel</Text>
          <Text style={[styles.statValue, { color: colors.greenDark }]}>{user.level.toFixed(2)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Brazo</Text>
          <Text style={styles.statValue}>{user.dominantArm === "IZQUIERDA" ? "Izq." : "Der."}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Frecuencia</Text>
          <Text style={[styles.statValue, { fontSize: 12 }]}>{frequencyLabel[user.frequency ?? ""] ?? "—"}</Text>
        </View>
      </View>

      <Pressable style={styles.menuRow} onPress={() => navigation.navigate("ClubAdmin")}>
        <Text style={styles.menuRowText}>Mi club</Text>
        <Text style={styles.menuRowChevron}>›</Text>
      </Pressable>

      {user.role === "PLATFORM_ADMIN" && (
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate("Admin")}>
          <Text style={styles.menuRowText}>Panel de administración</Text>
          <Text style={styles.menuRowChevron}>›</Text>
        </Pressable>
      )}

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 20 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  email: { fontSize: 13, color: colors.muted },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, backgroundColor: colors.mist, borderRadius: 12, padding: 10, alignItems: "center" },
  statLabel: { fontSize: 11, color: colors.muted, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: "700", color: colors.ink },
  menuRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuRowText: { fontSize: 14, fontWeight: "600", color: colors.ink },
  menuRowChevron: { fontSize: 16, color: colors.muted },
  logoutBtn: { marginTop: 28, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  logoutText: { fontSize: 13, fontWeight: "600", color: colors.ink },
});
