"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Club, GenderCategory, Tournament, TournamentCategory } from "@padel-ve/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";

const BRACKET_SIZES = [4, 8, 16, 32, 64] as const;
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

const genderLabel: Record<GenderCategory, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  MIXTO: "Mixto",
};

const statusLabel: Record<TournamentCategory["status"], string> = {
  REGISTRATION: "Inscripciones abiertas",
  GROUPS: "Fase de grupos",
  KNOCKOUT: "Llave (eliminación directa)",
  COMPLETED: "Finalizada",
};

const statusBadge: Record<TournamentCategory["status"], string> = {
  REGISTRATION: "badge-blue",
  GROUPS: "badge-yellow",
  KNOCKOUT: "badge-purple",
  COMPLETED: "badge-green",
};

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [categories, setCategories] = useState<TournamentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [genderCategory, setGenderCategory] = useState<GenderCategory>("MASCULINO");
  const [level, setLevel] = useState(3);
  const [bracketSize, setBracketSize] = useState<(typeof BRACKET_SIZES)[number]>(8);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canManage = !!user && (user.role === "PLATFORM_ADMIN" || (!!club && club.ownerId === user.id));

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const t = await api.getTournament(id);
      setTournament(t);
      const cats = await api.listCategories(id);
      setCategories(cats);
      if (t.clubId) {
        const c = await api.getClub(t.clubId);
        setClub(c);
      } else {
        setClub(null);
      }
    } catch {
      setError("No se pudo cargar el torneo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await api.createCategory(id, { genderCategory, level, bracketSize });
      setCategories((prev) => [...prev, created]);
    } catch {
      setCreateError("No se pudo crear la categoría.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRegister(categoryId: string) {
    try {
      await api.registerForCategory(categoryId);
      await load();
    } catch {
      alert("No se pudo completar la inscripción a la categoría.");
    }
  }

  if (loading) return <p className="text-sm text-muted">Cargando torneo…</p>;
  if (error || !tournament) return <p className="text-sm text-red-600">{error ?? "Torneo no encontrado."}</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/tournaments" className="text-xs font-medium text-brand-blue hover:underline">
          ← Volver a torneos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{tournament.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {tournament.city} · {tournament.startDate}
          {tournament.endDate ? ` – ${tournament.endDate}` : ""}
        </p>
        {tournament.description && <p className="mt-2 max-w-2xl text-muted">{tournament.description}</p>}
      </div>

      <div>
        <h2 className="font-semibold text-ink">Categorías (género, nivel y tamaño de llave)</h2>
        <p className="mt-1 text-sm text-muted">
          Cada categoría se juega en parejas: fase de grupos (todos contra todos) y luego llave de eliminación
          directa con los 2 mejores de cada grupo.
        </p>

        {categories.length === 0 && (
          <p className="mt-4 text-sm text-muted">Todavía no hay categorías creadas para este torneo.</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {categories.map((c) => {
            const numGroups = c.bracketSize / 2;
            return (
              <Link
                key={c.id}
                href={`/tournament-categories/${c.id}`}
                className="card block p-5 transition-colors hover:border-brand-blue"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-ink">
                      {genderLabel[c.genderCategory]} · Nivel {c.level}
                    </p>
                    <p className="text-sm text-muted">Llave de {c.bracketSize} parejas ({numGroups} grupos)</p>
                  </div>
                  <span className={statusBadge[c.status]}>{statusLabel[c.status]}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>
                    {c.registeredCount ?? 0} inscritos · {c.pairCount ?? 0} parejas armadas
                  </span>
                  {c.isRegistered && <span className="font-medium text-brand-green">Inscrito</span>}
                </div>
                {user && c.status === "REGISTRATION" && !c.isRegistered && (
                  <button
                    className="btn-outline mt-3 w-full !py-1.5 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRegister(c.id);
                    }}
                  >
                    Inscribirme en esta categoría
                  </button>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {canManage && (
        <section className="card max-w-lg p-6">
          <h2 className="font-semibold text-ink">Nueva categoría</h2>
          <p className="mt-1 text-sm text-muted">
            Los jugadores se inscriben individualmente; luego arma las parejas y genera los grupos desde el
            detalle de la categoría.
          </p>
          <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
            <div>
              <label className="label">Género</label>
              <div className="flex gap-2">
                {(["MASCULINO", "FEMENINO", "MIXTO"] as GenderCategory[]).map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setGenderCategory(g)}
                    className={`btn-outline flex-1 !py-2 text-xs ${genderCategory === g ? "!border-brand-blue !text-brand-blue bg-brand-blue-50" : ""}`}
                  >
                    {genderLabel[g]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nivel (1–8)</label>
                <select className="input" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      Nivel {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tamaño de la llave</label>
                <select
                  className="input"
                  value={bracketSize}
                  onChange={(e) => setBracketSize(Number(e.target.value) as (typeof BRACKET_SIZES)[number])}
                >
                  {BRACKET_SIZES.map((b) => (
                    <option key={b} value={b}>
                      {b} parejas ({b / 2} grupos)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={creating}>
              {creating ? "Creando…" : "Crear categoría"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
