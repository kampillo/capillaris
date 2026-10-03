'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePatients, useDeletePatient } from '@/hooks/use-patients';
import type { Patient, PatientSortField } from '@/hooks/use-patients';
import { api } from '@/lib/api';
import { useHasRole } from '@/hooks/use-has-role';
import { Avatar } from '@/components/clinic/avatar';
import { patientContextHref, patientListHref, readPatientListState } from '@/lib/patient-list-navigation';
import type { PatientListState } from '@/lib/patient-list-navigation';

const PATIENT_TYPE: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  lead: {
    label: 'Lead',
    color: 'hsl(var(--accent-lilac))',
    bg: 'hsl(var(--accent-lilac-soft))',
    border: 'hsl(var(--accent-lilac) / 0.25)',
  },
  registered: {
    label: 'Registrado',
    color: 'hsl(var(--accent-info))',
    bg: 'hsl(var(--accent-info-soft))',
    border: 'hsl(var(--accent-info) / 0.25)',
  },
  evaluation: {
    label: 'Evaluación',
    color: 'hsl(var(--accent-amber))',
    bg: 'hsl(var(--accent-amber-soft))',
    border: 'hsl(var(--accent-amber) / 0.25)',
  },
  active: {
    label: 'Activo',
    color: 'hsl(var(--brand-primary))',
    bg: 'hsl(var(--brand-primary-soft))',
    border: 'hsl(var(--brand-primary) / 0.25)',
  },
  inactive: {
    label: 'Inactivo',
    color: 'hsl(var(--text-secondary))',
    bg: 'hsl(var(--surface-2))',
    border: 'hsl(var(--border))',
  },
  archived: {
    label: 'Archivado',
    color: 'hsl(var(--text-tertiary))',
    bg: 'hsl(var(--surface-2))',
    border: 'hsl(var(--border))',
  },
};

const CHANNEL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  web: 'Web',
  referido: 'Referido',
  google: 'Google',
  otro: 'Otro',
};

const TABS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'evaluation', label: 'Evaluación' },
  { value: 'registered', label: 'Registrados' },
  { value: 'lead', label: 'Leads' },
  { value: 'inactive', label: 'Inactivos' },
];

function fmtDateShort(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type SortableColumn = {
  key: PatientSortField;
  label: string;
};

const SORTABLE_COLUMNS: Record<PatientSortField, SortableColumn> = {
  name: { key: 'name', label: 'Paciente' },
  tipoPaciente: { key: 'tipoPaciente', label: 'Estado' },
  origenCanal: { key: 'origenCanal', label: 'Origen' },
  updatedAt: { key: 'updatedAt', label: 'Última visita' },
  createdAt: { key: 'createdAt', label: 'Creado' },
};

function SortableTh({
  column,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: SortableColumn;
  sortBy: PatientSortField;
  sortOrder: 'asc' | 'desc';
  onSort: (key: PatientSortField) => void;
}) {
  const active = sortBy === column.key;
  const Icon = !active
    ? ChevronsUpDown
    : sortOrder === 'asc'
      ? ChevronUp
      : ChevronDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-4 py-2 text-left text-sm font-semibold text-text-secondary', column.key === 'name' && 'w-44 bg-surface-2 sm:w-56 md:sticky md:left-0 md:z-20')}
    >
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={cn(
          'inline-flex min-h-11 items-center gap-1 transition-colors hover:text-foreground',
          active ? 'text-foreground' : 'text-text-tertiary',
        )}
      >
        {column.label}
        <Icon
          className={cn(
            'h-3 w-3',
            active ? 'opacity-100' : 'opacity-60',
          )}
        />
      </button>
    </th>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listState, setListState] = useState(() => readPatientListState(searchParams));
  const { query: searchQuery, filter, page, sortBy, sortOrder } = listState;
  const returnTo = patientListHref(listState);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const canCreatePatient = useHasRole('admin', 'doctor', 'receptionist');
  // Borrar es sólo de admin: el endpoint lo exige y casi siempre lo correcto
  // es fusionar, no borrar (ver Configuración → Pacientes duplicados).
  const canDeletePatient = useHasRole('admin');
  const canExportPatients = useHasRole('admin');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    setListState(readPatientListState(searchParams));
  }, [searchParams]);

  const updateList = (changes: Partial<PatientListState>) => {
    const next = { ...listState, ...changes };
    setListState(next);
    // Next's native history integration keeps the URL current without a reload.
    window.history.replaceState(null, '', patientListHref(next));
  };

  const { data, isLoading, error } = usePatients({
    query: searchQuery || undefined,
    tipoPaciente: filter === 'all' ? undefined : filter,
    page,
    pageSize: 20,
    sortBy,
    sortOrder,
  });

  const handleSort = (key: PatientSortField) => {
    if (sortBy === key) {
      updateList({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      updateList({ sortBy: key, sortOrder: key === 'name' || key === 'tipoPaciente' ? 'asc' : 'desc', page: 1 });
    }
  };

  const deleteMutation = useDeletePatient();

  const handleSearch = (value: string) => {
    updateList({ query: value, page: 1 });
  };

  const handleFilter = (value: string) => {
    updateList({ filter: value as PatientListState['filter'], page: 1 });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleExport = async () => {
    setExporting(true); setExportError('');
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.query = searchQuery;
      if (filter !== 'all') params.tipoPaciente = filter;
      const blob = await api.download('/patients/export', { params });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `pacientes-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link); link.click(); link.remove();
      // Safari and embedded browsers may consume the URL after the click returns.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setExportError(error instanceof Error ? error.message : 'No se pudo exportar'); }
    finally { setExporting(false); }
  };

  const patients = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="cap-h2 mb-1">Pacientes</h2>
          <p className="text-[13px] text-text-secondary">
            {meta ? `${meta.total} ${meta.total === 1 ? 'resultado' : 'resultados'}` : 'Cargando...'}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {canExportPatients && <Button variant="outline" size="sm" className="min-h-11 gap-1.5" onClick={handleExport} disabled={exporting} title="Todos los resultados del filtro, sin notas clínicas">
            <Download className="h-3.5 w-3.5" /> {exporting ? 'Exportando…' : 'Exportar Excel'}
          </Button>}
          {canCreatePatient && (
            <Button size="sm" className="min-h-11 gap-1.5" asChild>
              <Link href="/dashboard/patients/new">
                <Plus className="h-3.5 w-3.5" /> Nuevo paciente
              </Link>
            </Button>
          )}
        </div>
      </div>

      {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}

      {/* Tabs */}
      <div aria-label="Filtrar pacientes por estado" className="-mb-px flex flex-wrap gap-0.5 border-b border-border sm:flex-nowrap sm:overflow-x-auto">
        {TABS.map((t) => {
          const active = filter === t.value;
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={active}
              onClick={() => handleFilter(t.value)}
              className={cn(
                '-mb-px inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors',
                active
                  ? 'border-brand font-medium text-foreground'
                  : 'border-transparent text-text-secondary hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search row */}
      <div className="flex flex-wrap gap-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            placeholder="Buscar por nombre, email o teléfono…"
            aria-label="Buscar por nombre, email o teléfono"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 pl-9 text-base sm:text-sm"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-text-secondary">Cargando pacientes...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-destructive">Error al cargar pacientes</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
              <Users className="h-6 w-6 text-text-tertiary" />
            </div>
            <p className="text-sm text-text-secondary">
              Sin resultados.
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="ml-1.5 text-brand-dark underline underline-offset-2 hover:text-brand"
                >
                  Limpiar búsqueda
                </button>
              )}
            </p>
          </div>
        ) : (
          <div>
            <p id="patients-scroll-hint" className="border-b border-border px-4 py-3 text-sm text-text-secondary md:hidden">
              Desliza la tabla para ver contacto, fechas y acciones.
            </p>
            <div role="region" aria-label="Resultados de pacientes" aria-describedby="patients-scroll-hint" tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <SortableTh
                    column={SORTABLE_COLUMNS.name}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">Contacto</th>
                  <SortableTh
                    column={SORTABLE_COLUMNS.tipoPaciente}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableTh
                    column={SORTABLE_COLUMNS.origenCanal}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableTh
                    column={SORTABLE_COLUMNS.updatedAt}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableTh
                    column={SORTABLE_COLUMNS.createdAt}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const type = PATIENT_TYPE[p.tipoPaciente || 'lead'];
                  return (
                    <tr
                      key={p.id}
                      onClick={() =>
                        router.push(patientContextHref(`/dashboard/patients/${p.id}`, returnTo))
                      }
                      className="group cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface-2"
                    >
                      <td className="w-44 min-w-44 max-w-44 bg-surface px-4 py-3.5 group-hover:bg-surface-2 sm:w-56 sm:min-w-56 sm:max-w-56 md:sticky md:left-0 md:z-10">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={`${p.nombre} ${p.apellido}`} size={32} />
                          <div className="min-w-0">
                            <Link href={patientContextHref(`/dashboard/patients/${p.id}`, returnTo)} onClick={(e) => e.stopPropagation()} className="inline-flex min-h-11 items-center font-medium text-foreground underline-offset-4 hover:underline [overflow-wrap:anywhere]">
                              {p.nombre} {p.apellido}
                            </Link>
                            <div className="text-[13px] text-text-secondary [overflow-wrap:anywhere]">
                              {p.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">
                        <div className="cap-mono text-sm">
                          {p.celular || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[13px] font-medium"
                          style={{
                            background: type.bg,
                            color: type.color,
                            borderColor: type.border,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: type.color }}
                          />
                          {type.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-secondary">
                        {p.origenCanal
                          ? CHANNEL_LABELS[p.origenCanal] ?? p.origenCanal
                          : '—'}
                      </td>
                      <td className="cap-mono whitespace-nowrap px-4 py-3.5 text-sm text-text-secondary">
                        {fmtDateShort(p.updatedAt)}
                      </td>
                      <td className="cap-mono whitespace-nowrap px-4 py-3.5 text-sm text-text-secondary">
                        {fmtDateShort(p.createdAt)}
                      </td>
                      <td
                        className="px-4 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          <Link
                            href={patientContextHref(`/dashboard/patients/${p.id}/edit`, returnTo)}
                            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border px-3 text-sm text-text-secondary transition-colors hover:bg-surface-3 hover:text-foreground"
                            aria-label={`Editar a ${p.nombre} ${p.apellido}`}
                          >
                            <Pencil className="h-4 w-4" /> Editar
                          </Link>
                          {canDeletePatient && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(p)}
                              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label={`Eliminar a ${p.nombre} ${p.apellido}`}
                            >
                              <Trash2 className="h-[15px] w-[15px]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-text-secondary">
              Página {meta.page} de {meta.totalPages} · {meta.total} resultados
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                disabled={page <= 1}
                onClick={() => updateList({ page: page - 1 })}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                disabled={page >= meta.totalPages}
                onClick={() => updateList({ page: page + 1 })}
              >
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar paciente</DialogTitle>
            <DialogDescription>
              ¿Eliminar a{' '}
              <strong>
                {deleteTarget?.nombre} {deleteTarget?.apellido}
              </strong>
              ? El expediente se archiva, no se borra de la base.
              <span className="mt-2 block">
                Si es un expediente repetido,{' '}
                <Link
                  href="/dashboard/settings/duplicates"
                  className="font-medium text-brand-dark underline underline-offset-2"
                >
                  fusiónalo
                </Link>{' '}
                en vez de eliminarlo: así no se pierden sus consultas ni sus
                procedimientos.
              </span>
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
