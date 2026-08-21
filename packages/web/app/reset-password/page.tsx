"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("El enlace no es válido o expiró. Solicita uno nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm">
        <div className="card p-8 text-center">
          <h1 className="text-xl font-semibold text-ink">Enlace inválido</h1>
          <p className="mt-2 text-sm text-muted">
            Este enlace de recuperación no es válido. Solicita uno nuevo.
          </p>
          <Link href="/forgot-password" className="mt-4 inline-block font-medium text-brand-blue hover:underline">
            Solicitar enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-8">
        <h1 className="text-xl font-semibold text-ink">Restablecer contraseña</h1>
        <p className="mt-1 text-sm text-muted">Elige tu nueva contraseña.</p>

        {done ? (
          <div className="mt-6 rounded-lg bg-brand-green/10 p-4 text-sm text-brand-green">
            Contraseña actualizada. Redirigiendo a iniciar sesión…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Nueva contraseña</label>
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
              <label className="label">Confirmar contraseña</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-brand-blue hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
