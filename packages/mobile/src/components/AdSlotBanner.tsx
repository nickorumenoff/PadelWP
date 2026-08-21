import React, { useEffect, useState } from "react";
import { Image, Linking, Pressable, Text, View, StyleSheet } from "react-native";
import type { AdSlot } from "@padel-ve/shared";
import { api, API_BASE_URL } from "../lib/api";
import { colors } from "../theme";

function resolveUploadUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Espacios publicitarios activos (hasta 4, gestionados solo por el admin de
 * plataforma). Coexiste con Sponsorship: sin seguimiento de pago, solo
 * contenido con interruptor on/off. Réplica de AdSlotBanner (web).
 */
export default function AdSlotBanner() {
  const [slots, setSlots] = useState<AdSlot[]>([]);

  useEffect(() => {
    api
      .listAdSlots()
      .then(setSlots)
      .catch(() => setSlots([]));
  }, []);

  if (slots.length === 0) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      {slots.map((slot) => (
        <Pressable
          key={slot.id}
          style={styles.card}
          onPress={() => slot.linkUrl && Linking.openURL(slot.linkUrl)}
          disabled={!slot.linkUrl}
        >
          {!!slot.imageUrl && <Image source={{ uri: resolveUploadUrl(slot.imageUrl) }} style={styles.image} />}
          <View style={{ flex: 1 }}>
            {!!slot.title && (
              <Text style={styles.title} numberOfLines={1}>
                {slot.title}
              </Text>
            )}
            {!!slot.text && (
              <Text style={styles.text} numberOfLines={2}>
                {slot.text}
              </Text>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 8,
  },
  image: { width: 56, height: 56, borderRadius: 10 },
  title: { fontSize: 14, fontWeight: "700", color: colors.ink },
  text: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
