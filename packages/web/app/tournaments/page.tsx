"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Tournament } from "@padel-ve/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listTournaments(city ? { city } : undefined);
      setTournaments(res);
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

  async function handleRegister(id: string) {
    if (!user) return;
    setRegisteringId(id);
    try {
      await api.registerForTournament(id);
      await load();
    } catch (e: any) {
      alert("No se pudo completar la inscripción. Verifica el cupo y tu nivel de juego.");
    } finally {
      setRegisteringId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Torneos</h1>
          <p className="mt-1 text-sm text-muted">Torneos publicados por clubes y administradores de Padel WP.</p>
        </div>
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
          Inicia sesión para inscribirte en un torneo.
        </p>
      )}

      {loading && <p className="text-sm text-muted">Cargando torneos…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && tournaments.length === 0 && (
        <p className="text-sm text-muted">Todavía no hay torneos publicados.</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tournaments.map((t) => {
          const full = (t.registeredCount ?? 0) >= t.maxPlayers;
          const outOfLevel = user ? user.level < t.levelMin || user.level > t.levelMax : false;
          return (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/tournaments/${t.id}`} className="font-medium text-ink hover:text-brand-blue hover:underline">
                    {t.name}
                  </Link>
                  <p className="text-sm text-muted">{t.city}</p>
                </div>
                <span className="badge-blue">
                  Nivel {t.levelMin.toFixed(1)}–{t.levelMax.toFixed(1)}
                </span>
              </div>

              {t.description && <p className="mt-2 text-sm text-muted">{t.description}</p>}

              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>
                  {t.startDate}
                  {t.endDate ? ` – ${t.endDate}` : ""}
                </span>
                <span>
                  {t.registeredCount ?? 0}/{t.maxPlayers} inscritos
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`badge-${t.status === "OPEN" ? "green" : "blue"}`}>{t.status}</span>
                {t.isRegistered ? (
                  <span className="text-xs font-medium text-brand-green">Ya estás inscrito</span>
                ) : (
                  <button
                    className="btn-outline !py-1.5 text-xs"
                    disabled={!user || t.status !== "OPEN" || full || outOfLevel || registeringId === t.id}
                    onClick={() => handleRegister(t.id)}
                  >
                    {registeringId === t.id
                      ? "Inscribiendo…"
                      : full
                        ? "Cupo lleno"
                        : outOfLevel
                          ? "Fuera de tu nivel"
                          : "Inscribirme"}
                  </button>
                )}
              </div>

              <Link
                href={`/tournaments/${t.id}`}
                className="mt-3 block text-center text-xs font-medium text-brand-blue hover:underline"
              >
                Ver categorías y llave del torneo
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
