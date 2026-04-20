'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  List,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAppointments,
  useDeleteAppointment,
  useUpdateAppointment,
  type Appointment,
} from '@/hooks/use-appointments';
import {
  useGoogleCalendarEvents,
  useGoogleCalendarStatus,
  type GoogleCalendarEvent,
} from '@/hooks/use-google-calendar';
import { Segmented } from '@/components/clinic/segmented';

// ── Constants ──────────────────────────────────────────────

const STATUS: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  scheduled: {
    label: 'Programada',
    color: 'hsl(var(--accent-info))',
    bg: 'hsl(var(--accent-info-soft))',
    border: 'hsl(var(--accent-info) / 0.25)',
  },
  confirmed: {
    label: 'Confirmada',
    color: 'hsl(var(--brand-primary))',
    bg: 'hsl(var(--brand-primary-soft))',
    border: 'hsl(var(--brand-primary) / 0.25)',
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
    border: 'hsl(var(--accent-danger) / 0.25)',
  },
  no_show: {
    label: 'No asistió',
    color: 'hsl(var(--accent-amber))',
    bg: 'hsl(var(--accent-amber-soft))',
    border: 'hsl(var(--accent-amber) / 0.25)',
  },
  rescheduled: {
    label: 'Reprogramada',
    color: 'hsl(var(--accent-amber))',
    bg: 'hsl(var(--accent-amber-soft))',
    border: 'hsl(var(--accent-amber) / 0.25)',
  },
};

const GOOGLE_STYLE = {
  color: 'hsl(var(--accent-lilac))',
  bg: 'hsl(var(--accent-lilac-soft))',
  border: 'hsl(var(--accent-lilac) / 0.25)',
};

const WEEKDAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

// ── Helpers ────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }
  return days;
}

// ── Unified calendar item type ─────────────────────────────

interface CalendarItem {
  id: string;
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string;
  source: 'local' | 'google';
  status?: string;
  patientName?: string;
  doctorName?: string;
  patientId?: string;
  htmlLink?: string | null;
}

function mergeItems(
  appointments: Appointment[],
  googleEvents: GoogleCalendarEvent[],
): CalendarItem[] {
  const linkedGoogleIds = new Set<string>();
  const items: CalendarItem[] = [];

  for (const a of appointments) {
    if (a.googleCalendarEventId) {
      linkedGoogleIds.add(a.googleCalendarEventId);
    }
    items.push({
      id: a.id,
      title: a.title || `Cita - ${a.patient?.nombre || 'Paciente'}`,
      description: a.description || null,
      startDatetime: a.startDatetime,
      endDatetime: a.endDatetime,
      source: 'local',
      status: a.status,
      patientName: a.patient
        ? `${a.patient.nombre} ${a.patient.apellido}`
        : undefined,
      doctorName: a.doctor
        ? `Dr. ${a.doctor.nombre} ${a.doctor.apellido}`
        : undefined,
      patientId: a.patient?.id,
    });
  }

  for (const g of googleEvents) {
    if (g.id && linkedGoogleIds.has(g.id)) continue;
    if (!g.startDatetime || !g.endDatetime) continue;
    items.push({
      id: `google-${g.id}`,
      title: g.title,
      description: g.description,
      startDatetime: g.startDatetime,
      endDatetime: g.endDatetime,
      source: 'google',
      htmlLink: g.htmlLink,
    });
  }

  return items;
}

function StatusPill({ status }: { status: string }) {
  const st = STATUS[status] || STATUS.scheduled;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: st.bg, color: st.color, borderColor: st.border }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: st.color }}
      />
      {st.label}
    </span>
  );
}

// ── Week View ──────────────────────────────────────────────

function WeekView({
  items,
  weekStart,
}: {
  items: CalendarItem[];
  weekStart: Date;
}) {
  const today = new Date();
  const todayKey = toDateKey(today);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const itemsByDay = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    for (const item of items) {
      const key = item.startDatetime.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));
    }
    return map;
  }, [items]);

  const nowHour = today.getHours();
  const nowMinute = today.getMinutes();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Header with day names */}
          <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border bg-surface-2">
            <div className="p-2" />
            {weekDays.map((day, i) => {
              const key = toDateKey(day);
              const isToday = key === todayKey;
              return (
                <div
                  key={i}
                  className={cn(
                    'border-l border-border p-2.5 text-center',
                    isToday && 'bg-brand-softer',
                  )}
                >
                  <div className="cap-eyebrow">{WEEKDAY_NAMES_SHORT[i]}</div>
                  <div
                    className={cn(
                      'cap-mono mx-auto mt-1 flex h-8 w-8 items-center justify-center text-base font-medium',
                      isToday
                        ? 'rounded-full bg-brand text-white'
                        : 'text-foreground',
                    )}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid min-h-[60px] grid-cols-[64px_repeat(7,1fr)]"
              >
                <div className="border-b border-border p-1 pr-2 text-right">
                  <span className="cap-mono text-[11px] text-text-tertiary">
                    {formatHour(hour)}
                  </span>
                </div>
                {weekDays.map((day, dayIdx) => {
                  const dayKey = toDateKey(day);
                  const isToday = dayKey === todayKey;
                  const dayItems = itemsByDay[dayKey] || [];
                  const hourItems = dayItems.filter((item) => {
                    const itemHour = new Date(item.startDatetime).getHours();
                    return itemHour === hour;
                  });

                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        'relative min-h-[60px] border-b border-l border-border',
                        isToday && 'bg-brand-softer/40',
                      )}
                    >
                      {hourItems.map((item) => {
                        const start = new Date(item.startDatetime);
                        const end = new Date(item.endDatetime);
                        const durationMin =
                          (end.getTime() - start.getTime()) / 60000;
                        const heightPx = Math.max(24, (durationMin / 60) * 60);
                        const topPx = (start.getMinutes() / 60) * 60;
                        const isGoogle = item.source === 'google';
                        const style = isGoogle
                          ? GOOGLE_STYLE
                          : STATUS[item.status || 'scheduled'] ||
                            STATUS.scheduled;

                        return (
                          <div
                            key={item.id}
                            className="absolute left-0.5 right-0.5 cursor-default overflow-hidden rounded-md border px-1.5 py-0.5"
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              zIndex: 10,
                              background: style.bg,
                              color: style.color,
                              borderColor: style.border,
                            }}
                            title={`${formatTime(item.startDatetime)} - ${formatTime(item.endDatetime)}\n${item.title}${item.patientName ? `\n${item.patientName}` : ''}${item.doctorName ? `\n${item.doctorName}` : ''}`}
                          >
                            <div className="cap-mono truncate text-[10px] font-semibold leading-tight">
                              {formatTime(item.startDatetime)}{' '}
                              <span className="font-normal">{item.title}</span>
                            </div>
                            {heightPx >= 36 && item.patientName && (
                              <div className="truncate text-[10px] leading-tight opacity-80">
                                {item.patientName}
                              </div>
                            )}
                            {heightPx >= 48 && item.doctorName && (
                              <div className="truncate text-[10px] leading-tight opacity-70">
                                {item.doctorName}
                              </div>
                            )}
                            {isGoogle && (
                              <div className="flex items-center gap-0.5 truncate text-[9px] leading-tight opacity-60">
                                <ExternalLink className="h-2.5 w-2.5" /> Google
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Current time indicator */}
            {weekDays.some((d) => toDateKey(d) === todayKey) &&
              nowHour >= HOURS[0] &&
              nowHour <= HOURS[HOURS.length - 1] &&
              (() => {
                const todayIdx = weekDays.findIndex(
                  (d) => toDateKey(d) === todayKey,
                );
                const topOffset =
                  (nowHour - HOURS[0]) * 60 + (nowMinute / 60) * 60;
                return (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      top: `${topOffset}px`,
                      left: `calc(64px + ${todayIdx} * ((100% - 64px) / 7))`,
                      width: `calc((100% - 64px) / 7)`,
                      zIndex: 20,
                    }}
                  >
                    <div className="flex items-center">
                      <div className="-ml-1 h-2 w-2 rounded-full bg-amber" />
                      <div className="h-[2px] flex-1 bg-amber" />
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Month View ─────────────────────────────────────────────

function MonthView({ items }: { items: CalendarItem[] }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const days = useMemo(
    () => getCalendarDays(calYear, calMonth),
    [calYear, calMonth],
  );

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    items.forEach((item) => {
      const key = item.startDatetime.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [items]);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else setCalMonth(calMonth + 1);
  };

  const todayKey = toDateKey(today);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={prevMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="cap-h2 text-xl">
          {MONTH_NAMES[calMonth]}{' '}
          <span className="cap-mono text-text-secondary">{calYear}</span>
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={nextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAY_NAMES_SHORT.map((d) => (
          <div key={d} className="cap-eyebrow py-2 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border-l border-t border-border">
        {days.map((day, i) => {
          const key = toDateKey(day.date);
          const dayItems = itemsByDate[key] || [];
          const isToday = key === todayKey;

          return (
            <div
              key={i}
              className={cn(
                'min-h-[84px] border-b border-r border-border p-1.5',
                day.isCurrentMonth ? 'bg-surface' : 'bg-surface-2/50',
              )}
            >
              <div
                className={cn(
                  'cap-mono mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday
                    ? 'bg-brand text-white'
                    : day.isCurrentMonth
                      ? 'text-foreground'
                      : 'text-text-tertiary/60',
                )}
              >
                {day.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((item) => {
                  const isGoogle = item.source === 'google';
                  const style = isGoogle
                    ? GOOGLE_STYLE
                    : STATUS[item.status || 'scheduled'] || STATUS.scheduled;
                  return (
                    <div
                      key={item.id}
                      className="truncate rounded-sm border px-1 py-0.5 text-[10px] leading-tight"
                      style={{
                        background: style.bg,
                        color: style.color,
                        borderColor: style.border,
                      }}
                      title={`${formatTime(item.startDatetime)} - ${item.title}`}
                    >
                      <span className="cap-mono">
                        {formatTime(item.startDatetime)}
                      </span>{' '}
                      {item.title}
                    </div>
                  );
                })}
                {dayItems.length > 3 && (
                  <div className="px-1 text-[10px] text-text-tertiary">
                    +{dayItems.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function AppointmentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [view, setView] = useState<'table' | 'week' | 'month'>('week');

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const timeRange = useMemo(() => {
    if (view === 'week') {
      const min = weekStart.toISOString();
      const max = addDays(weekStart, 7).toISOString();
      return { timeMin: min, timeMax: max };
    }
    return { timeMin: undefined, timeMax: undefined };
  }, [view, weekStart]);

  const isCalendarView = view === 'week' || view === 'month';

  const { data, isLoading, error } = useAppointments(
    page,
    isCalendarView ? 500 : 20,
    timeRange.timeMin,
    timeRange.timeMax,
  );

  const { data: googleStatus } = useGoogleCalendarStatus();
  const { data: googleEvents = [] } = useGoogleCalendarEvents(
    timeRange.timeMin ||
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ).toISOString(),
    timeRange.timeMax ||
      new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ).toISOString(),
    !!googleStatus?.connected,
  );

  const deleteMutation = useDeleteAppointment();
  const updateMutation = useUpdateAppointment();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    await updateMutation.mutateAsync({
      id: appointmentId,
      data: { status: newStatus },
    });
  };

  let appointments = data?.data || [];
  const meta = data?.meta;

  if (statusFilter) {
    appointments = appointments.filter((a) => a.status === statusFilter);
  }

  const calendarItems = useMemo(
    () => mergeItems(appointments, googleEvents),
    [appointments, googleEvents],
  );

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const goToday = () => setWeekStart(getMonday(new Date()));

  const weekEnd = addDays(weekStart, 6);
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekStart.getFullYear()}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="cap-h2 mb-1">Agenda</h2>
          <p className="text-[13px] text-text-secondary">
            {meta
              ? `${meta.total} citas${isCalendarView ? ' en este período' : ' registradas'}`
              : 'Cargando...'}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" asChild>
          <Link href="/dashboard/appointments/new">
            <Plus className="h-3.5 w-3.5" /> Nueva cita
          </Link>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="scheduled">Programada</SelectItem>
              <SelectItem value="confirmed">Confirmada</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
              <SelectItem value="no_show">No asistió</SelectItem>
              <SelectItem value="rescheduled">Reprogramada</SelectItem>
            </SelectContent>
          </Select>

          {view === 'week' && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={goToday}
              >
                Hoy
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={prevWeek}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="cap-mono min-w-[220px] text-center text-sm font-medium">
                {weekLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={nextWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {googleStatus?.connected && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: GOOGLE_STYLE.bg,
                color: GOOGLE_STYLE.color,
                borderColor: GOOGLE_STYLE.border,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: GOOGLE_STYLE.color }}
              />
              Google Calendar
            </span>
          )}
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'week', label: 'Semana', icon: Calendar },
              { value: 'month', label: 'Mes', icon: LayoutGrid },
              { value: 'table', label: 'Lista', icon: List },
            ]}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-surface py-16 shadow-xs">
          <p className="text-sm text-text-secondary">Cargando citas...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-surface py-16 shadow-xs">
          <p className="text-sm text-destructive">Error al cargar citas</p>
        </div>
      ) : view === 'week' ? (
        <WeekView items={calendarItems} weekStart={weekStart} />
      ) : view === 'month' ? (
        <MonthView items={calendarItems} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
                <Calendar className="h-6 w-6 text-text-tertiary" />
              </div>
              <p className="text-sm text-text-secondary">
                No se encontraron citas
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    {[
                      'Fecha',
                      'Hora',
                      'Paciente',
                      'Doctor',
                      'Título',
                      'Estado',
                      '',
                    ].map((h, i) => (
                      <th key={i} className="cap-eyebrow px-4 py-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-2"
                    >
                      <td className="px-4 py-3.5 text-sm">
                        {formatDate(appt.startDatetime)}
                      </td>
                      <td className="cap-mono px-4 py-3.5 text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                          {formatTime(appt.startDatetime)} -{' '}
                          {formatTime(appt.endDatetime)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium">
                        {appt.patient ? (
                          <Link
                            href={`/dashboard/patients/${appt.patient.id}`}
                            className="text-brand-dark hover:underline"
                          >
                            {appt.patient.nombre} {appt.patient.apellido}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">
                        {appt.doctor
                          ? `Dr. ${appt.doctor.nombre} ${appt.doctor.apellido}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">
                        {appt.title || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Select
                          value={appt.status}
                          onValueChange={(v) => handleStatusChange(appt.id, v)}
                        >
                          <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent p-0">
                            <StatusPill status={appt.status} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Programada</SelectItem>
                            <SelectItem value="confirmed">Confirmada</SelectItem>
                            <SelectItem value="completed">Completada</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                            <SelectItem value="no_show">No asistió</SelectItem>
                            <SelectItem value="rescheduled">
                              Reprogramada
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(appt)}
                        >
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-[11px] text-text-tertiary">
                Página {meta.page} de {meta.totalPages} · {meta.total} resultados
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar cita</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la cita de{' '}
              <strong>
                {deleteTarget?.patient?.nombre} {deleteTarget?.patient?.apellido}
              </strong>
              {deleteTarget
                ? ` del ${formatDate(deleteTarget.startDatetime)}`
                : ''}
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
