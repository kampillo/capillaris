'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  label: string;
  value: string | number;
  /** Percentage change vs previous period; null hides the trend pill */
  delta?: number | null;
  /** "more is better" (default) or "less is better" (e.g. no-show rate) */
  deltaPolarity?: 'positive' | 'negative';
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
}

export function KpiCard({
  label,
  value,
  delta,
  deltaPolarity = 'positive',
  hint,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: KpiCardProps) {
  const showDelta = delta !== null && delta !== undefined;
  const isPositive = (delta ?? 0) > 0;
  const isNegative = (delta ?? 0) < 0;
  const isFlat = (delta ?? 0) === 0;

  // For "negative" polarity (where smaller is better), invert the green/red logic
  const goodChange = deltaPolarity === 'positive' ? isPositive : isNegative;
  const badChange = deltaPolarity === 'positive' ? isNegative : isPositive;

  const trendColor = isFlat
    ? 'text-muted-foreground bg-muted'
    : goodChange
      ? 'text-emerald-700 bg-emerald-50'
      : badChange
        ? 'text-red-700 bg-red-50'
        : 'text-muted-foreground bg-muted';

  const TrendIcon = isFlat ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          {Icon && (
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md',
                iconBg,
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', iconColor)} />
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-[28px] font-semibold leading-none tabular-nums">
            {value}
          </div>
          {showDelta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                trendColor,
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {Math.abs(delta!)}%
            </span>
          )}
        </div>
        {hint && (
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
