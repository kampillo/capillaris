'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { usePatients, useDeletePatient } from '@/hooks/use-patients';
import type { Patient } from '@/hooks/use-patients';

const PATIENT_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  lead: { label: 'Lead', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  registered: { label: 'Registrado', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  evaluation: { label: 'Evaluación', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  active: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactivo', className: 'bg-red-50 text-red-600 border-red-200' },
  archived: { label: 'Archivado', className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

export default function PatientsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoPaciente, setTipoPaciente] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const { data, isLoading, error } = usePatients({
    query: searchQuery || undefined,
    tipoPaciente: tipoPaciente || undefined,
    page,
    pageSize: 20,
  });

  const deleteMutation = useDeletePatient();

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleFilterChange = (value: string) => {
    setTipoPaciente(value === 'all' ? '' : value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const patients = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pacientes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} pacientes registrados` : 'Gestión de pacientes del sistema'}
          </p>
        </div>
        <Button className="h-10 font-medium shadow-sm" asChild>
          <Link href="/dashboard/patients/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Paciente
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
            <Select value={tipoPaciente || 'all'} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full sm:w-[200px] h-11">
                <SelectValue placeholder="Tipo de paciente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="registered">Registrado</SelectItem>
                <SelectItem value="evaluation">Evaluación</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando pacientes...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-destructive">Error al cargar pacientes</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No se encontraron pacientes</p>
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => handleSearch('')}>
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Nombre</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Celular</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Origen</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => {
                  const badge = PATIENT_TYPE_BADGES[patient.tipoPaciente || 'lead'];
                  return (
                    <TableRow
                      key={patient.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                    >
                      <TableCell className="font-medium">
                        {patient.nombre} {patient.apellido}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {patient.email || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {patient.celular || '—'}
                      </TableCell>
                      <TableCell>
                        {badge && (
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {patient.origenCanal || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                            <Link href={`/dashboard/patients/${patient.id}/edit`}>
                              Editar
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(patient)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Página {meta.page} de {meta.totalPages} ({meta.total} resultados)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Paciente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong>{deleteTarget?.nombre} {deleteTarget?.apellido}</strong>?
              Esta acción se puede revertir.
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
