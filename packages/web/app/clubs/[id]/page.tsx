"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Booking, Club, Court } from "@padel-ve/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const courtTypeLabel: Record<string, string> = {
  CRISTAL: "Cristal",
  MURO: "Muro",
  PANORAMICA: "Panorámica",
};

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<Booking[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getClub(id).then((c) => {
      setClub(c);
      setSelectedCourt(c.courts?.[0] ?? null);
    });
  }, [id]);

  useEffect(() => {
    if (!selectedCourt) return;
    setLoadingSlots(true);
    api
      .listAvailability(selectedCourt.id, date)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [selectedCourt, date]);

  async function bookSlot(slot: Booking) {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!selectedCourt) return;
    setMessage(null);
    try {
      const booking = await api.createBooking({
        courtId: selectedCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      setMessage("¡Reserva confirmada! ¿Quieres crear una partida abierta para que otros se unan?");
      const created = await api.createMatch({ bookingId: booking.id, type: "OPEN", levelMin: 1, levelMax: 8 });
      setMessage(`Reserva y partida creadas para el ${slot.date} a las ${slot.startTime}.`);
      router.push(`/matches?highlight=${created.id}`);
    } catch (e: any) {
      setMessage("No se pudo reservar ese horario, probablemente ya fue tomado.");
    }
  }

  if (!club) return <p className="text-sm text-muted">Cargando club…</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-brand-blue">{club.city}</p>
        <h1 className="text-2xl font-semibold text-ink">{club.name}</h1>
        <p className="mt-2 max-w-2xl text-muted">{club.description}</p>
        <p className="mt-1 text-sm text-muted">{club.address}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <p className="label !mb-2">Pistas</p>
          {club.courts?.map((court) => (
            <button
              key={court.id}
              onClick={() => setSelectedCourt(court)}
              className={`card block w-full p-3 text-left text-sm transition-colors ${
                selectedCourt?.id === court.id ? "border-brand-blue bg-brand-blue-50" : ""
              }`}
            >
              <p className="font-medium text-ink">{court.name}</p>
              <p className="text-xs text-muted">
                {courtTypeLabel[court.type]} · {court.indoor ? "Techada" : "Al aire libre"}
              </p>
              <p className="mt-1 text-sm font-medium text-brand-blue">${court.pricePerHourUsd}/h</p>
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="label !mb-0">Disponibilidad</p>
            <input
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="input w-auto"
            />
          </div>

          {message && (
            <p className="mt-3 rounded-lg bg-brand-green-light p-3 text-sm text-brand-green-dark">{message}</p>
          )}

          {loadingSlots ? (
            <p className="mt-4 text-sm text-muted">Cargando horarios…</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot.startTime}
                  disabled={slot.status !== "AVAILABLE"}
                  onClick={() => bookSlot(slot)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    slot.status === "AVAILABLE"
                      ? "border-brand-green/40 bg-white text-ink hover:border-brand-green hover:bg-brand-green-light"
                      : "cursor-not-allowed border-line bg-mist text-muted"
                  }`}
                >
                  {slot.startTime}
                </button>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-muted">
            Al reservar se crea automáticamente una partida abierta para que otros jugadores puedan unirse. Puedes
            gestionarla después desde la sección de Partidas.
          </p>
        </div>
      </div>
    </div>
  );
}
