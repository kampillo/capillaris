'use client';

import { cn } from '@/lib/utils';
import { ZONE_LAYOUT } from './scalp-zones';

type Zone = { id: string; name: string };

export function ScalpZonePicker({
  zones,
  value,
  onChange,
  className,
}: {
  zones: Zone[];
  value: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const scalpZones = zones.filter((z) => ZONE_LAYOUT[z.name]);
  const sideZones = zones.filter((z) => !ZONE_LAYOUT[z.name]);
  const selectedZones = zones.filter((z) => value.includes(z.id));

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="grid gap-4 md:grid-cols-[minmax(240px,320px)_1fr]">
        {/* Interactive scalp map */}
        <div className="flex justify-center">
          <svg
            viewBox="0 0 200 200"
            className="h-auto w-full max-w-[320px]"
            role="group"
            aria-label="Selección de zonas donantes"
          >
            <defs>
              <clipPath id="scalp-zone-clip">
                <ellipse cx="100" cy="105" rx="70" ry="85" />
              </clipPath>
            </defs>

            {/* Head outline background */}
            <ellipse
              cx="100"
              cy="105"
              rx="70"
              ry="85"
              fill="hsl(var(--brand-primary-softer))"
              stroke="hsl(var(--border-strong))"
              strokeWidth="1.2"
            />

            {/* Nose indicator */}
            <circle cx="100" cy="30" r="3" fill="hsl(var(--text-tertiary))" />

            {/* Clickable zones */}
            <g clipPath="url(#scalp-zone-clip)">
              {scalpZones.map((z) => {
                const layout = ZONE_LAYOUT[z.name];
                const active = value.includes(z.id);
                return (
                  <rect
                    key={z.id}
                    x={layout.rect.x}
                    y={layout.rect.y}
                    width={layout.rect.w}
                    height={layout.rect.h}
                    onClick={() => toggle(z.id)}
                    pointerEvents="all"
                    className={cn(
                      'cursor-pointer transition-colors',
                      active
                        ? 'fill-brand-soft stroke-brand'
                        : 'fill-transparent stroke-border hover:fill-brand-softer',
                    )}
                    strokeWidth={active ? 1.5 : 0.6}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={active}
                    aria-label={z.name}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggle(z.id);
                      }
                    }}
                  />
                );
              })}
            </g>

            {/* Labels rendered OUTSIDE the clip so they are not cut */}
            {scalpZones.map((z) => {
              const layout = ZONE_LAYOUT[z.name];
              const active = value.includes(z.id);
              return (
                <text
                  key={`label-${z.id}`}
                  x={layout.label.x}
                  y={layout.label.y}
                  textAnchor={layout.label.anchor ?? 'middle'}
                  fontSize="7"
                  fontWeight={active ? 600 : 500}
                  fill={
                    active
                      ? 'hsl(var(--brand-primary-dark))'
                      : 'hsl(var(--text-tertiary))'
                  }
                  className="pointer-events-none select-none"
                >
                  {layout.label.text}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Side controls */}
        <div className="flex flex-col gap-3">
          {sideZones.length > 0 && (
            <div>
              <div className="cap-eyebrow mb-2">Otras zonas</div>
              <div className="flex flex-wrap gap-1.5">
                {sideZones.map((z) => {
                  const active = value.includes(z.id);
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => toggle(z.id)}
                      aria-pressed={active}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-brand bg-brand-soft text-brand-dark'
                          : 'border-border bg-surface text-text-secondary hover:bg-surface-2 hover:text-foreground',
                      )}
                    >
                      {z.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="cap-eyebrow mb-2">
              Seleccionadas{' '}
              <span className="cap-mono ml-1 text-text-tertiary">
                {selectedZones.length}
              </span>
            </div>
            {selectedZones.length === 0 ? (
              <p className="text-xs text-text-tertiary">
                Haz clic en el mapa o en los chips para seleccionar las zonas
                donantes.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedZones.map((z) => (
                  <span
                    key={z.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-dark"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    {z.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
