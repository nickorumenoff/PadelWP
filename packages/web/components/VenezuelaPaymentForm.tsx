"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const methods = [
  { value: "PAGO_MOVIL", label: "Pago Móvil" },
  { value: "TRANSFERENCIA", label: "Transferencia bancaria" },
  { value: "ZELLE", label: "Zelle" },
  { value: "USDT", label: "USDT / Binance Pay" },
] as const;

/**
 * En Venezuela no hay pasarela de cobro automatizada en el MVP: el usuario reporta
 * el pago (Pago Móvil, transferencia, Zelle o USDT) con su referencia, y un
 * administrador lo concilia manualmente. Este formulario se reutiliza tanto para
 * pagar planes de club como patrocinios.
 */
export default function VenezuelaPaymentForm({
  purpose,
  relatedId,
  defaultAmount,
  onDone,
}: {
  purpose: "BOOKING" | "SPONSORSHIP" | "CLUB_PLAN";
  relatedId?: string;
  defaultAmount: number;
  onDone?: () => void;
}) {
  const [amount, setAmount] = useState(defaultAmount);
  const [currency, setCurrency] = useState<"USD" | "VES">("USD");
  const [method, setMethod] = useState<(typeof methods)[number]["value"]>("PAGO_MOVIL");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.submitPayment({ amount, currency, method, reference, purpose, relatedId });
      setDone(true);
      onDone?.();
    } catch {
      setError("No se pudo registrar el pago. ¿Iniciaste sesión?");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-lg bg-brand-green-light p-3 text-sm text-brand-green-dark">
        Reporte de pago recibido. Un administrador lo verificará pronto.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Monto</label>
          <input
            type="number"
            min={0}
            step={0.01}
            className="input"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Moneda</label>
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "VES")}>
            <option value="USD">USD</option>
            <option value="VES">VES</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Método de pago</label>
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value as any)}>
          {methods.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Número de referencia / comprobante</label>
        <input
          className="input"
          placeholder="Ej. últimos 4 dígitos, referencia bancaria o ID de transacción"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-accent w-full">
        {submitting ? "Enviando…" : "Reportar pago"}
      </button>
    </form>
  );
}
