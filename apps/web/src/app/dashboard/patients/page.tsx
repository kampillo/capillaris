'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
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
import type { Patient } from '@/hooks/use-patients';
import { useHasRole } from '@/hooks/use-has-role';
import { Avatar } from '@/components/clinic/avatar';

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
  });
}

export default function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('query') ?? '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const canCreatePatient = useHasRole('admin', 'doctor', 'receptionist');

  useEffect(() => {
    setSearchQuery(urlQuery);
    setPage(1);
  }, [urlQuery]);

  const { data, isLoading, error } = usePatients({
    query: searchQuery || undefined,
    tipoPaciente: filter === 'all' ? undefined : filter,
    page,
    pageSize: 20,
  });

  const deleteMutation = useDeletePatient();

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleFilter = (value: string) => {
    setFilter(value);
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
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="cap-h2 mb-1">Pacientes</h2>
          <p className="text-[13px] text-text-secondary">
            {meta ? `${meta.total} pacientes registrados` : 'Cargando...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
          {canCreatePatient && (
            <Button size="sm" className="gap-1.5" asChild>
              <Link href="/dashboard/patients/new">
                <Plus className="h-3.5 w-3.5" /> Nuevo paciente
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="-mb-px flex gap-0.5 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const active = filter === t.value;
          return (
            <button
              key={t.value}
              onClick={() => handleFilter(t.value)}
              className={cn(
                '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] transition-colors',
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
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            placeholder="Buscar por nombre, email o teléfono…"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 pl-9"
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {[
                    'Paciente',
                    'Contacto',
                    'Estado',
                    'Origen',
                    'Última visita',
                    '',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="cap-eyebrow px-4 py-3 text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const type = PATIENT_TYPE[p.tipoPaciente || 'lead'];
                  return (
                    <tr
                      key={p.id}
                      onClick={() =>
                        router.push(`/dashboard/patients/${p.id}`)
                      }
                      className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface-2"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={`${p.nombre} ${p.apellido}`} size={32} />
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">
                              {p.nombre} {p.apellido}
                            </div>
                            <div className="truncate text-[11px] text-text-tertiary">
                              {p.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">
                        <div className="cap-mono text-xs">
                          {p.celular || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
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
                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        {p.origenCanal
                          ? CHANNEL_LABELS[p.origenCanal] ?? p.origenCanal
                          : '—'}
                      </td>
                      <td className="cap-mono px-4 py-3.5 text-xs text-text-secondary">
                        {fmtDateShort(p.updatedAt)}
                      </td>
                      <td
                        className="px-4 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end">
                          <Link
                            href={`/dashboard/patients/${p.id}/edit`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-text-tertiary transition-colors hover:bg-surface-3 hover:text-foreground"
                            aria-label="Acciones"
                          >
                            <MoreHorizontal className="h-[15px] w-[15px]" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
                <ChevronLeft className="mr-1 h-4 w-4" />
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
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong>
                {deleteTarget?.nombre} {deleteTarget?.apellido}
              </strong>
              ? Esta acción se puede revertir.
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
