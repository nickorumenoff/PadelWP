import Link from "next/link";
import type { Club } from "@padel-ve/shared";
import StarRating from "./StarRating";

const planLabel: Record<string, string> = {
  PREMIUM: "Club Premium",
  FEATURED: "Club Destacado",
  BASIC: "Club",
  NONE: "",
};

export default function ClubCard({ club }: { club: Club }) {
  const minPrice = club.courts?.length
    ? Math.min(...club.courts.map((c) => c.pricePerHourUsd))
    : undefined;

  return (
    <Link href={`/clubs/${club.id}`} className="card group block overflow-hidden transition-shadow hover:shadow-soft">
      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-blue-50 to-brand-green-light text-brand-blue">
        <span className="text-3xl">🎾</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-ink group-hover:text-brand-blue">{club.name}</h3>
          {planLabel[club.visibilityPlan] && (
            <span className="badge-green shrink-0">{planLabel[club.visibilityPlan]}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{club.city}</p>
        {!!club.reviewCount && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted">
            <StarRating value={club.avgRating ?? 0} size="text-xs" />
            <span>
              {club.avgRating?.toFixed(1)} ({club.reviewCount})
            </span>
          </div>
        )}
        <p className="mt-2 line-clamp-2 text-sm text-muted">{club.description}</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted">{club.courts?.length ?? 0} pista(s)</span>
          {minPrice !== undefined && (
            <span className="font-medium text-brand-blue">Desde ${minPrice}/h</span>
          )}
        </div>
      </div>
    </Link>
  );
}
