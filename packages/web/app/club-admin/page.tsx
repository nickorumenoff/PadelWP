"use client";

import { useEffect, useState } from "react";
import type { Club } from "@padel-ve/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";
import VenezuelaPaymentForm from "@/components/VenezuelaPaymentForm";

export default function ClubAdminPage() {
  const { user } = useAuth();
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Caracas");

  const [courtName, setCourtName] = useState("Pista 1");
  const [courtType, setCourtType] = useState<"CRISTAL" | "MURO" | "PANORAMICA">("CRISTAL");
  const [indoor, setIndoor] = useState(false);
  const [price, setPrice] = useState(20);
  const [showPlanPayment, setShowPlanPayment] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .listClubs()
      .then((clubs) => setMyClub(clubs.find((c) => c.ownerId === user.id) ?? null))
      .finally(() => setLoading(false));
  }, [user]);

  async function createClub(e: React.FormEvent) {
    e.preventDefault();
    const club = await api.createClub({ name, description, address, city });
    setMyClub(club);
  }

  async function addCourt(e: React.FormEvent) {
    e.preventDefault();
    if (!myClub) return;
    await api.addCourt(myClub.id, { name: courtName, type: courtType, indoor, pricePerHourUsd: price });
    const refreshed = await api.getClub(myClub.id);
    setMyClub(refreshed);
  }

  if (!user) {
    return <p className="text-sm text-muted">Inicia sesión para administrar tu club.</p>;
  }
  if (loading) return <p className="text-sm text-muted">Cargando…</p>;

  if (!myClub) {
    return (
      <div className="mx-auto max-w-lg card p-8">
        <h1 className="text-xl font-semibold text-ink">Registra tu club</h1>
        <p className="mt-1 text-sm text-muted">
          Da de alta tu club para publicar tus pistas y recibir reservas de jugadores en toda Venezuela.
        </p>
        <form onSubmit={createClub} className="mt-6 space-y-4">
          <div>
            <label className="label">Nombre del club</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label">Dirección</label>
            <input className="input" required value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input className="input" required value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full">
            Crear club
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="badge-blue">{myClub.visibilityPlan === "NONE" ? "Sin plan destacado" : myClub.visibilityPlan}</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{myClub.name}</h1>
        <p className="text-muted">
          {myClub.address}, {myClub.city}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-semibold text-ink">Pistas</h2>
          <div className="mt-3 space-y-2">
            {myClub.courts?.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <span>{c.name}</span>
                <span className="text-muted">${c.pricePerHourUsd}/h</span>
              </div>
            ))}
            {(!myClub.courts || myClub.courts.length === 0) && (
              <p className="text-sm text-muted">Aún no has añadido pistas.</p>
            )}
          </div>

          <form onSubmit={addCourt} className="mt-4 space-y-3 border-t border-line pt-4">
            <p className="text-sm font-medium text-ink">Añadir pista</p>
            <input className="input" value={courtName} onChange={(e) => setCourtName(e.target.value)} placeholder="Nombre" />
            <div className="grid grid-cols-2 gap-3">
              <select className="input" value={courtType} onChange={(e) => setCourtType(e.target.value as any)}>
                <option value="CRISTAL">Cristal</option>
                <option value="MURO">Muro</option>
                <option value="PANORAMICA">Panorámica</option>
              </select>
              <input
                className="input"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="Precio/hora USD"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={indoor} onChange={(e) => setIndoor(e.target.checked)} />
              Techada
            </label>
            <button type="submit" className="btn-outline w-full">
              Añadir pista
            </button>
          </form>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold text-ink">Visibilidad destacada</h2>
          <p className="mt-1 text-sm text-muted">
            Paga por un plan de visibilidad para que tu club aparezca primero en los resultados de búsqueda.
          </p>
          {!showPlanPayment ? (
            <button className="btn-accent mt-4" onClick={() => setShowPlanPayment(true)}>
              Contratar plan destacado
            </button>
          ) : (
            <div className="mt-4">
              <VenezuelaPaymentForm purpose="CLUB_PLAN" relatedId={myClub.id} defaultAmount={80} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
