import { cn } from '@/lib/utils';

const TONES: Array<[string, string]> = [
  ['hsl(var(--brand-primary-soft))', 'hsl(var(--brand-primary-dark))'],
  ['hsl(var(--accent-amber-soft))', 'hsl(var(--accent-amber))'],
  ['hsl(var(--accent-lilac-soft))', 'hsl(var(--accent-lilac))'],
  ['hsl(var(--accent-info-soft))', 'hsl(var(--accent-info))'],
  ['hsl(var(--accent-danger-soft))', 'hsl(var(--accent-danger))'],
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h += str.charCodeAt(i);
  return h;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const [bg, fg] = TONES[hash(name) % TONES.length];
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.38),
        letterSpacing: '-0.01em',
      }}
    >
      {getInitials(name)}
    </div>
  );
}
