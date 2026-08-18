"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Match } from "@padel-ve/shared";
import { api } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import { useAuth } from "@/app/providers";

function MatchesInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");

  const [matches, setMatches] = useState<Match[]>([]);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listMatches(city ? { city } : undefined);
      setMatches(res);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin(matchId: string, team: 1 | 2) {
    if (!user) return;
    try {
      await api.joinMatch(matchId, team);
      load();
    } catch (e) {
      alert("No se pudo unir a la partida (puede que ya esté completa).");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Partidas abiertas</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex gap-2"
        >
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad" className="input w-40" />
          <button className="btn-outline">Filtrar</button>
        </form>
      </div>

      {!user && (
        <p className="rounded-lg bg-brand-blue-50 p-3 text-sm text-brand-blue">
          Inicia sesión para unirte a una partida.
        </p>
      )}

      {loading && <p className="text-sm text-muted">Cargando partidas…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && matches.length === 0 && (
        <p className="text-sm text-muted">No hay partidas abiertas todavía. Reserva una pista para crear una.</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} onJoin={handleJoin} highlighted={m.id === highlight} />
        ))}
      </div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
      <MatchesInner />
    </Suspense>
  );
}
