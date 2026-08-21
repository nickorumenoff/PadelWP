"use client";

import { useEffect, useState } from "react";
import type { Club, Sponsorship } from "@padel-ve/shared";
import { api } from "@/lib/api";
import ClubCard from "@/components/ClubCard";
import SponsorBanner from "@/components/SponsorBanner";
import AdSlotBanner from "@/components/AdSlotBanner";

export default function HomePage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(cityFilter?: string) {
    setLoading(true);
    setError(null);
    try {
      const [clubsRes, sponsorRes] = await Promise.all([
        api.listClubs(cityFilter ? { city: cityFilter } : undefined),
        api.listSponsorships(),
      ]);
      setClubs(clubsRes);
      setSponsorships(sponsorRes);
    } catch (e) {
      setError("No se pudo conectar con el servidor. ¿Está corriendo el backend?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-10">
      <section className="rounded-xl2 bg-gradient-to-br from-brand-blue to-brand-blue-light px-8 py-14 text-white shadow-soft">
        <p className="text-sm font-medium uppercase tracking-widest text-white/70">Pádel en Venezuela</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight md:text-4xl">
          Reserva tu pista, arma tu partida y juega hoy mismo.
        </h1>
        <p className="mt-3 max-w-xl text-white/80">
          Encuentra clubes cerca de ti, revisa disponibilidad en tiempo real y únete a partidas con jugadores de tu nivel.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(city || undefined);
          }}
          className="mt-6 flex max-w-md gap-2"
        >
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Busca por ciudad (ej. Caracas)"
            className="input flex-1 bg-white/95"
          />
          <button type="submit" className="btn-accent">
            Buscar
          </button>
        </form>
      </section>

      {sponsorships.length > 0 && <SponsorBanner sponsorships={sponsorships} />}

      <AdSlotBanner />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Clubes destacados</h2>
          <span className="text-sm text-muted">{clubs.length} resultado(s)</span>
        </div>

        {loading && <p className="text-sm text-muted">Cargando clubes…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && clubs.length === 0 && (
          <p className="text-sm text-muted">No hay clubes registrados todavía para esa ciudad.</p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      </section>
    </div>
  );
}
