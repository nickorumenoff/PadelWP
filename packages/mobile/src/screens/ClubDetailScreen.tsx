import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import type { Booking, Club, Court } from "@padel-ve/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ClubDetailScreen({ route, navigation }: any) {
  const { clubId } = route.params;
  const { user } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [slots, setSlots] = useState<Booking[]>([]);
  const date = todayIso();

  useEffect(() => {
    api.getClub(clubId).then((c) => {
      setClub(c);
      setSelectedCourt(c.courts?.[0] ?? null);
    });
  }, [clubId]);

  useEffect(() => {
    if (selectedCourt) api.listAvailability(selectedCourt.id, date).then(setSlots);
  }, [selectedCourt, date]);

  async function bookSlot(slot: Booking) {
    if (!user) {
      navigation.navigate("Perfil", { screen: "Login" });
      return;
    }
    if (!selectedCourt) return;
    try {
      const booking = await api.createBooking({
        courtId: selectedCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      await api.createMatch({ bookingId: booking.id, type: "OPEN", levelMin: 1, levelMax: 8 });
      Alert.alert("¡Listo!", `Reserva confirmada para las ${slot.startTime}. Se creó una partida abierta.`);
      navigation.navigate("Partidas");
    } catch {
      Alert.alert("No disponible", "Ese horario probablemente ya fue reservado.");
    }
  }

  if (!club) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Cargando club…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.city}>{club.city}</Text>
      <Text style={styles.title}>{club.name}</Text>
      <Text style={styles.description}>{club.description}</Text>

      <Text style={styles.sectionLabel}>Pistas</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {club.courts?.map((court) => (
          <Pressable
            key={court.id}
            onPress={() => setSelectedCourt(court)}
            style={[styles.courtChip, selectedCourt?.id === court.id && styles.courtChipActive]}
          >
            <Text style={[styles.courtChipText, selectedCourt?.id === court.id && styles.courtChipTextActive]}>
              {court.name} · ${court.pricePerHourUsd}/h
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Disponibilidad hoy ({date})</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {slots.map((slot) => (
          <Pressable
            key={slot.startTime}
            disabled={slot.status !== "AVAILABLE"}
            onPress={() => bookSlot(slot)}
            style={[styles.slot, slot.status !== "AVAILABLE" && styles.slotDisabled]}
          >
            <Text style={[styles.slotText, slot.status !== "AVAILABLE" && styles.slotTextDisabled]}>
              {slot.startTime}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  city: { color: colors.blue, fontSize: 13, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: 2 },
  description: { fontSize: 14, color: colors.muted, marginTop: 8, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginTop: 18, marginBottom: 8 },
  courtChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  courtChipActive: { borderColor: colors.blue, backgroundColor: colors.blue50 },
  courtChipText: { fontSize: 13, color: colors.ink },
  courtChipTextActive: { color: colors.blue, fontWeight: "700" },
  slot: {
    borderWidth: 1,
    borderColor: "rgba(47,158,99,0.4)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slotDisabled: { borderColor: colors.line, backgroundColor: colors.mist },
  slotText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  slotTextDisabled: { color: colors.muted },
});
