'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  className,
  children,
  action,
}: ChartCardProps) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
