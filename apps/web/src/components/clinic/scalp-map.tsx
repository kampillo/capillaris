import { cn } from '@/lib/utils';
import { ZONE_LAYOUT } from './scalp-zones';

/**
 * ScalpMap — vista superior estilizada del cuero cabelludo.
 *
 * Dos modos visuales combinables:
 * - `severity` (0–1): opacidad del tinte ámbar en la zona receptora
 *   (mayor severidad → más visible).
 * - `highlightedZoneNames`: lista de nombres de zonas donantes (matching
 *   con los seeds en `donor_zones`) para resaltarlas sobre el cuero
 *   cabelludo. Las zonas no-scalp (Barba, Cejas, Lados) se ignoran acá
 *   y deben mostrarse aparte como chips.
 */
export function ScalpMap({
  severity = 0,
  highlightedZoneNames = [],
  className,
}: {
  severity?: number;
  highlightedZoneNames?: string[];
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, severity));
  const highlighted = new Set(highlightedZoneNames);
  const mappedEntries = Object.entries(ZONE_LAYOUT);

  return (
    <svg
      viewBox="0 0 200 200"
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label="Mapa del cuero cabelludo"
    >
      <defs>
        <clipPath id="scalp-map-clip">
          <ellipse cx="100" cy="105" rx="70" ry="85" />
        </clipPath>
      </defs>

      {/* Head outline */}
      <ellipse
        cx="100"
        cy="105"
        rx="70"
        ry="85"
        fill="hsl(var(--brand-primary-softer))"
        stroke="hsl(var(--border-strong))"
        strokeWidth="1.2"
      />

      {/* Receptor zone (top/coronal) — opacity from severity */}
      {clamped > 0 && (
        <g clipPath="url(#scalp-map-clip)">
          <path
            d="M 50 70 Q 60 30 100 25 Q 140 30 150 70 Q 145 100 100 100 Q 55 100 50 70 Z"
            fill="hsl(var(--accent-amber))"
            fillOpacity={clamped * 0.5}
            stroke="hsl(var(--accent-amber))"
            strokeWidth="1"
          />
        </g>
      )}

      {/* Highlighted donor zones */}
      {highlighted.size > 0 && (
        <g clipPath="url(#scalp-map-clip)">
          {mappedEntries.map(([name, layout]) =>
            highlighted.has(name) ? (
              <rect
                key={name}
                x={layout.rect.x}
                y={layout.rect.y}
                width={layout.rect.w}
                height={layout.rect.h}
                fill="hsl(var(--brand-primary))"
                fillOpacity="0.25"
                stroke="hsl(var(--brand-primary))"
                strokeWidth="1.2"
              />
            ) : null,
          )}
        </g>
      )}

      {/* Labels for highlighted zones (outside clip so they are readable) */}
      {mappedEntries.map(([name, layout]) =>
        highlighted.has(name) ? (
          <text
            key={`label-${name}`}
            x={layout.label.x}
            y={layout.label.y}
            textAnchor={layout.label.anchor ?? 'middle'}
            fontSize="7"
            fontWeight="600"
            fill="hsl(var(--brand-primary-dark))"
            className="pointer-events-none select-none"
          >
            {layout.label.text}
          </text>
        ) : null,
      )}

      {/* Zone labels (default — only shown when no highlights) */}
      {highlighted.size === 0 && clamped === 0 && (
        <>
          <text
            x="100"
            y="165"
            textAnchor="middle"
            fontSize="9"
            fill="hsl(var(--brand-primary-dark))"
            fontWeight="500"
          >
            Zona donante
          </text>
          <text
            x="100"
            y="60"
            textAnchor="middle"
            fontSize="9"
            fill="hsl(var(--text-tertiary))"
            fontWeight="500"
          >
            Zona receptora
          </text>
        </>
      )}

      {/* Nose indicator */}
      <circle cx="100" cy="30" r="3" fill="hsl(var(--text-tertiary))" />
    </svg>
  );
}
