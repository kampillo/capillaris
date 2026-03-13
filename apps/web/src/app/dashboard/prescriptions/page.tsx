'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  usePrescriptions,
  useDeletePrescription,
  type Prescription,
} from '@/hooks/use-prescriptions';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  active: { label: 'Activa', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completada', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  cancelled: { label: 'Cancelada', className: 'bg-red-50 text-red-600 border-red-200' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PrescriptionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);

  const { data, isLoading, error } = usePrescriptions(page, 20);
  const deleteMutation = useDeletePrescription();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  let prescriptions = data?.data || [];
  const meta = data?.meta;

  if (statusFilter) {
    prescriptions = prescriptions.filter((p) => p.status === statusFilter);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prescripciones</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} prescripciones registradas` : 'Gestión de prescripciones médicas'}
          </p>
        </div>
        <Button className="h-10 font-medium shadow-sm" asChild>
          <Link href="/dashboard/prescriptions/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Prescripción
          </Link>
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
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando prescripciones...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-destructive">Error al cargar prescripciones</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Pill className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No se encontraron prescripciones</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Paciente</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Doctor</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Medicamentos</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((rx) => {
                  const badge = STATUS_BADGES[rx.status] || STATUS_BADGES.draft;
                  return (
                    <TableRow key={rx.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="text-sm">{formatDate(rx.prescriptionDate)}</TableCell>
                      <TableCell className="font-medium">
                        {rx.patient ? (
                          <Link
                            href={`/dashboard/patients/${rx.patient.id}`}
                            className="hover:underline text-primary"
                          >
                            {rx.patient.nombre} {rx.patient.apellido}
                          </Link>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rx.doctor ? `Dr. ${rx.doctor.nombre} ${rx.doctor.apellido}` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {rx.items?.length
                          ? rx.items.map((i) => i.medicineName).join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(rx)}
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

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Prescripción</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la prescripción de{' '}
              <strong>{deleteTarget?.patient?.nombre} {deleteTarget?.patient?.apellido}</strong>
              {deleteTarget ? ` del ${formatDate(deleteTarget.prescriptionDate)}` : ''}?
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
