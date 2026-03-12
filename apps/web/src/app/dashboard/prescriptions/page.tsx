'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
  usePrescriptions,
  useDeletePrescription,
  type Prescription,
} from '@/hooks/use-prescriptions';

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  active: { label: 'Activa', variant: 'default' },
  completed: { label: 'Completada', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
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
          <h2 className="text-3xl font-bold tracking-tight">Prescripciones</h2>
          <p className="text-muted-foreground">
            {meta ? `${meta.total} prescripciones registradas` : 'Gestión de prescripciones médicas'}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/prescriptions/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Prescripción
          </Link>
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
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
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
              <p className="text-muted-foreground">Cargando prescripciones...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-destructive">Error al cargar prescripciones</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-muted-foreground">No se encontraron prescripciones</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Medicamentos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((rx) => {
                  const badge = STATUS_BADGES[rx.status] || STATUS_BADGES.draft;
                  return (
                    <TableRow key={rx.id}>
                      <TableCell>{formatDate(rx.prescriptionDate)}</TableCell>
                      <TableCell className="font-medium">
                        {rx.patient ? (
                          <Link
                            href={`/dashboard/patients/${rx.patient.id}`}
                            className="hover:underline"
                          >
                            {rx.patient.nombre} {rx.patient.apellido}
                          </Link>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rx.doctor ? `Dr. ${rx.doctor.nombre} ${rx.doctor.apellido}` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rx.items?.length
                          ? rx.items.map((i) => i.medicineName).join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
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

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Prescripción</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la prescripción de{' '}
              <strong>{deleteTarget?.patient?.nombre} {deleteTarget?.patient?.apellido}</strong>
              {deleteTarget ? ` del ${formatDate(deleteTarget.prescriptionDate)}` : ''}?
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
