'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, Clock, Calendar, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programada', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  confirmed: { label: 'Confirmada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completada', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  cancelled: { label: 'Cancelada', className: 'bg-red-50 text-red-600 border-red-200' },
  no_show: { label: 'No asistió', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  rescheduled: { label: 'Reprogramada', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
  confirmed: 'bg-green-100 border-green-300 text-green-800',
  completed: 'bg-gray-100 border-gray-300 text-gray-600',
  cancelled: 'bg-red-100 border-red-300 text-red-800',
  no_show: 'bg-orange-100 border-orange-300 text-orange-800',
  rescheduled: 'bg-yellow-100 border-yellow-300 text-yellow-800',
};

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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
  });
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
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

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CalendarView({ appointments }: { appointments: Appointment[] }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const days = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((a) => {
      const key = a.startDatetime.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appointments]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const todayKey = toDateKey(today);

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold">
            {MONTH_NAMES[calMonth]} {calYear}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2 uppercase">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-l rounded-lg overflow-hidden">
          {days.map((day, i) => {
            const key = toDateKey(day.date);
            const dayAppointments = appointmentsByDate[key] || [];
            const isToday = key === todayKey;

            return (
              <div
                key={i}
                className={`min-h-[80px] border-r border-b p-1 ${
                  day.isCurrentMonth ? 'bg-background' : 'bg-muted/20'
                }`}
              >
                <div
                  className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-primary text-primary-foreground'
                      : day.isCurrentMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/50'
                  }`}
                >
                  {day.date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayAppointments.slice(0, 3).map((a) => {
                    const colorClass = STATUS_COLORS[a.status] || STATUS_COLORS.scheduled;
                    return (
                      <div
                        key={a.id}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded border truncate ${colorClass}`}
                        title={`${formatTime(a.startDatetime)} - ${a.patient?.nombre || ''} ${a.patient?.apellido || ''}`}
                      >
                        {formatTime(a.startDatetime)} {a.patient?.nombre || ''}
                      </div>
                    );
                  })}
                  {dayAppointments.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayAppointments.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AppointmentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [view, setView] = useState<'table' | 'calendar'>('table');

  const { data, isLoading, error } = useAppointments(page, view === 'calendar' ? 100 : 20);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Citas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} citas registradas` : 'Gestión de citas y agenda'}
          </p>
        </div>
        <Button className="h-10 font-medium shadow-sm" asChild>
          <Link href="/dashboard/appointments/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Link>
        </Button>
      </div>

      {/* Filter + View Toggle */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[200px] h-11">
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
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <Button
                variant={view === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setView('table')}
              >
                <List className="h-3.5 w-3.5 mr-1" /> Lista
              </Button>
              <Button
                variant={view === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setView('calendar')}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Calendario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">Cargando citas...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-sm text-destructive">Error al cargar citas</p>
          </CardContent>
        </Card>
      ) : view === 'calendar' ? (
        <CalendarView appointments={appointments} />
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No se encontraron citas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Hora</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Paciente</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Doctor</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Título</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Estado</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => {
                    const badge = STATUS_BADGES[appt.status] || STATUS_BADGES.scheduled;
                    return (
                      <TableRow key={appt.id} className="hover:bg-accent/50 transition-colors">
                        <TableCell className="text-sm">
                          {formatDate(appt.startDatetime)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatTime(appt.startDatetime)} - {formatTime(appt.endDatetime)}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {appt.patient ? (
                            <Link
                              href={`/dashboard/patients/${appt.patient.id}`}
                              className="hover:underline text-primary"
                            >
                              {appt.patient.nombre} {appt.patient.apellido}
                            </Link>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {appt.doctor ? `Dr. ${appt.doctor.nombre} ${appt.doctor.apellido}` : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {appt.title || '—'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={appt.status}
                            onValueChange={(v) => handleStatusChange(appt.id, v)}
                          >
                            <SelectTrigger className="w-[140px] h-8 border-0 bg-transparent p-0">
                              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                                {badge.label}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Programada</SelectItem>
                              <SelectItem value="confirmed">Confirmada</SelectItem>
                              <SelectItem value="completed">Completada</SelectItem>
                              <SelectItem value="cancelled">Cancelada</SelectItem>
                              <SelectItem value="no_show">No asistió</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(appt)}
                          >
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Página {meta.page} de {meta.totalPages} ({meta.total} resultados)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button variant="outline" size="sm" className="h-8" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Cita</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la cita de{' '}
              <strong>{deleteTarget?.patient?.nombre} {deleteTarget?.patient?.apellido}</strong>
              {deleteTarget ? ` del ${formatDate(deleteTarget.startDatetime)}` : ''}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
