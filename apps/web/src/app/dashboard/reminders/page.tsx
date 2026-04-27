'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
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
  useReminders,
  useCancelReminder,
  useCreateReminder,
  type Reminder,
} from '@/hooks/use-reminders';
import { usePatients } from '@/hooks/use-patients';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  sent: { label: 'Enviado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Fallido', className: 'bg-red-50 text-red-600 border-red-200' },
  cancelled: { label: 'Cancelado', className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const TYPE_LABELS: Record<string, string> = {
  appointment: 'Cita',
  prescription_refill: 'Recarga de prescripción',
  follow_up: 'Seguimiento',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RemindersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Reminder | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [reminderType, setReminderType] = useState('appointment');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [formError, setFormError] = useState('');

  const { data, isLoading, error } = useReminders(page, 20);
  const cancelMutation = useCancelReminder();
  const createMutation = useCreateReminder();
  const { data: patientsData } = usePatients({
    query: patientSearch.length >= 2 ? patientSearch : undefined,
    pageSize: 8,
  });

  const handleCancel = async () => {
    if (!cancelTarget) return;
    await cancelMutation.mutateAsync(cancelTarget.id);
    setCancelTarget(null);
  };

  const handleCreate = async () => {
    setFormError('');
    if (!selectedPatientId || !scheduledDate) {
      setFormError('Paciente y fecha son requeridos');
      return;
    }
    try {
      await createMutation.mutateAsync({
        patientId: selectedPatientId,
        reminderType,
        scheduledFor: `${scheduledDate}T${scheduledTime}:00`,
        channel: 'internal',
      });
      setShowNew(false);
      setSelectedPatientId('');
      setSelectedPatientName('');
      setPatientSearch('');
      setScheduledDate('');
    } catch (err: any) {
      setFormError(err?.message || 'Error al crear recordatorio');
    }
  };

  let reminders = data?.data || [];
  const meta = data?.meta;
  const patients = patientsData?.data || [];
  const showPatientResults = patientSearch.length >= 2 && !selectedPatientId;

  if (statusFilter) {
    reminders = reminders.filter((r) => r.status === statusFilter);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recordatorios</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} recordatorios` : 'Gestión de recordatorios'}
          </p>
        </div>
        <Button className="h-10 font-medium shadow-sm" onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Recordatorio
        </Button>
      </div>

      {/* Filter */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[200px] h-11">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="failed">Fallido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando recordatorios...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-destructive">Error al cargar recordatorios</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No se encontraron recordatorios</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Programado</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Paciente</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Canal</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((rem) => {
                  const badge = STATUS_BADGES[rem.status] || STATUS_BADGES.pending;
                  return (
                    <TableRow key={rem.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="text-sm">{formatDateTime(rem.scheduledFor)}</TableCell>
                      <TableCell className="font-medium">
                        {rem.patient ? (
                          <Link
                            href={`/dashboard/patients/${rem.patient.id}`}
                            className="hover:underline text-primary"
                          >
                            {rem.patient.nombre} {rem.patient.apellido}
                          </Link>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {TYPE_LABELS[rem.reminderType] || rem.reminderType}
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {rem.channel}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {rem.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => setCancelTarget(rem)}
                          >
                            Cancelar
                          </Button>
                        )}
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

      {/* Cancel Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Recordatorio</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar el recordatorio para{' '}
              <strong>{cancelTarget?.patient?.nombre} {cancelTarget?.patient?.apellido}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Volver</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar Recordatorio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Reminder Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Recordatorio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Paciente <span className="text-destructive">*</span></Label>
              {selectedPatientId ? (
                <div className="flex items-center justify-between rounded-lg border p-3 bg-accent/30">
                  <span className="text-sm font-medium">{selectedPatientName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setSelectedPatientId('');
                      setSelectedPatientName('');
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar paciente..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9 h-11"
                  />
                  {showPatientResults && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border bg-popover shadow-xl max-h-48 overflow-y-auto">
                      {patients.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No encontrado</div>
                      ) : (
                        patients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
                            onClick={() => {
                              setSelectedPatientId(p.id);
                              setSelectedPatientName(`${p.nombre} ${p.apellido}`);
                              setPatientSearch('');
                            }}
                          >
                            {p.nombre} {p.apellido}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">Cita</SelectItem>
                  <SelectItem value="prescription_refill">Recarga de prescripción</SelectItem>
                  <SelectItem value="follow_up">Seguimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha <span className="text-destructive">*</span></Label>
                <DatePicker
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  fromDate={new Date()}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
