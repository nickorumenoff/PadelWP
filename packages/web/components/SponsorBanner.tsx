import type { Sponsorship } from "@padel-ve/shared";

export default function SponsorBanner({ sponsorships }: { sponsorships: Sponsorship[] }) {
  if (!sponsorships.length) return null;
  const s = sponsorships[0];

  const content = (
    <div className="card flex items-center justify-between gap-4 border-brand-green/30 bg-brand-green-light/40 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-green-dark">Patrocinado</p>
        <p className="font-semibold text-ink">{s.sponsorName}</p>
        <p className="text-sm text-muted">{s.planName}</p>
      </div>
      {s.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.bannerUrl} alt={s.sponsorName} className="h-14 w-auto rounded-lg object-cover" />
      )}
    </div>
  );

  return s.linkUrl ? (
    <a href={s.linkUrl} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}
