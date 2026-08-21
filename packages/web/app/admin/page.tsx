"use client";

import { useEffect, useState } from "react";
import type { AdSlot, Club, Tournament } from "@padel-ve/shared";
import { api, resolveUploadUrl } from "@/lib/api";
import { useAuth } from "@/app/providers";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [adSlots, setAdSlots] = useState<AdSlot[]>([]);
  const [loadingAdSlots, setLoadingAdSlots] = useState(true);

  function loadAdSlots() {
    setLoadingAdSlots(true);
    api
      .listAllAdSlots()
      .then(setAdSlots)
      .catch(() => setAdSlots([]))
      .finally(() => setLoadingAdSlots(false));
  }

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("Caracas");
  const [clubId, setClubId] = useState("");
  const [levelMin, setLevelMin] = useState(1);
  const [levelMax, setLevelMax] = useState(8);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(16);

  const isAdmin = user?.role === "PLATFORM_ADMIN";

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setLoadingAdSlots(false);
      return;
    }
    Promise.all([api.listTournaments(), api.listClubs()])
      .then(([t, c]) => {
        setTournaments(t);
        setClubs(c);
      })
      .finally(() => setLoading(false));
    loadAdSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.createTournament({
        name,
        description: description || undefined,
        city,
        clubId: clubId || undefined,
        levelMin,
        levelMax,
        startDate,
        endDate: endDate || undefined,
        maxPlayers,
      });
      setTournaments((prev) => [created, ...prev]);
      setName("");
      setDescription("");
    } catch {
      setError("No se pudo crear el torneo. Verifica los datos (nivel mínimo/máximo y fecha).");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <p className="text-sm text-muted">Cargando…</p>;

  if (!user) {
    return <p className="text-sm text-muted">Inicia sesión para acceder al panel de administración.</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg card p-8">
        <h1 className="text-xl font-semibold text-ink">Acceso restringido</h1>
        <p className="mt-1 text-sm text-muted">
          Esta sección es solo para administradores de la plataforma Padel WP.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Panel de administración</h1>
        <p className="mt-1 text-sm text-muted">Habilita y publica torneos visibles para todos los jugadores.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-semibold text-ink">Nuevo torneo</h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <div>
              <label className="label">Nombre</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Ciudad</label>
                <input className="input" required value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="label">Club (opcional)</label>
                <select className="input" value={clubId} onChange={(e) => setClubId(e.target.value)}>
                  <option value="">Sin club asociado</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nivel mínimo</label>
                <input
                  className="input"
                  type="number"
                  step="0.5"
                  min={1}
                  max={8}
                  value={levelMin}
                  onChange={(e) => setLevelMin(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Nivel máximo</label>
                <input
                  className="input"
                  type="number"
                  step="0.5"
                  min={1}
                  max={8}
                  value={levelMax}
                  onChange={(e) => setLevelMax(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha de inicio</label>
                <input className="input" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de fin (opcional)</label>
                <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Cupo máximo de jugadores</label>
              <input
                className="input"
                type="number"
                min={4}
                max={256}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Publicando…" : "Publicar torneo"}
            </button>
          </form>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold text-ink">Torneos publicados</h2>
          <div className="mt-3 space-y-2">
            {loading && <p className="text-sm text-muted">Cargando…</p>}
            {!loading && tournaments.length === 0 && (
              <p className="text-sm text-muted">Aún no has publicado torneos.</p>
            )}
            {tournaments.map((t) => (
              <div key={t.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{t.name}</span>
                  <span className={`badge-${t.status === "OPEN" ? "green" : "blue"}`}>{t.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {t.city} · Nivel {t.levelMin.toFixed(1)}–{t.levelMax.toFixed(1)} · {t.startDate}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {t.registeredCount ?? 0}/{t.maxPlayers} inscritos
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-ink">Espacios publicitarios</h2>
        <p className="mt-1 text-sm text-muted">
          4 espacios fijos que puedes activar/desactivar, con foto, título y un poco de texto. Aparecen en inicio y
          en la página de patrocinadores. No llevan seguimiento de pago (coexisten con el autoservicio de
          patrocinios de arriba).
        </p>
        {loadingAdSlots && <p className="mt-3 text-sm text-muted">Cargando…</p>}
        {!loadingAdSlots && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {adSlots.map((slot) => (
              <AdSlotCard key={slot.position} slot={slot} onSaved={loadAdSlots} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AdSlotCard({ slot, onSaved }: { slot: AdSlot; onSaved: () => void }) {
  const [title, setTitle] = useState(slot.title || "");
  const [text, setText] = useState(slot.text || "");
  const [linkUrl, setLinkUrl] = useState(slot.linkUrl || "");
  const [active, setActive] = useState(slot.active);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.updateAdSlot(slot.position, {
        title: title || null,
        text: text || null,
        linkUrl: linkUrl || null,
        active,
      });
      onSaved();
    } catch {
      setError("No se pudo guardar el espacio.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      await api.uploadAdSlotImage(slot.position, formData);
      onSaved();
    } catch {
      setError("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">Espacio {slot.position}</p>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Activo
        </label>
      </div>

      {slot.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveUploadUrl(slot.imageUrl)} alt="" className="h-24 w-full rounded-lg object-cover" />
      )}
      <div>
        <label className="label">Imagen</label>
        <input className="input" type="file" accept="image/*" onChange={handleImage} disabled={uploading} />
      </div>

      <div>
        <label className="label">Título</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
      </div>
      <div>
        <label className="label">Texto</label>
        <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={280} />
      </div>
      <div>
        <label className="label">Enlace (opcional)</label>
        <input className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="button" className="btn-primary w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
