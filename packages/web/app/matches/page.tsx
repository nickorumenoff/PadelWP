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
  const [myMatches, setMyMatches] = useState<Match[]>([]);
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

  async function loadMine() {
    if (!user) {
      setMyMatches([]);
      return;
    }
    try {
      const res = await api.listMyMatches();
      setMyMatches(res);
    } catch {
      // silencioso: la sección de "mis partidas" es secundaria
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleJoin(matchId: string, team: 1 | 2) {
    if (!user) return;
    try {
      await api.joinMatch(matchId, team);
      load();
      loadMine();
    } catch (e) {
      alert("No se pudo unir a la partida (puede que ya esté completa).");
    }
  }

  async function handleSubmitResult(matchId: string, winnerTeam: 1 | 2) {
    try {
      await api.submitMatchResult(matchId, winnerTeam);
      load();
      loadMine();
    } catch {
      alert("No se pudo registrar el resultado.");
    }
  }

  const pendingResult = myMatches.filter((m) => m.status === "FULL");
  const completed = myMatches.filter((m) => m.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Partidas</h1>
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

      {user && pendingResult.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">Mis partidas · reportar resultado</h2>
          <p className="mb-3 text-sm text-muted">
            Estas partidas ya tienen los 4 jugadores confirmados. Cualquiera de los participantes puede reportar
            quién ganó; el nivel de los 4 jugadores se ajustará automáticamente según el resultado.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pendingResult.map((m) => (
              <MatchCard key={m.id} match={m} onSubmitResult={handleSubmitResult} />
            ))}
          </div>
        </section>
      )}

      {user && completed.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">Mis partidas jugadas</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {completed.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Partidas abiertas</h2>
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
