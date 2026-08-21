"use client";

/**
 * Estrellas de calificación. En modo lectura muestra el promedio (puede tener
 * decimales); en modo interactivo (`onChange`) permite elegir 1-5 enteras.
 */
export default function StarRating({
  value,
  onChange,
  size = "text-base",
}: {
  value: number;
  onChange?: (v: 1 | 2 | 3 | 4 | 5) => void;
  size?: string;
}) {
  const stars = [1, 2, 3, 4, 5] as const;
  const interactive = !!onChange;

  return (
    <span className={`inline-flex items-center gap-0.5 ${size}`}>
      {stars.map((s) => {
        const filled = value >= s;
        const partial = !filled && value > s - 1;
        return (
          <button
            key={s}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(s)}
            className={interactive ? "cursor-pointer" : "cursor-default"}
            style={{ color: filled || partial ? "#F5A623" : "#D9DFE5" }}
            aria-label={`${s} estrella${s > 1 ? "s" : ""}`}
          >
            ★
          </button>
        );
      })}
    </span>
  );
}
