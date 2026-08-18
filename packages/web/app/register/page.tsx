"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computePlayerLevel, type DominantArm, type PlayFrequency } from "@padel-ve/shared";
import { api, saveSession } from "@/lib/api";
import { useAuth } from "@/app/providers";

const frequencyOptions: { value: PlayFrequency; label: string }[] = [
  { value: "DIARIO", label: "Todos los días" },
  { value: "VARIAS_VECES_SEMANA", label: "Varias veces por semana" },
  { value: "SEMANAL", label: "Una vez por semana" },
  { value: "QUINCENAL", label: "Cada dos semanas" },
  { value: "MENSUAL", label: "Una vez al mes" },
  { value: "OCASIONAL", label: "De forma ocasional" },
];

const selfAssessmentOptions = [
  { value: 1, label: "1 — Recién empiezo" },
  { value: 2, label: "2 — Conozco lo básico" },
  { value: 3, label: "3 — Juego con regularidad" },
  { value: 4, label: "4 — Nivel avanzado" },
  { value: 5, label: "5 — Nivel competitivo" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("Caracas");

  const [dominantArm, setDominantArm] = useState<DominantArm>("DERECHA");
  const [frequency, setFrequency] = useState<PlayFrequency>("SEMANAL");
  const [yearsPlaying, setYearsPlaying] = useState(1);
  const [selfAssessment, setSelfAssessment] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [competes, setCompetes] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const previewLevel = useMemo(
    () => computePlayerLevel({ dominantArm, frequency, yearsPlaying, selfAssessment, competes }),
    [dominantArm, frequency, yearsPlaying, selfAssessment, competes]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.register({
        name,
        email,
        password,
        city,
        dominantArm,
        frequency,
        yearsPlaying,
        selfAssessment,
        competes,
      });
      saveSession(res.token);
      await refresh();
      router.push("/");
    } catch (err: any) {
      setError(err?.message?.includes("409") ? "Ya existe una cuenta con ese email." : "No se pudo crear la cuenta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-8">
        <h1 className="text-xl font-semibold text-ink">Crea tu perfil de jugador</h1>
        <p className="mt-1 text-sm text-muted">
          Paso {step} de 2 — {step === 1 ? "tus datos" : "encuesta de nivel"}
        </p>

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="label">Nombre completo</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input className="input" required value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full">
              Continuar a la encuesta de nivel
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div>
              <label className="label">Brazo dominante con el que juegas</label>
              <div className="flex gap-2">
                {(["DERECHA", "IZQUIERDA"] as DominantArm[]).map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setDominantArm(v)}
                    className={`btn-outline flex-1 !py-2 ${dominantArm === v ? "!border-brand-blue !text-brand-blue bg-brand-blue-50" : ""}`}
                  >
                    {v === "DERECHA" ? "Derecha" : "Izquierda"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">¿Con qué frecuencia juegas pádel?</label>
              <select
                className="input"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PlayFrequency)}
              >
                {frequencyOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">¿Hace cuántos años juegas? (puedes usar decimales, ej. 0.5)</label>
              <input
                className="input"
                type="number"
                min={0}
                max={60}
                step={0.1}
                value={yearsPlaying}
                onChange={(e) => setYearsPlaying(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="label">¿Cómo describirías tu nivel de juego?</label>
              <div className="space-y-2">
                {selfAssessmentOptions.map((o) => (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                      selfAssessment === o.value ? "border-brand-blue bg-brand-blue-50" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="selfAssessment"
                      className="accent-brand-blue"
                      checked={selfAssessment === o.value}
                      onChange={() => setSelfAssessment(o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">¿Compites en torneos o ligas?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCompetes(true)}
                  className={`btn-outline flex-1 !py-2 ${competes ? "!border-brand-blue !text-brand-blue bg-brand-blue-50" : ""}`}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setCompetes(false)}
                  className={`btn-outline flex-1 !py-2 ${!competes ? "!border-brand-blue !text-brand-blue bg-brand-blue-50" : ""}`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-brand-green/30 bg-brand-green-light/40 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-green-dark">
                Tu nivel calculado (1.00 mejor — 8.00 principiante)
              </p>
              <p className="mt-1 text-2xl font-semibold text-brand-green-dark">{previewLevel.toFixed(2)}</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1">
                Atrás
              </button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? "Creando cuenta…" : "Crear cuenta"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-brand-blue hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
