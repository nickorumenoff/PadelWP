import React, { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { AppNotification } from "@padel-ve/shared";
import { api } from "../lib/api";
import { colors } from "../theme";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = useCallback(() => {
    api.listNotifications().then(setNotifications).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function markRead(n: AppNotification) {
    if (n.read) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    api.markNotificationRead(n.id).catch(() => {});
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    api.markAllNotificationsRead().catch(() => {});
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <Pressable onPress={markAllRead} style={{ alignSelf: "flex-end", marginBottom: 8 }}>
          <Text style={styles.link}>Marcar todas leídas</Text>
        </Pressable>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No tienes notificaciones.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => markRead(item)} style={[styles.row, !item.read && styles.rowUnread]}>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString("es-VE")}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  row: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: "#fff" },
  rowUnread: { backgroundColor: colors.blue50, borderColor: colors.blue50 },
  message: { fontSize: 13, color: colors.ink },
  date: { fontSize: 11, color: colors.muted, marginTop: 4 },
  link: { fontSize: 12, fontWeight: "600", color: colors.blue },
});
