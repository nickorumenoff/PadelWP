"use client";

import { useEffect, useState } from "react";
import type { AdSlot } from "@padel-ve/shared";
import { api, resolveUploadUrl } from "@/lib/api";

/**
 * Muestra los espacios publicitarios activos (hasta 4, gestionados solo por
 * el admin de plataforma desde /admin). Coexiste con SponsorBanner: este
 * componente no lleva ningún seguimiento de pago, es solo contenido con
 * interruptor on/off.
 */
export default function AdSlotBanner() {
  const [slots, setSlots] = useState<AdSlot[]>([]);

  useEffect(() => {
    api
      .listAdSlots()
      .then(setSlots)
      .catch(() => setSlots([]));
  }, []);

  if (slots.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {slots.map((slot) => {
        const content = (
          <div className="card flex items-center gap-4 p-4">
            {slot.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveUploadUrl(slot.imageUrl)}
                alt={slot.title || "Publicidad"}
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0">
              {slot.title && <p className="truncate font-semibold text-ink">{slot.title}</p>}
              {slot.text && <p className="mt-0.5 text-sm text-muted">{slot.text}</p>}
            </div>
          </div>
        );

        return slot.linkUrl ? (
          <a key={slot.id} href={slot.linkUrl} target="_blank" rel="noreferrer">
            {content}
          </a>
        ) : (
          <div key={slot.id}>{content}</div>
        );
      })}
    </div>
  );
}
