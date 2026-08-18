"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Payment } from "@padel-ve/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";

const frequencyLabel: Record<string, string> = {
  DIARIO: "Todos los días",
  VARIAS_VECES_SEMANA: "Varias veces por semana",
  SEMANAL: "Una vez por semana",
  QUINCENAL: "Cada dos semanas",
  MENSUAL: "Una vez al mes",
  OCASIONAL: "Ocasional",
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) api.listMyPayments().then(setPayments).catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="card p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-2xl font-semibold text-white">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">{user.name}</h1>
            <p className="text-sm text-muted">{user.email}</p>
            <p className="text-sm text-muted">{user.city}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-brand-green-light p-3 text-center">
            <p className="text-xs text-brand-green-dark">Nivel</p>
            <p className="text-lg font-semibold text-brand-green-dark">{user.level.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-mist p-3 text-center">
            <p className="text-xs text-muted">Brazo</p>
            <p className="text-sm font-medium text-ink">{user.dominantArm === "IZQUIERDA" ? "Izquierda" : "Derecha"}</p>
          </div>
          <div className="rounded-lg bg-mist p-3 text-center">
            <p className="text-xs text-muted">Frecuencia</p>
            <p className="text-sm font-medium text-ink">{frequencyLabel[user.frequency ?? ""] ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-mist p-3 text-center">
            <p className="text-xs text-muted">Compite</p>
            <p className="text-sm font-medium text-ink">{user.competes ? "Sí" : "No"}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          El nivel se calcula automáticamente con tu encuesta de perfil, en una escala de 1.00 (mejor categoría) a
          8.00 (principiante).
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-ink">Mis pagos</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Todavía no has registrado ningún pago.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted">
                <th className="pb-2">Monto</th>
                <th className="pb-2">Método</th>
                <th className="pb-2">Motivo</th>
                <th className="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="py-2">
                    {p.amount} {p.currency}
                  </td>
                  <td className="py-2">{p.method}</td>
                  <td className="py-2">{p.purpose}</td>
                  <td className="py-2">
                    <span
                      className={`badge ${
                        p.status === "VERIFIED"
                          ? "badge-green"
                          : p.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "badge-blue"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
