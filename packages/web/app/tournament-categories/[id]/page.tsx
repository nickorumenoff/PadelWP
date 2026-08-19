"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type {
  BracketMatch,
  CategoryDetail,
  Club,
  GroupMatch,
  Tournament,
  TournamentPair,
} from "@padel-ve/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";

const genderLabel: Record<string, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  MIXTO: "Mixto",
};

const statusLabel: Record<string, string> = {
  REGISTRATION: "Inscripciones abiertas",
  GROUPS: "Fase de grupos",
  KNOCKOUT: "Llave (eliminación directa)",
  COMPLETED: "Finalizada",
};

const statusBadge: Record<string, string> = {
  REGISTRATION: "badge-blue",
  GROUPS: "badge-yellow",
  KNOCKOUT: "badge-purple",
  COMPLETED: "badge-green",
};

function pairName(pair?: TournamentPair | null): string {
  if (!pair) return "Por definir";
  return `${pair.player1?.name ?? "?"} / ${pair.player2?.name ?? "?"}`;
}

function roundLabel(round: number, totalRounds: number, bracketSize: number): string {
  const matchesInRound = bracketSize / Math.pow(2, round);
  const playersInRound = matchesInRound * 2;
  if (round === totalRounds) return "Final";
  if (playersInRound === 4) return "Semifinal";
  if (playersInRound === 8) return "Cuartos de final";
  if (playersInRound === 16) return "Octavos de final";
  if (playersInRound === 32) return "Dieciseisavos de final";
  if (playersInRound === 64) return "Treintaidosavos de final";
  return `Ronda ${round}`;
}

function ResultForm({
  pairAId,
  pairBId,
  nameA,
  nameB,
  onSubmit,
}: {
  pairAId: string;
  pairBId: string;
  nameA: string;
  nameB: string;
  onSubmit: (winnerPairId: string, setsA?: number, setsB?: number) => Promise<void>;
}) {
  const [winner, setWinner] = useState<string>(pairAId);
  const [setsA, setSetsA] = useState<string>("");
  const [setsB, setSetsB] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn-outline mt-2 !py-1 text-xs" onClick={() => setOpen(true)}>
        Reportar resultado
      </button>
    );
  }

  return (
    <form
      className="mt-2 space-y-2 rounded-lg border border-line bg-mist/50 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
          await onSubmit(
            winner,
            setsA ? Number(setsA) : undefined,
            setsB ? Number(setsB) : undefined
          );
          setOpen(false);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <div>
        <label className="label !mb-1">Ganador</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setWinner(pairAId)}
            className={`btn-outline flex-1 !py-1 text-xs ${winner === pairAId ? "!border-brand-blue !text-brand-blue bg-brand-blue-50" : ""}`}
          >
            {nameA}
          </button>
          <button
            type="button"
            onClick={() => setWinner(pairBId)}
            className={`btn-outline flex-1 !py-1 text-xs ${winner === pairBId ? "!border-brand-blue !text-brand-blue bg-brand-blue-50" : ""}`}
          >
            {nameB}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input !py-1.5 text-xs"
          type="number"
          min={0}
          max={5}
          placeholder="Sets A"
          value={setsA}
          onChange={(e) => setSetsA(e.target.value)}
        />
        <input
          className="input !py-1.5 text-xs"
          type="number"
          min={0}
          max={5}
          placeholder="Sets B"
          value={setsB}
          onChange={(e) => setSetsB(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-outline flex-1 !py-1 text-xs" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary flex-1 !py-1 text-xs" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar resultado"}
        </button>
      </div>
    </form>
  );
}

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [pairError, setPairError] = useState<string | null>(null);

  const canManage = !!user && (user.role === "PLATFORM_ADMIN" || (!!club && club.ownerId === user.id));

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const cat = await api.getCategoryDetail(id);
      setCategory(cat);
      const t = await api.getTournament(cat.tournamentId);
      setTournament(t);
      if (t.clubId) {
        setClub(await api.getClub(t.clubId));
      } else {
        setClub(null);
      }
    } catch {
      setError("No se pudo cargar la categoría.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRegister() {
    setBusy(true);
    try {
      await api.registerForCategory(id);
      await load();
    } catch {
      alert("No se pudo completar la inscripción.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePair(e: React.FormEvent) {
    e.preventDefault();
    setPairError(null);
    if (!player1Id || !player2Id || player1Id === player2Id) {
      setPairError("Selecciona 2 jugadores distintos.");
      return;
    }
    setBusy(true);
    try {
      await api.createPair(id, { player1Id, player2Id });
      setPlayer1Id("");
      setPlayer2Id("");
      await load();
    } catch {
      setPairError("No se pudo armar la pareja.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateGroups() {
    setBusy(true);
    try {
      await api.generateGroups(id);
      await load();
    } catch (e: any) {
      alert("No se pudieron generar los grupos. Verifica que haya suficientes parejas armadas.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateKnockout() {
    setBusy(true);
    try {
      await api.generateKnockout(id);
      await load();
    } catch {
      alert("No se pudo generar la llave. Verifica que todos los partidos de grupos tengan resultado.");
    } finally {
      setBusy(false);
    }
  }

  async function submitGroupResult(matchId: string, winnerPairId: string, setsA?: number, setsB?: number) {
    try {
      await api.submitGroupMatchResult(matchId, { winnerPairId, setsA, setsB });
      await load();
    } catch {
      alert("No se pudo guardar el resultado.");
    }
  }

  async function submitBracketResult(matchId: string, winnerPairId: string, setsA?: number, setsB?: number) {
    try {
      await api.submitBracketMatchResult(matchId, { winnerPairId, setsA, setsB });
      await load();
    } catch {
      alert("No se pudo guardar el resultado.");
    }
  }

  if (loading) return <p className="text-sm text-muted">Cargando categoría…</p>;
  if (error || !category || !tournament) return <p className="text-sm text-red-600">{error ?? "No encontrada."}</p>;

  const pairsById = new Map(category.pairs.map((p) => [p.id, p]));
  const unpaired = category.registrations.filter((r) => !r.pairId);
  const minPairsForGroups = category.bracketSize;
  const totalRounds = Math.log2(category.bracketSize);

  const allGroupMatchesCompleted =
    category.groups.length > 0 && category.groups.every((g) => g.matches.every((m) => m.status === "COMPLETED"));

  const finalMatch = category.bracket.find((m) => m.round === totalRounds);
  const champion = category.status === "COMPLETED" && finalMatch?.winnerPairId ? pairsById.get(finalMatch.winnerPairId) : null;

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/tournaments/${tournament.id}`} className="text-xs font-medium text-brand-blue hover:underline">
          ← Volver a {tournament.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">
            {genderLabel[category.genderCategory]} · Nivel {category.level}
          </h1>
          <span className={statusBadge[category.status]}>{statusLabel[category.status]}</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Llave de {category.bracketSize} parejas ({category.bracketSize / 2} grupos) · {category.registeredCount ?? 0}{" "}
          inscritos · {category.pairCount ?? 0} parejas armadas
        </p>
      </div>

      {champion && (
        <div className="card border-brand-green/40 bg-brand-green-light/40 p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-green-dark">Campeones de la categoría</p>
          <p className="mt-1 text-xl font-semibold text-brand-green-dark">{pairName(champion)}</p>
        </div>
      )}

      {category.status === "REGISTRATION" && (
        <>
          {user && !category.isRegistered && (
            <button className="btn-primary" disabled={busy} onClick={handleRegister}>
              Inscribirme en esta categoría
            </button>
          )}

          <section>
            <h2 className="font-semibold text-ink">Inscritos</h2>
            {category.registrations.length === 0 && (
              <p className="mt-2 text-sm text-muted">Todavía no hay jugadores inscritos en esta categoría.</p>
            )}
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {category.registrations.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                  <span className="text-ink">{r.user?.name ?? "Jugador"}</span>
                  {r.pairId ? (
                    <span className="badge-green">Con pareja</span>
                  ) : (
                    <span className="badge-gray">Sin pareja</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {category.pairs.length > 0 && (
            <section>
              <h2 className="font-semibold text-ink">Parejas armadas</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {category.pairs.map((p) => (
                  <li key={p.id} className="rounded-lg border border-line px-3 py-2 text-sm text-ink">
                    {pairName(p)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {canManage && (
            <section className="card max-w-lg p-6">
              <h2 className="font-semibold text-ink">Armar pareja</h2>
              <p className="mt-1 text-sm text-muted">Elige 2 jugadores inscritos y sin pareja todavía.</p>
              <form onSubmit={handleCreatePair} className="mt-4 space-y-3">
                <div>
                  <label className="label">Jugador 1</label>
                  <select className="input" value={player1Id} onChange={(e) => setPlayer1Id(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {unpaired.map((r) => (
                      <option key={r.userId} value={r.userId} disabled={r.userId === player2Id}>
                        {r.user?.name ?? r.userId}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Jugador 2</label>
                  <select className="input" value={player2Id} onChange={(e) => setPlayer2Id(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {unpaired.map((r) => (
                      <option key={r.userId} value={r.userId} disabled={r.userId === player1Id}>
                        {r.user?.name ?? r.userId}
                      </option>
                    ))}
                  </select>
                </div>
                {pairError && <p className="text-sm text-red-600">{pairError}</p>}
                <button type="submit" className="btn-primary w-full" disabled={busy || unpaired.length < 2}>
                  Armar pareja
                </button>
              </form>

              <div className="mt-6 border-t border-line pt-4">
                <p className="text-sm text-muted">
                  Se necesitan {minPairsForGroups} parejas armadas para generar los {category.bracketSize / 2} grupos.
                  Hay {category.pairCount ?? 0}.
                </p>
                <button
                  className="btn-accent mt-3 w-full"
                  disabled={busy || (category.pairCount ?? 0) < minPairsForGroups}
                  onClick={handleGenerateGroups}
                >
                  Generar grupos (sorteo aleatorio)
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {category.groups.length > 0 && (
        <section>
          <h2 className="font-semibold text-ink">Fase de grupos</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {category.groups.map((g) => (
              <div key={g.id} className="card p-5">
                <p className="font-medium text-ink">Grupo {g.groupIndex + 1}</p>

                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="pb-1 font-medium">Pareja</th>
                      <th className="pb-1 font-medium">PG</th>
                      <th className="pb-1 font-medium">PP</th>
                      <th className="pb-1 font-medium">Dif. sets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.standings.map((s, i) => {
                      const pair = g.pairs.find((p) => p.id === s.pairId);
                      return (
                        <tr key={s.pairId} className={i < 2 ? "font-medium text-ink" : "text-muted"}>
                          <td className="py-0.5">
                            {pairName(pair)} {i < 2 && <span className="badge-green ml-1 !py-0">Clasifica</span>}
                          </td>
                          <td className="py-0.5">{s.wins}</td>
                          <td className="py-0.5">{s.losses}</td>
                          <td className="py-0.5">{s.setDiff > 0 ? `+${s.setDiff}` : s.setDiff}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-4 space-y-2">
                  {g.matches.map((m: GroupMatch) => {
                    const pairA = g.pairs.find((p) => p.id === m.pairAId);
                    const pairB = g.pairs.find((p) => p.id === m.pairBId);
                    return (
                      <div key={m.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-ink">
                            {pairName(pairA)} vs {pairName(pairB)}
                          </span>
                          {m.status === "COMPLETED" ? (
                            <span className="badge-green">
                              {m.setsA ?? ""}
                              {m.setsA != null ? "-" : ""}
                              {m.setsB ?? ""} {m.winnerPairId === m.pairAId ? "ganó A" : "ganó B"}
                            </span>
                          ) : (
                            <span className="badge-gray">Pendiente</span>
                          )}
                        </div>
                        {canManage && m.status === "PENDING" && (
                          <ResultForm
                            pairAId={m.pairAId}
                            pairBId={m.pairBId}
                            nameA={pairName(pairA)}
                            nameB={pairName(pairB)}
                            onSubmit={(winner, sA, sB) => submitGroupResult(m.id, winner, sA, sB)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {canManage && category.status === "GROUPS" && (
            <div className="card mt-6 max-w-lg p-6">
              <p className="text-sm text-muted">
                {allGroupMatchesCompleted
                  ? "Todos los partidos de grupos tienen resultado. Ya puedes generar la llave con los 2 mejores de cada grupo."
                  : "Faltan partidos de grupos por reportar para poder generar la llave."}
              </p>
              <button className="btn-accent mt-3 w-full" disabled={busy || !allGroupMatchesCompleted} onClick={handleGenerateKnockout}>
                Generar llave de eliminación directa
              </button>
            </div>
          )}
        </section>
      )}

      {category.bracket.length > 0 && (
        <section>
          <h2 className="font-semibold text-ink">Llave de eliminación directa</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
              const matches = category.bracket
                .filter((m: BracketMatch) => m.round === round)
                .sort((a, b) => a.slot - b.slot);
              if (matches.length === 0) return null;
              return (
                <div key={round} className="card p-5">
                  <p className="font-medium text-ink">{roundLabel(round, totalRounds, category.bracketSize)}</p>
                  <div className="mt-3 space-y-2">
                    {matches.map((m) => {
                      const pairA = m.pairAId ? pairsById.get(m.pairAId) : undefined;
                      const pairB = m.pairBId ? pairsById.get(m.pairBId) : undefined;
                      const ready = !!m.pairAId && !!m.pairBId;
                      return (
                        <div key={m.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className={ready ? "text-ink" : "text-muted"}>
                              {pairName(pairA)} vs {pairName(pairB)}
                            </span>
                            {m.status === "COMPLETED" ? (
                              <span className="badge-green shrink-0">
                                {m.setsA ?? ""}
                                {m.setsA != null ? "-" : ""}
                                {m.setsB ?? ""} {m.winnerPairId === m.pairAId ? "ganó A" : "ganó B"}
                              </span>
                            ) : (
                              <span className="badge-gray shrink-0">{ready ? "Pendiente" : "Por definir"}</span>
                            )}
                          </div>
                          {canManage && ready && m.status === "PENDING" && m.pairAId && m.pairBId && (
                            <ResultForm
                              pairAId={m.pairAId}
                              pairBId={m.pairBId}
                              nameA={pairName(pairA)}
                              nameB={pairName(pairB)}
                              onSubmit={(winner, sA, sB) => submitBracketResult(m.id, winner, sA, sB)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
