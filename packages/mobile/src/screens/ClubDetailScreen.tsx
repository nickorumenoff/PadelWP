import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import type { Booking, Club, Court, Review } from "@padel-ve/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

function Stars({
  value,
  onChange,
  size = 14,
}: {
  value: number;
  onChange?: (v: 1 | 2 | 3 | 4 | 5) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {([1, 2, 3, 4, 5] as const).map((s) => (
        <Pressable key={s} disabled={!onChange} onPress={() => onChange?.(s)}>
          <Text style={{ fontSize: size, color: value >= s ? "#F5A623" : colors.line }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

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

  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState<1 | 2 | 3 | 4 | 5 | 0>(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  function loadClub() {
    api.getClub(clubId).then((c) => {
      setClub(c);
      setSelectedCourt((prev) => prev ?? c.courts?.[0] ?? null);
    });
  }

  function loadReviews() {
    api.listClubReviews(clubId).then((rs) => {
      setReviews(rs);
      const mine = rs.find((r) => r.userId === user?.id);
      if (mine) {
        setMyRating(mine.rating);
        setMyComment(mine.comment ?? "");
      }
    });
  }

  useEffect(() => {
    loadClub();
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  useEffect(() => {
    if (selectedCourt) api.listAvailability(selectedCourt.id, date).then(setSlots);
  }, [selectedCourt, date]);

  async function submitReview() {
    if (!user) {
      navigation.navigate("Perfil", { screen: "Login" });
      return;
    }
    if (!myRating) {
      Alert.alert("Elige una calificación", "Selecciona de 1 a 5 estrellas.");
      return;
    }
    setSubmittingReview(true);
    try {
      await api.createClubReview(clubId, { rating: myRating, comment: myComment || undefined });
      loadReviews();
      loadClub();
      Alert.alert("¡Gracias!", "Tu reseña fue enviada.");
    } catch {
      Alert.alert("No se pudo enviar la reseña.");
    } finally {
      setSubmittingReview(false);
    }
  }

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
      {!!club.reviewCount && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Stars value={club.avgRating ?? 0} />
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {club.avgRating?.toFixed(1)} · {club.reviewCount} reseña{club.reviewCount === 1 ? "" : "s"}
          </Text>
        </View>
      )}
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

      <Text style={styles.sectionLabel}>Reseñas</Text>
      {user ? (
        <View style={styles.reviewForm}>
          <Stars value={myRating} onChange={setMyRating} size={22} />
          <TextInput
            style={[styles.input, { marginTop: 10, height: 70 }]}
            placeholder="Cuéntanos tu experiencia (opcional)"
            multiline
            value={myComment}
            onChangeText={setMyComment}
          />
          <Pressable style={[styles.button, { marginTop: 10 }]} disabled={submittingReview} onPress={submitReview}>
            <Text style={styles.buttonText}>{submittingReview ? "Enviando…" : "Enviar reseña"}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.helperText}>Inicia sesión para dejar una reseña de este club.</Text>
      )}

      <View style={{ marginTop: 12, gap: 8 }}>
        {reviews.length === 0 && <Text style={styles.helperText}>Todavía no hay reseñas para este club.</Text>}
        {reviews.map((r) => (
          <View key={r.id} style={styles.reviewRow}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>{r.user?.name ?? "Jugador"}</Text>
              <Stars value={r.rating} />
            </View>
            {!!r.comment && <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{r.comment}</Text>}
          </View>
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
  helperText: { fontSize: 12, color: colors.muted, marginTop: 6 },
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
  button: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  reviewForm: { backgroundColor: colors.mist, borderRadius: 16, padding: 14, marginTop: 4 },
  reviewRow: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
});
