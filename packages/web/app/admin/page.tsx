"use client";

import { useEffect, useState } from "react";
import type { Club, Tournament } from "@padel-ve/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("Caracas");
  const [clubId, setClubId] = useState("");
  const [levelMin, setLevelMin] = useState(1);
  const [levelMax, setLevelMax] = useState(8);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(16);

  const isAdmin = user?.role === "PLATFORM_ADMIN";

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    Promise.all([api.listTournaments(), api.listClubs()])
      .then(([t, c]) => {
        setTournaments(t);
        setClubs(c);
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.createTournament({
        name,
        description: description || undefined,
        city,
        clubId: clubId || undefined,
        levelMin,
        levelMax,
        startDate,
        endDate: endDate || undefined,
        maxPlayers,
      });
      setTournaments((prev) => [created, ...prev]);
      setName("");
      setDescription("");
    } catch {
      setError("No se pudo crear el torneo. Verifica los datos (nivel mínimo/máximo y fecha).");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <p className="text-sm text-muted">Cargando…</p>;

  if (!user) {
    return <p className="text-sm text-muted">Inicia sesión para acceder al panel de administración.</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg card p-8">
        <h1 className="text-xl font-semibold text-ink">Acceso restringido</h1>
        <p className="mt-1 text-sm text-muted">
          Esta sección es solo para administradores de la plataforma Padel WP.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Panel de administración</h1>
        <p className="mt-1 text-sm text-muted">Habilita y publica torneos visibles para todos los jugadores.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-semibold text-ink">Nuevo torneo</h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <div>
              <label className="label">Nombre</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Ciudad</label>
                <input className="input" required value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="label">Club (opcional)</label>
                <select className="input" value={clubId} onChange={(e) => setClubId(e.target.value)}>
                  <option value="">Sin club asociado</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nivel mínimo</label>
                <input
                  className="input"
                  type="number"
                  step="0.5"
                  min={1}
                  max={8}
                  value={levelMin}
                  onChange={(e) => setLevelMin(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Nivel máximo</label>
                <input
                  className="input"
                  type="number"
                  step="0.5"
                  min={1}
                  max={8}
                  value={levelMax}
                  onChange={(e) => setLevelMax(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha de inicio</label>
                <input className="input" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de fin (opcional)</label>
                <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Cupo máximo de jugadores</label>
              <input
                className="input"
                type="number"
                min={4}
                max={256}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Publicando…" : "Publicar torneo"}
            </button>
          </form>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold text-ink">Torneos publicados</h2>
          <div className="mt-3 space-y-2">
            {loading && <p className="text-sm text-muted">Cargando…</p>}
            {!loading && tournaments.length === 0 && (
              <p className="text-sm text-muted">Aún no has publicado torneos.</p>
            )}
            {tournaments.map((t) => (
              <div key={t.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{t.name}</span>
                  <span className={`badge-${t.status === "OPEN" ? "green" : "blue"}`}>{t.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {t.city} · Nivel {t.levelMin.toFixed(1)}–{t.levelMax.toFixed(1)} · {t.startDate}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {t.registeredCount ?? 0}/{t.maxPlayers} inscritos
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
