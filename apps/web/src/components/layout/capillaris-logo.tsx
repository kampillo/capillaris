/**
 * Capillaris logo — glifo de cabellos + wordmark.
 * variant="mark" → solo glifo (favicons/compactos)
 * variant="full" → glifo + wordmark
 */
export function CapillarisLogo({
  variant = 'full',
  className,
}: {
  variant?: 'mark' | 'full';
  className?: string;
}) {
  if (variant === 'mark') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-label="Capillaris">
        <path
          d="M14 32 C 14 18, 18 10, 20 6 C 22 10, 26 18, 26 32"
          stroke="url(#cap-g1)"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M20 32 C 20 20, 22 14, 24 10"
          stroke="url(#cap-g1)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <defs>
          <linearGradient id="cap-g1" x1="14" y1="6" x2="26" y2="32">
            <stop offset="0" stopColor="#4EB093" />
            <stop offset="1" stopColor="#1F5B4C" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5">
      <svg width={36} height={36} viewBox="0 0 40 40" fill="none">
        <path
          d="M14 32 C 14 18, 18 10, 20 6 C 22 10, 26 18, 26 32"
          stroke="url(#cap-gm)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M20 32 C 20 20, 22 14, 24 10"
          stroke="url(#cap-gm)"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.7"
        />
        <defs>
          <linearGradient id="cap-gm" x1="14" y1="6" x2="26" y2="32">
            <stop offset="0" stopColor="#6FC4A8" />
            <stop offset="1" stopColor="#1F5B4C" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-[18px] font-semibold tracking-tight text-white">
          Capillaris
        </span>
        <span className="mt-0.5 text-[10px] font-normal tracking-wider text-white/55">
          Trasplante y medicina capilar
        </span>
      </div>
    </div>
  );
}
