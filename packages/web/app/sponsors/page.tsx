"use client";

import { useEffect, useState } from "react";
import type { Sponsorship } from "@padel-ve/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";
import VenezuelaPaymentForm from "@/components/VenezuelaPaymentForm";
import AdSlotBanner from "@/components/AdSlotBanner";

export default function SponsorsPage() {
  const { user } = useAuth();
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [sponsorName, setSponsorName] = useState("");
  const [planName, setPlanName] = useState("Banner destacado - 1 mes");
  const [linkUrl, setLinkUrl] = useState("");
  const [created, setCreated] = useState<Sponsorship | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listSponsorships().then(setSponsorships);
  }, []);

  async function requestSponsorship(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    try {
      const s = await api.requestSponsorship({ sponsorName, planName, linkUrl });
      setCreated(s);
    } catch {
      setError("No se pudo enviar la solicitud.");
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Espacio de patrocinadores</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Marcas y negocios pueden pagar por presencia destacada dentro de Padel WP: banners, posicionamiento y
          promociones dirigidas a jugadores de pádel en toda Venezuela.
        </p>
      </div>

      <AdSlotBanner />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Patrocinadores activos</h2>
        {sponsorships.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay patrocinadores activos.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sponsorships.map((s) => (
              <div key={s.id} className="card p-4">
                <p className="font-medium text-ink">{s.sponsorName}</p>
                <p className="text-sm text-muted">{s.planName}</p>
                {s.bannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.bannerUrl} alt={s.sponsorName} className="mt-2 h-16 w-full rounded-lg object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card max-w-lg p-6">
        <h2 className="font-semibold text-ink">Quiero patrocinar / destacar mi club</h2>
        <p className="mt-1 text-sm text-muted">
          Completa la solicitud y reporta el pago. Un administrador la activará al conciliar el pago.
        </p>

        {!user ? (
          <p className="mt-4 rounded-lg bg-brand-blue-50 p-3 text-sm text-brand-blue">
            Inicia sesión para solicitar un espacio de patrocinio.
          </p>
        ) : !created ? (
          <form onSubmit={requestSponsorship} className="mt-4 space-y-3">
            <div>
              <label className="label">Nombre de la marca / negocio</label>
              <input className="input" required value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} />
            </div>
            <div>
              <label className="label">Plan</label>
              <select className="input" value={planName} onChange={(e) => setPlanName(e.target.value)}>
                <option>Banner destacado - 1 mes</option>
                <option>Club destacado - 1 mes</option>
                <option>Club premium - 3 meses</option>
              </select>
            </div>
            <div>
              <label className="label">Enlace (opcional)</label>
              <input className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              Continuar al pago
            </button>
          </form>
        ) : (
          <div className="mt-4">
            <p className="mb-3 text-sm text-muted">
              Solicitud creada para <strong>{created.sponsorName}</strong>. Reporta el pago para activarla.
            </p>
            <VenezuelaPaymentForm purpose="SPONSORSHIP" relatedId={created.id} defaultAmount={150} />
          </div>
        )}
      </section>
    </div>
  );
}
