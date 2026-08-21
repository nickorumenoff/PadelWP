"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
    } catch {
      // Intencional: no revelamos si el email existe o no.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-8">
        <h1 className="text-xl font-semibold text-ink">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-muted">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg bg-brand-blue-50 p-4 text-sm text-brand-blue">
            Si ese email está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Enviando…" : "Enviar enlace"}
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
