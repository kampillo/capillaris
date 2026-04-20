/**
 * ScalpMap — vista superior estilizada del cuero cabelludo
 * con zona donante (occipital) y receptora (coronal/frontal).
 *
 * severity va de 0 a 1 y controla la intensidad del tinte ámbar
 * en la zona receptora (mayor severidad → más visible).
 */
export function ScalpMap({
  severity = 0.4,
  donorLabel = 'Zona donante',
  receptorLabel = 'Zona receptora',
  className,
}: {
  severity?: number;
  donorLabel?: string;
  receptorLabel?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, severity));
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={{ width: '100%', height: '100%' }}
      role="img"
      aria-label="Mapa del cuero cabelludo"
    >
      {/* Head outline (top view) */}
      <ellipse
        cx="100"
        cy="105"
        rx="70"
        ry="85"
        fill="hsl(var(--brand-primary-softer))"
        stroke="hsl(var(--border-strong))"
        strokeWidth="1.2"
      />

      {/* Donor zone (back/sides) */}
      <path
        d="M 35 125 Q 30 170 100 180 Q 170 170 165 125 Q 155 160 100 165 Q 45 160 35 125 Z"
        fill="hsl(var(--brand-primary))"
        fillOpacity="0.22"
        stroke="hsl(var(--brand-primary))"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <text
        x="100"
        y="165"
        textAnchor="middle"
        fontSize="9"
        fill="hsl(var(--brand-primary-dark))"
        fontWeight="500"
      >
        {donorLabel}
      </text>

      {/* Receptor zone (top/coronal) */}
      <path
        d="M 50 70 Q 60 30 100 25 Q 140 30 150 70 Q 145 100 100 100 Q 55 100 50 70 Z"
        fill="hsl(var(--accent-amber))"
        fillOpacity={clamped * 0.5}
        stroke="hsl(var(--accent-amber))"
        strokeWidth="1"
      />
      <text
        x="100"
        y="60"
        textAnchor="middle"
        fontSize="9"
        fill="hsl(var(--accent-amber))"
        fontWeight="500"
      >
        {receptorLabel}
      </text>

      {/* Nose indicator */}
      <circle cx="100" cy="30" r="3" fill="hsl(var(--text-tertiary))" />
    </svg>
  );
}
