'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Calendar,
  Scissors,
  Target,
  Plus,
  Download,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePatientsReport, useProceduresReport } from '@/hooks/use-dashboard';
import { useAppointments, type Appointment } from '@/hooks/use-appointments';
import { usePendingReminders } from '@/hooks/use-reminders';
import { useAuthStore } from '@/store/auth';
import { Avatar } from '@/components/clinic/avatar';

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function fmtDateLong(d: Date) {
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const STATUS: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  scheduled: {
    label: 'Programada',
    color: 'hsl(var(--accent-info))',
    bg: 'hsl(var(--accent-info-soft))',
    border: 'hsl(var(--accent-info) / 0.2)',
  },
  confirmed: {
    label: 'Confirmada',
    color: 'hsl(var(--brand-primary))',
    bg: 'hsl(var(--brand-primary-soft))',
    border: 'hsl(var(--brand-primary) / 0.2)',
  },
  completed: {
    label: 'Completada',
    color: 'hsl(var(--text-secondary))',
    bg: 'hsl(var(--surface-2))',
    border: 'hsl(var(--border))',
  },
  cancelled: {
    label: 'Cancelada',
    color: 'hsl(var(--accent-danger))',
    bg: 'hsl(var(--accent-danger-soft))',
    border: 'hsl(var(--accent-danger) / 0.2)',
  },
  no_show: {
    label: 'No asistió',
    color: 'hsl(var(--accent-amber))',
    bg: 'hsl(var(--accent-amber-soft))',
    border: 'hsl(var(--accent-amber) / 0.2)',
  },
  rescheduled: {
    label: 'Reprogramada',
    color: 'hsl(var(--accent-amber))',
    bg: 'hsl(var(--accent-amber-soft))',
    border: 'hsl(var(--accent-amber) / 0.2)',
  },
};

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  hue,
  trendUp,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  hue: string;
  trendUp?: boolean;
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
        {trendUp && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-brand">
            <TrendingUp className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="mb-1.5 text-xs text-text-secondary">{label}</div>
      <div className="cap-kpi-number mb-2">{value}</div>
      {delta && <div className="text-[11px] text-text-tertiary">{delta}</div>}
    </div>
  );
}

function TodayTimeline({ appointments }: { appointments: Appointment[] }) {
  const router = useRouter();

  if (appointments.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-text-tertiary">
        Sin citas hoy
      </div>
    );
  }

  const startHour = 8;
  const endHour = 19;
  const totalMin = (endHour - startHour) * 60;
  const now = new Date();
  const nowMin = Math.max(0, (now.getHours() - startHour) * 60 + now.getMinutes());
  const nowPct = Math.min(100, (nowMin / totalMin) * 100);

  return (
    <div className="px-6 pb-6 pt-5">
      {/* Time axis */}
      <div className="relative mb-2 h-[22px]">
        {Array.from({ length: endHour - startHour + 1 }).map((_, i) => {
          const h = startHour + i;
          const pct = (i / (endHour - startHour)) * 100;
          return (
            <div
              key={h}
              className="cap-mono absolute text-[10px] text-text-tertiary"
              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              {String(h).padStart(2, '0')}
            </div>
          );
        })}
      </div>
      <div className="relative mb-4 h-1 rounded-full bg-border">
        {nowMin > 0 && nowMin < totalMin && (
          <div
            className="absolute -top-1 h-3 w-0.5 rounded-sm bg-amber"
            style={{ left: `${nowPct}%` }}
          />
        )}
      </div>

      {/* Appointment cards */}
      <div className="flex flex-col gap-2">
        {appointments.map((a) => {
          const st = STATUS[a.status] || STATUS.scheduled;
          const durationMin =
            a.durationMinutes ??
            Math.round(
              (new Date(a.endDatetime).getTime() -
                new Date(a.startDatetime).getTime()) /
                60000,
            );
          return (
            <button
              key={a.id}
              onClick={() =>
                a.patient && router.push(`/dashboard/patients/${a.patient.id}`)
              }
              className="grid grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-md border border-border bg-surface px-3.5 py-3 text-left transition-all hover:border-brand-soft hover:bg-brand-softer"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-[3px] rounded-sm"
                  style={{ background: st.color }}
                />
                <div>
                  <div className="cap-mono text-[13px] font-semibold">
                    {fmtTime(a.startDatetime)}
                  </div>
                  <div className="cap-mono text-[10px] text-text-tertiary">
                    {durationMin}m
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <div className="mb-0.5 flex items-center gap-2">
                  {a.patient && (
                    <Avatar
                      name={`${a.patient.nombre} ${a.patient.apellido}`}
                      size={24}
                    />
                  )}
                  <span className="truncate text-[13px] font-medium">
                    {a.patient
                      ? `${a.patient.nombre} ${a.patient.apellido}`
                      : 'Sin paciente'}
                  </span>
                </div>
                <div className="truncate text-xs text-text-secondary">
                  {a.title ?? 'Consulta'}
                  {a.doctor ? ` · Dr. ${a.doctor.apellido}` : ''}
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: st.bg,
                  color: st.color,
                  borderColor: st.border,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: st.color }}
                />
                {st.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];
  return { start, end };
}

export default function DashboardPage() {
  const { start, end } = getMonthRange();
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: patientsReport } = usePatientsReport();
  const { data: proceduresReport } = useProceduresReport(start, end);
  const { data: appointmentsData } = useAppointments(1, 100);
  const { data: pendingReminders } = usePendingReminders();

  const today = new Date().toISOString().split('T')[0];
  const allAppointments = appointmentsData?.data || [];
  const todayAppointments = allAppointments
    .filter((a) => a.startDatetime.startsWith(today))
    .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));
  const confirmedToday = todayAppointments.filter(
    (a) => a.status === 'confirmed',
  ).length;
  const totalMinutesToday = todayAppointments.reduce(
    (s, a) =>
      s +
      (a.durationMinutes ??
        Math.round(
          (new Date(a.endDatetime).getTime() -
            new Date(a.startDatetime).getTime()) /
            60000,
        )),
    0,
  );

  const upcoming = allAppointments
    .filter(
      (a) =>
        a.startDatetime >= new Date().toISOString() &&
        a.status !== 'cancelled' &&
        a.status !== 'completed',
    )
    .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime))
    .slice(0, 5);

  const pendingCount = pendingReminders?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="cap-h1 mb-1.5">
            {getGreeting()},{' '}
            <em className="italic text-brand-dark">
              {user?.nombre ? `Dr. ${user.nombre}` : 'Doctor'}
            </em>
          </h2>
          <p className="text-sm text-text-secondary">
            {fmtDateLong(new Date())} · {todayAppointments.length} citas en agenda
            {pendingCount > 0 && ` · ${pendingCount} recordatorios pendientes`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => router.push('/dashboard/appointments')}
          >
            <Plus className="h-3.5 w-3.5" /> Nueva cita
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pacientes activos"
          value={patientsReport?.totalPatients?.toLocaleString() ?? '—'}
          delta={
            patientsReport?.newPatients
              ? `+${patientsReport.newPatients} este mes`
              : undefined
          }
          icon={Users}
          hue="hsl(var(--brand-primary))"
          trendUp
        />
        <KpiCard
          label="Citas hoy"
          value={String(todayAppointments.length)}
          delta={`${confirmedToday} confirmadas`}
          icon={Calendar}
          hue="hsl(var(--accent-info))"
        />
        <KpiCard
          label="Procedimientos · mes"
          value={proceduresReport?.totalProcedures?.toLocaleString() ?? '—'}
          delta={
            proceduresReport?.averageFollicles
              ? `Prom. ${Math.round(proceduresReport.averageFollicles)} folículos`
              : 'Este mes'
          }
          icon={Scissors}
          hue="hsl(var(--accent-amber))"
          trendUp
        />
        <KpiCard
          label="Folículos implantados"
          value={
            proceduresReport?.totalFollicles
              ? `${(proceduresReport.totalFollicles / 1000).toFixed(1)}k`
              : '—'
          }
          delta="Acumulado"
          icon={Target}
          hue="hsl(var(--accent-lilac))"
          trendUp
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Today schedule */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <div className="mb-0.5 text-[15px] font-semibold">
                Agenda de hoy
              </div>
              <div className="text-xs text-text-tertiary">
                {todayAppointments.length} citas · {totalMinutesToday} min totales
              </div>
            </div>
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-dark hover:text-brand"
            >
              Ver agenda completa <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <TodayTimeline appointments={todayAppointments} />
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          {/* Upcoming */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <div className="text-sm font-semibold">Próximas citas</div>
              <span className="text-[11px] text-text-tertiary">
                {upcoming.length}
              </span>
            </div>
            <div className="px-2 pb-2.5">
              {upcoming.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-text-tertiary">
                  No hay citas próximas
                </div>
              ) : (
                upcoming.map((a) => {
                  const d = new Date(a.startDatetime);
                  const isToday = a.startDatetime.slice(0, 10) === today;
                  const st = STATUS[a.status] || STATUS.scheduled;
                  return (
                    <button
                      key={a.id}
                      onClick={() =>
                        a.patient &&
                        router.push(`/dashboard/patients/${a.patient.id}`)
                      }
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-surface-2"
                    >
                      <div
                        className={cn(
                          'w-[42px] shrink-0 rounded-md py-1.5 text-center',
                          isToday
                            ? 'bg-brand-soft text-brand-dark'
                            : 'bg-surface-2 text-text-secondary',
                        )}
                      >
                        <div className="text-[9px] font-semibold uppercase leading-none tracking-wider">
                          {isToday
                            ? 'Hoy'
                            : d
                                .toLocaleDateString('es-MX', { weekday: 'short' })
                                .replace('.', '')}
                        </div>
                        <div className="cap-mono mt-0.5 text-xs font-semibold">
                          {fmtTime(a.startDatetime)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">
                          {a.patient
                            ? `${a.patient.nombre} ${a.patient.apellido}`
                            : 'Sin paciente'}
                        </div>
                        <div className="truncate text-[11px] text-text-tertiary">
                          {a.title ?? 'Consulta'}
                        </div>
                      </div>
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: st.color }}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Reminders */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <div className="text-sm font-semibold">Requieren atención</div>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-semibold text-amber">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                  {pendingCount} pendientes
                </span>
              )}
            </div>
            <div className="px-2 pb-3">
              {pendingCount === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-text-tertiary">
                  Todo al día
                </div>
              ) : (
                pendingReminders!.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2.5 px-3 py-2.5"
                  >
                    <Avatar
                      name={
                        r.patient
                          ? `${r.patient.nombre} ${r.patient.apellido}`
                          : '—'
                      }
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">
                        {r.reminderType}
                      </div>
                      <div className="truncate text-[11px] text-text-tertiary">
                        {r.patient
                          ? `${r.patient.nombre} ${r.patient.apellido}`
                          : ''}
                      </div>
                    </div>
                    <Link
                      href="/dashboard/reminders"
                      className="rounded-sm border border-border-strong px-2.5 py-1 text-[11px] font-medium hover:bg-surface-2"
                    >
                      Ver
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
