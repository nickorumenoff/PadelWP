import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View, StyleSheet } from "react-native";
import type { Booking, Club, CourtType } from "@padel-ve/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import PaymentForm from "../components/PaymentForm";

const COURT_TYPE_LABEL: Record<string, string> = {
  CRISTAL: "Cristal (vidrio)",
  MURO: "Muro",
  PANORAMICA: "Panorámica",
};
const COURT_TYPES: CourtType[] = ["CRISTAL", "MURO", "PANORAMICA"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export default function ClubAdminScreen() {
  const { user } = useAuth();
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Caracas");

  const [courtName, setCourtName] = useState("Pista 1");
  const [courtType, setCourtType] = useState<CourtType>("CRISTAL");
  const [indoor, setIndoor] = useState(false);
  const [lighting, setLighting] = useState(false);
  const [price, setPrice] = useState("20");

  const [openHour, setOpenHour] = useState(8);
  const [closeHour, setCloseHour] = useState(22);
  const [savingHours, setSavingHours] = useState(false);
  const [showPlanPayment, setShowPlanPayment] = useState(false);

  async function load() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const clubs = await api.listClubs();
      const club = clubs.find((c) => c.ownerId === user.id) ?? null;
      setMyClub(club);
      if (club) {
        setOpenHour(club.openHour);
        setCloseHour(club.closeHour);
        try {
          setBookings(await api.listClubBookings(club.id));
        } catch {
          // sin reservas todavía
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function createClub() {
    try {
      const club = await api.createClub({ name, description, address, city });
      setMyClub(club);
    } catch {
      Alert.alert("No se pudo crear el club", "Revisa los datos.");
    }
  }

  async function addCourt() {
    if (!myClub) return;
    try {
      await api.addCourt(myClub.id, { name: courtName, type: courtType, indoor, lighting, pricePerHourUsd: Number(price) || 0 });
      setMyClub(await api.getClub(myClub.id));
    } catch {
      Alert.alert("No se pudo añadir la pista", "Revisa los datos.");
    }
  }

  async function saveHours() {
    if (!myClub) return;
    setSavingHours(true);
    try {
      const updated = await api.updateClubHours(myClub.id, { openHour, closeHour });
      setMyClub({ ...updated, courts: myClub.courts });
    } catch {
      Alert.alert("No se pudo actualizar el horario", "El cierre debe ser posterior a la apertura.");
    } finally {
      setSavingHours(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Inicia sesión para administrar tu club.</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Cargando…</Text>
      </View>
    );
  }

  if (!myClub) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Registra tu club</Text>
        <Text style={styles.helperText}>
          Da de alta tu club para publicar tus pistas y recibir reservas de jugadores en toda Venezuela.
        </Text>
        <TextInput style={styles.input} placeholder="Nombre del club" value={name} onChangeText={setName} />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Descripción"
          multiline
          value={description}
          onChangeText={setDescription}
        />
        <TextInput style={styles.input} placeholder="Dirección" value={address} onChangeText={setAddress} />
        <TextInput style={styles.input} placeholder="Ciudad" value={city} onChangeText={setCity} />
        <Pressable style={[styles.button, { marginTop: 8 }]} onPress={createClub}>
          <Text style={styles.buttonText}>Crear club</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.badgeBlue}>
        <Text style={styles.badgeBlueText}>{myClub.visibilityPlan === "NONE" ? "Sin plan destacado" : myClub.visibilityPlan}</Text>
      </View>
      <Text style={styles.title}>{myClub.name}</Text>
      <Text style={styles.helperText}>
        {myClub.address}, {myClub.city}
      </Text>

      <Text style={styles.sectionLabel}>Pistas</Text>
      {myClub.courts?.map((c) => (
        <View key={c.id} style={styles.courtRow}>
          <View style={styles.courtHeaderRow}>
            <Text style={styles.courtName}>{c.name}</Text>
            <Text style={styles.courtPrice}>${c.pricePerHourUsd}/h</Text>
          </View>
          <View style={styles.wrapRow}>
            <View style={styles.badgeBlueSmall}>
              <Text style={styles.badgeBlueSmallText}>{COURT_TYPE_LABEL[c.type] ?? c.type}</Text>
            </View>
            {c.indoor && (
              <View style={styles.badgeGreenSmall}>
                <Text style={styles.badgeGreenSmallText}>Techada</Text>
              </View>
            )}
            {c.lighting && (
              <View style={styles.badgeGreenSmall}>
                <Text style={styles.badgeGreenSmallText}>Iluminada</Text>
              </View>
            )}
          </View>
        </View>
      ))}
      {(!myClub.courts || myClub.courts.length === 0) && <Text style={styles.helperText}>Aún no has añadido pistas.</Text>}

      <View style={styles.formCard}>
        <Text style={styles.formCardTitle}>Añadir pista</Text>
        <TextInput style={styles.input} placeholder="Nombre" value={courtName} onChangeText={setCourtName} />
        <View style={styles.wrapRow}>
          {COURT_TYPES.map((t) => (
            <Pressable key={t} onPress={() => setCourtType(t)} style={[styles.chip, courtType === t && styles.chipActive]}>
              <Text style={[styles.chipText, courtType === t && styles.chipTextActive]}>{COURT_TYPE_LABEL[t]}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Precio/hora USD"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Techada</Text>
          <Switch value={indoor} onValueChange={setIndoor} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Iluminada (para jugar de noche)</Text>
          <Switch value={lighting} onValueChange={setLighting} />
        </View>
        <Pressable style={[styles.button, { marginTop: 8 }]} onPress={addCourt}>
          <Text style={styles.buttonText}>Añadir pista</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Horario del club</Text>
      <Text style={styles.helperText}>
        Define entre qué horas se pueden reservar tus pistas. Los jugadores solo verán franjas dentro de este rango.
      </Text>
      <Text style={styles.label}>Abre</Text>
      <View style={styles.wrapRow}>
        {HOURS.map((h) => (
          <Pressable key={h} onPress={() => setOpenHour(h)} style={[styles.chip, openHour === h && styles.chipActive]}>
            <Text style={[styles.chipText, openHour === h && styles.chipTextActive]}>{String(h).padStart(2, "0")}:00</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Cierra</Text>
      <View style={styles.wrapRow}>
        {HOURS.map((h) => h + 1).map((h) => (
          <Pressable key={h} onPress={() => setCloseHour(h)} style={[styles.chip, closeHour === h && styles.chipActive]}>
            <Text style={[styles.chipText, closeHour === h && styles.chipTextActive]}>{String(h % 24).padStart(2, "0")}:00</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={[styles.button, { marginTop: 10 }]} disabled={savingHours} onPress={saveHours}>
        <Text style={styles.buttonText}>{savingHours ? "Guardando…" : "Guardar horario"}</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Reservas</Text>
      <Text style={styles.helperText}>Reservas hechas por jugadores en tus pistas.</Text>
      {bookings.map((b) => (
        <View key={b.id} style={styles.listRow}>
          <Text style={styles.listRowText}>
            {b.date} · {b.startTime}–{b.endTime}
          </Text>
          <View style={b.status === "BOOKED" ? styles.badgeGreenSmall : styles.badgeBlueSmall}>
            <Text style={b.status === "BOOKED" ? styles.badgeGreenSmallText : styles.badgeBlueSmallText}>{b.status}</Text>
          </View>
        </View>
      ))}
      {bookings.length === 0 && <Text style={styles.helperText}>Aún no tienes reservas.</Text>}

      <Text style={styles.sectionLabel}>Visibilidad destacada</Text>
      <Text style={styles.helperText}>
        Paga por un plan de visibilidad para que tu club aparezca primero en los resultados de búsqueda.
      </Text>
      {!showPlanPayment ? (
        <Pressable style={[styles.buttonAccent, { marginTop: 10 }]} onPress={() => setShowPlanPayment(true)}>
          <Text style={styles.buttonText}>Contratar plan destacado</Text>
        </Pressable>
      ) : (
        <View style={{ marginTop: 10 }}>
          <PaymentForm purpose="CLUB_PLAN" relatedId={myClub.id} defaultAmount={80} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: 4 },
  helperText: { fontSize: 12, color: colors.muted, marginTop: 6 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: "700", color: colors.muted, marginTop: 10, marginBottom: 6, textTransform: "uppercase" },
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
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fff" },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blue50 },
  chipText: { fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.blue, fontWeight: "700" },
  button: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  buttonAccent: { backgroundColor: colors.green, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  badgeBlue: { alignSelf: "flex-start", backgroundColor: colors.blue50, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBlueText: { fontSize: 11, fontWeight: "700", color: colors.blue },
  badgeBlueSmall: { backgroundColor: colors.blue50, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBlueSmallText: { fontSize: 10, fontWeight: "700", color: colors.blue },
  badgeGreenSmall: { backgroundColor: colors.greenLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreenSmallText: { fontSize: 10, fontWeight: "700", color: colors.greenDark },
  courtRow: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginBottom: 8 },
  courtHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  courtName: { fontSize: 13, fontWeight: "700", color: colors.ink },
  courtPrice: { fontSize: 12, color: colors.muted },
  formCard: { backgroundColor: colors.mist, borderRadius: 16, padding: 14, marginTop: 12 },
  formCardTitle: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  switchLabel: { fontSize: 12, color: colors.ink },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  listRowText: { fontSize: 12, color: colors.ink },
});
