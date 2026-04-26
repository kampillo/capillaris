'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Users,
  Activity,
  CalendarRange,
  Download,
  TrendingUp,
  Scissors,
  Target,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/clinic/segmented';
import { usePatientsReport, useProceduresReport } from '@/hooks/use-dashboard';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Type → semantic token mapping ──────────────────────────

const TYPE_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  active: {
    label: 'Activo',
    color: 'hsl(var(--brand-primary))',
    bg: 'hsl(var(--brand-primary-soft))',
  },
  evaluation: {
    label: 'Evaluación',
    color: 'hsl(var(--accent-amber))',
    bg: 'hsl(var(--accent-amber-soft))',
  },
  registered: {
    label: 'Registrado',
    color: 'hsl(var(--accent-info))',
    bg: 'hsl(var(--accent-info-soft))',
  },
  lead: {
    label: 'Lead',
    color: 'hsl(var(--accent-lilac))',
    bg: 'hsl(var(--accent-lilac-soft))',
  },
  inactive: {
    label: 'Inactivo',
    color: 'hsl(var(--text-secondary))',
    bg: 'hsl(var(--surface-2))',
  },
  archived: {
    label: 'Archivado',
    color: 'hsl(var(--text-tertiary))',
    bg: 'hsl(var(--surface-2))',
  },
  '': {
    label: 'Sin tipo',
    color: 'hsl(var(--text-tertiary))',
    bg: 'hsl(var(--surface-2))',
  },
};

function typeMeta(t: string) {
  return TYPE_META[t] || TYPE_META[''];
}

// ── Date range presets ─────────────────────────────────────

type Preset = 'month' | '30d' | 'quarter' | 'year' | 'custom';

function presetRange(preset: Preset): { start: string; end: string } {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: start.toISOString().split('T')[0], end: endDate };
  }
  if (preset === '30d') {
    const start = new Date(today);
    start.setDate(start.getDate() - 30);
    return { start: start.toISOString().split('T')[0], end: endDate };
  }
  if (preset === 'quarter') {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 3);
    return { start: start.toISOString().split('T')[0], end: endDate };
  }
  if (preset === 'year') {
    const start = new Date(today.getFullYear(), 0, 1);
    return { start: start.toISOString().split('T')[0], end: endDate };
  }
  // custom fallback — shouldn't be called
  return { start: endDate, end: endDate };
}

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const days =
    Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const fmt = (d: Date) =>
    d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  return `Del ${fmt(s)} al ${fmt(e)} · ${days} día${days === 1 ? '' : 's'}`;
}

// ── KPI card (reusable inline) ─────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  hue,
  loading,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  hue: string;
  loading?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="mb-4 flex items-start justify-between">
        <div
          className="inline-flex h-9 w-9 items-center justify-center rounded-md"
          style={{
            background: `color-mix(in oklab, ${hue} 12%, hsl(var(--surface)))`,
            color: hue,
          }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <div className="mb-1.5 text-xs text-text-secondary">{label}</div>
      {loading ? (
        <div className="mb-2 h-8 w-20 animate-pulse rounded bg-surface-2" />
      ) : (
        <div className="cap-kpi-number mb-2">{value}</div>
      )}
      {delta && <div className="text-[11px] text-text-tertiary">{delta}</div>}
    </div>
  );
}

// ── Loading skeleton for chart cards ───────────────────────

function SkeletonCard({ height = 260 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-md bg-surface-2"
      style={{ height }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('month');
  const initialRange = presetRange('month');
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  // Sync dates when preset changes (except for 'custom')
  useEffect(() => {
    if (preset === 'custom') return;
    const r = presetRange(preset);
    setStartDate(r.start);
    setEndDate(r.end);
  }, [preset]);

  const { data: patientsReport, isLoading: loadingPatients } =
    usePatientsReport(startDate, endDate);
  const { data: proceduresReport, isLoading: loadingProcedures } =
    useProceduresReport(startDate, endDate);

  const pieData = useMemo(
    () =>
      (patientsReport?.byType || [])
        .filter((t) => t.count > 0)
        .map((t) => ({
          type: t.type,
          name: typeMeta(t.type).label,
          value: t.count,
          color: typeMeta(t.type).color,
        })),
    [patientsReport],
  );

  const totalByType = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="cap-h2 mb-1">Reportes</h2>
          <p className="text-[13px] text-text-secondary">
            Análisis del sistema por periodo
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Exportar
        </Button>
      </div>

      {/* Date range strip */}
      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-surface px-5 py-4 shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
          <CalendarRange className="h-4 w-4" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-secondary">Periodo</Label>
          <Segmented
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'month' as Preset, label: 'Este mes' },
              { value: '30d' as Preset, label: '30 días' },
              { value: 'quarter' as Preset, label: 'Trimestre' },
              { value: 'year' as Preset, label: 'Este año' },
              { value: 'custom' as Preset, label: 'Personalizado' },
            ]}
          />
        </div>
        {preset === 'custom' && (
          <>
            <div className="space-y-1">
              <Label className="text-[11px] text-text-secondary">Desde</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-[150px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-text-secondary">Hasta</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-[150px]"
              />
            </div>
          </>
        )}
        <div className="ml-auto self-center text-xs text-text-tertiary">
          {formatRange(startDate, endDate)}
        </div>
      </section>

      {/* KPI grid (full-width, 4 cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total pacientes"
          value={patientsReport?.totalPatients.toLocaleString() ?? '—'}
          icon={Users}
          hue="hsl(var(--brand-primary))"
          loading={loadingPatients}
        />
        <KpiCard
          label="Nuevos en periodo"
          value={patientsReport?.newPatients.toLocaleString() ?? '—'}
          delta="En el rango seleccionado"
          icon={UserPlus}
          hue="hsl(var(--accent-info))"
          loading={loadingPatients}
        />
        <KpiCard
          label="Procedimientos"
          value={proceduresReport?.totalProcedures.toLocaleString() ?? '—'}
          delta={
            proceduresReport?.averageFollicles
              ? `Prom. ${Math.round(proceduresReport.averageFollicles).toLocaleString()} folículos`
              : undefined
          }
          icon={Scissors}
          hue="hsl(var(--accent-amber))"
          loading={loadingProcedures}
        />
        <KpiCard
          label="Folículos totales"
          value={
            proceduresReport?.totalFollicles
              ? proceduresReport.totalFollicles >= 1000
                ? `${(proceduresReport.totalFollicles / 1000).toFixed(1)}k`
                : proceduresReport.totalFollicles.toLocaleString()
              : '—'
          }
          delta="Acumulado en periodo"
          icon={Target}
          hue="hsl(var(--accent-lilac))"
          loading={loadingProcedures}
        />
      </div>

      {/* Detailed cards grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Patients breakdown */}
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="cap-eyebrow">Distribución de pacientes</h3>
            </div>
            {totalByType > 0 && (
              <span className="cap-mono text-xs text-text-tertiary">
                {totalByType.toLocaleString()} totales
              </span>
            )}
          </div>
          <div className="p-6">
            {loadingPatients ? (
              <SkeletonCard height={220} />
            ) : pieData.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-tertiary">
                Sin datos en este periodo
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((d) => (
                          <Cell key={d.type} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--surface))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2">
                  {pieData.map((d) => {
                    const pct =
                      totalByType > 0
                        ? (d.value / totalByType) * 100
                        : 0;
                    return (
                      <li
                        key={d.type}
                        className="flex items-center gap-3"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="flex-1 text-sm font-medium">
                          {d.name}
                        </span>
                        <span className="cap-mono text-sm text-text-secondary">
                          {d.value.toLocaleString()}
                        </span>
                        <span className="cap-mono w-10 text-right text-xs text-text-tertiary">
                          {pct.toFixed(0)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Procedures metrics */}
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="cap-eyebrow">Métricas de procedimientos</h3>
            </div>
          </div>
          <div className="p-6">
            {loadingProcedures ? (
              <SkeletonCard height={220} />
            ) : !proceduresReport ||
              proceduresReport.totalProcedures === 0 ? (
              <p className="py-10 text-center text-sm text-text-tertiary">
                Sin procedimientos en este periodo
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <MetricRow
                  label="Total de procedimientos"
                  value={proceduresReport.totalProcedures.toLocaleString()}
                  tone="amber"
                  icon={Scissors}
                />
                <MetricRow
                  label="Promedio de folículos"
                  value={
                    proceduresReport.averageFollicles
                      ? Math.round(
                          proceduresReport.averageFollicles,
                        ).toLocaleString()
                      : '—'
                  }
                  tone="brand"
                  icon={TrendingUp}
                  suffix="por procedimiento"
                />
                <MetricRow
                  label="Folículos acumulados"
                  value={
                    proceduresReport.totalFollicles?.toLocaleString() ?? '—'
                  }
                  tone="lilac"
                  icon={Target}
                  suffix="en el periodo"
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Metric row (for procedimientos) ────────────────────────

function MetricRow({
  label,
  value,
  suffix,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone: 'brand' | 'amber' | 'lilac' | 'info';
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneMap = {
    brand: {
      color: 'hsl(var(--brand-primary))',
      bg: 'hsl(var(--brand-primary-soft))',
    },
    amber: {
      color: 'hsl(var(--accent-amber))',
      bg: 'hsl(var(--accent-amber-soft))',
    },
    lilac: {
      color: 'hsl(var(--accent-lilac))',
      bg: 'hsl(var(--accent-lilac-soft))',
    },
    info: {
      color: 'hsl(var(--accent-info))',
      bg: 'hsl(var(--accent-info-soft))',
    },
  };
  const t = toneMap[tone];
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-md border border-border p-4',
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{ background: t.bg, color: t.color }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-text-secondary">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="cap-mono text-xl font-medium"
            style={{ color: t.color }}
          >
            {value}
          </span>
          {suffix && (
            <span className="text-[11px] text-text-tertiary">{suffix}</span>
          )}
        </div>
      </div>
    </div>
  );
}
