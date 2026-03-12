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

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Programada', variant: 'outline' },
  confirmed: { label: 'Confirmada', variant: 'default' },
  completed: { label: 'Completada', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
  no_show: { label: 'No asistió', variant: 'destructive' },
  rescheduled: { label: 'Reprogramada', variant: 'outline' },
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
  // Monday=0 based
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // Next month padding to fill 6 rows
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  return days;
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Calendar View Component
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
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const todayKey = toDateKey(today);

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {MONTH_NAMES[calMonth]} {calYear}
          </h3>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 border-t border-l">
          {days.map((day, i) => {
            const key = toDateKey(day.date);
            const dayAppointments = appointmentsByDate[key] || [];
            const isToday = key === todayKey;

            return (
              <div
                key={i}
                className={`min-h-[80px] border-r border-b p-1 ${
                  day.isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                }`}
              >
                <div
                  className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-primary text-primary-foreground'
                      : day.isCurrentMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground'
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
          <h2 className="text-3xl font-bold tracking-tight">Citas</h2>
          <p className="text-muted-foreground">
            {meta ? `${meta.total} citas registradas` : 'Gestión de citas y agenda'}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/appointments/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Link>
        </Button>
      </div>

      {/* Filter + View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="scheduled">Programada</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="no_show">No asistió</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button
                variant={view === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('table')}
              >
                <List className="h-4 w-4 mr-1" /> Lista
              </Button>
              <Button
                variant={view === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('calendar')}
              >
                <LayoutGrid className="h-4 w-4 mr-1" /> Calendario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando citas...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-destructive">Error al cargar citas</p>
          </CardContent>
        </Card>
      ) : view === 'calendar' ? (
        <CalendarView appointments={appointments} />
      ) : (
        <>
          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-muted-foreground">No se encontraron citas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appt) => {
                      const badge = STATUS_BADGES[appt.status] || STATUS_BADGES.scheduled;
                      return (
                        <TableRow key={appt.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(appt.startDatetime)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {formatTime(appt.startDatetime)} - {formatTime(appt.endDatetime)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {appt.patient ? (
                              <Link
                                href={`/dashboard/patients/${appt.patient.id}`}
                                className="hover:underline"
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
                              <SelectTrigger className="w-[140px] h-8">
                                <Badge variant={badge.variant}>{badge.label}</Badge>
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
                              className="text-destructive hover:text-destructive"
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
                <p className="text-sm text-muted-foreground">
                  Página {meta.page} de {meta.totalPages} ({meta.total} resultados)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Cita</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la cita de{' '}
              <strong>{deleteTarget?.patient?.nombre} {deleteTarget?.patient?.apellido}</strong>
              {deleteTarget ? ` del ${formatDate(deleteTarget.startDatetime)}` : ''}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
