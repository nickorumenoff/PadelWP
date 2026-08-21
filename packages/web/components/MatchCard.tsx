"use client";

import type { Match } from "@padel-ve/shared";
import { useAuth } from "@/app/providers";

export default function MatchCard({
  match,
  onJoin,
  onSubmitResult,
  onCancel,
  onLeave,
  highlighted,
}: {
  match: Match;
  onJoin?: (matchId: string, team: 1 | 2) => void;
  onSubmitResult?: (matchId: string, winnerTeam: 1 | 2) => void;
  onCancel?: (matchId: string) => void;
  onLeave?: (matchId: string) => void;
  highlighted?: boolean;
}) {
  const { user } = useAuth();
  const players = match.players ?? [];
  const team1 = players.filter((p) => p.team === 1);
  const team2 = players.filter((p) => p.team === 2);
  const alreadyIn = players.some((p) => p.userId === user?.id);
  const canReportResult = onSubmitResult && match.status === "FULL" && alreadyIn;
  const isCreator = !!user && match.creatorId === user.id;
  const isActive = match.status === "OPEN" || match.status === "FULL";
  const canCancel = onCancel && isCreator && isActive;
  const canLeave = onLeave && !isCreator && alreadyIn && isActive;
  const booking = match.booking as any;
  const club = booking?.court?.club;
  const courtName = booking?.court?.name;

  return (
    <div className={`card p-5 ${highlighted ? "border-brand-green ring-2 ring-brand-green/40" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-ink">
            {club?.name ?? "Club"} {courtName ? `· ${courtName}` : ""}
          </p>
          <p className="text-sm text-muted">
            {match.booking?.date} · {match.booking?.startTime} - {match.booking?.endTime}
          </p>
        </div>
        <span className="badge-blue">
          Nivel {match.levelMin.toFixed(1)}–{match.levelMax.toFixed(1)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {[team1, team2].map((team, idx) => (
          <div key={idx} className="rounded-lg border border-line p-3">
            <p className="mb-2 text-xs font-medium uppercase text-muted">Equipo {idx + 1}</p>
            <div className="space-y-1">
              {team.map((p) => (
                <p key={p.id} className="text-sm text-ink">
                  {p.user?.name} <span className="text-xs text-muted">({p.user?.level.toFixed(2)})</span>
                </p>
              ))}
              {team.length < 2 && onJoin && (
                <button
                  disabled={alreadyIn || match.status !== "OPEN"}
                  onClick={() => onJoin(match.id, (idx + 1) as 1 | 2)}
                  className="btn-outline mt-1 w-full !py-1.5 text-xs"
                >
                  Unirme aquí
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{match.type === "OPEN" ? "Partida abierta" : "Partida privada"}</span>
        <span>
          {match.status === "COMPLETED"
            ? `Finalizada · Ganó equipo ${match.winnerTeam}`
            : match.status === "CANCELLED"
              ? "Cancelada"
              : match.status === "FULL"
                ? "Completa"
                : "Buscando jugadores"}
        </span>
      </div>

      {canReportResult && (
        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          <button
            onClick={() => onSubmitResult!(match.id, 1)}
            className="btn-outline flex-1 !py-1.5 text-xs"
          >
            Ganó equipo 1
          </button>
          <button
            onClick={() => onSubmitResult!(match.id, 2)}
            className="btn-outline flex-1 !py-1.5 text-xs"
          >
            Ganó equipo 2
          </button>
        </div>
      )}

      {(canCancel || canLeave) && (
        <div className="mt-3 border-t border-line pt-3">
          {canCancel && (
            <button
              onClick={() => {
                if (confirm("¿Cancelar esta partida? Se liberará el horario reservado.")) onCancel!(match.id);
              }}
              className="w-full rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Cancelar partida
            </button>
          )}
          {canLeave && (
            <button
              onClick={() => {
                if (confirm("¿Salir de esta partida?")) onLeave!(match.id);
              }}
              className="w-full rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Salir de la partida
            </button>
          )}
        </div>
      )}
    </div>
  );
}
