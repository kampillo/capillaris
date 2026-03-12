'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  useReminders,
  useCancelReminder,
  useCreateReminder,
  type Reminder,
} from '@/hooks/use-reminders';
import { usePatients } from '@/hooks/use-patients';

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendiente', variant: 'outline' },
  sent: { label: 'Enviado', variant: 'default' },
  failed: { label: 'Fallido', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'secondary' },
};

const TYPE_LABELS: Record<string, string> = {
  appointment: 'Cita',
  prescription: 'Prescripción',
  followup: 'Seguimiento',
  general: 'General',
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

  // New reminder form state
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [reminderType, setReminderType] = useState('general');
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
          <h2 className="text-3xl font-bold tracking-tight">Recordatorios</h2>
          <p className="text-muted-foreground">
            {meta ? `${meta.total} recordatorios` : 'Gestión de recordatorios'}
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Recordatorio
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando recordatorios...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-destructive">Error al cargar recordatorios</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No se encontraron recordatorios</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Programado</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((rem) => {
                  const badge = STATUS_BADGES[rem.status] || STATUS_BADGES.pending;
                  return (
                    <TableRow key={rem.id}>
                      <TableCell>{formatDateTime(rem.scheduledFor)}</TableCell>
                      <TableCell className="font-medium">
                        {rem.patient ? (
                          <Link
                            href={`/dashboard/patients/${rem.patient.id}`}
                            className="hover:underline"
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
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {rem.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
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

      {/* Cancel Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Recordatorio</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar el recordatorio para{' '}
              <strong>{cancelTarget?.patient?.nombre} {cancelTarget?.patient?.apellido}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Volver</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar Recordatorio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Reminder Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Recordatorio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            {/* Patient search */}
            <div className="space-y-2">
              <Label>Paciente *</Label>
              {selectedPatientId ? (
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-sm font-medium">{selectedPatientName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
                    className="pl-9"
                  />
                  {showPatientResults && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                      {patients.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No encontrado</div>
                      ) : (
                        patients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
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

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="appointment">Cita</SelectItem>
                  <SelectItem value="prescription">Prescripción</SelectItem>
                  <SelectItem value="followup">Seguimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
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
