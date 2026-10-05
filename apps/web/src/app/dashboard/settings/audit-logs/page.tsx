'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useAuditLogs,
  useAuditFacets,
  type AuditLog,
  type AuditLogFilters,
} from '@/hooks/use-audit-logs';
import { useRequireRole } from '@/hooks/use-has-role';
import { actionLabel, actionVariant, entityLabel } from '@/lib/audit-labels';
import { computeDiff, renderAuditValue, type AuditFieldDiff } from '@/lib/audit-diff';

const ALL_VALUE = '__all__';
const PAGE_SIZE = 30;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function variantClasses(variant: ReturnType<typeof actionVariant>) {
  switch (variant) {
    case 'create':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'update':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'delete':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

export default function AuditLogsPage() {
  const authorized = useRequireRole('admin');

  const [action, setAction] = useState<string>('');
  const [entityType, setEntityType] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const filters: AuditLogFilters = useMemo(
    () => ({
      action: action || undefined,
      entityType: entityType || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [action, entityType, from, to, page],
  );

  const { data, isLoading, error } = useAuditLogs(filters);
  const { data: facets } = useAuditFacets();

  if (!authorized) return null;

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Historial de actividad</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta
              ? `${meta.total} eventos registrados`
              : 'Auditoría de todos los movimientos del sistema'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="grid gap-3 p-4 md:grid-cols-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Acción</label>
            <Select
              value={action || ALL_VALUE}
              onValueChange={(v) => {
                setAction(v === ALL_VALUE ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todas</SelectItem>
                {(facets?.actions ?? []).map((a) => (
                  <SelectItem key={a} value={a}>
                    {actionLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Entidad</label>
            <Select
              value={entityType || ALL_VALUE}
              onValueChange={(v) => {
                setEntityType(v === ALL_VALUE ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todas</SelectItem>
                {(facets?.entityTypes ?? []).map((e) => (
                  <SelectItem key={e} value={e}>
                    {entityLabel(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Desde</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Hasta</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="h-9"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              className="h-9 w-full"
              onClick={() => {
                setAction('');
                setEntityType('');
                setFrom('');
                setTo('');
                setPage(1);
              }}
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando eventos...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-destructive">Error al cargar el historial</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileSearch className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No hay eventos para esos filtros</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Usuario</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Acción</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Entidad</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">ID</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const v = actionVariant(row.action);
                  const displayName = row.user
                    ? `${row.user.nombre} ${row.user.apellido}`
                    : row.userEmail ?? 'Sistema';
                  return (
                    <TableRow key={row.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{displayName}</div>
                        {row.userEmail && row.user && (
                          <div className="text-[11px] text-muted-foreground">{row.userEmail}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                            variantClasses(v),
                          )}
                        >
                          {actionLabel(row.action)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{entityLabel(row.entityType)}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground font-mono">
                        {row.entityId ? row.entityId.slice(0, 8) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setDetail(row)}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {meta.page} de {meta.totalPages} — {meta.total} eventos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detail && `${actionLabel(detail.action)} · ${entityLabel(detail.entityType)}`}
            </DialogTitle>
          </DialogHeader>
          {detail && <DetailBody log={detail} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailBody({ log }: { log: AuditLog }) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Meta label="Fecha">{formatDateTime(log.createdAt)}</Meta>
        <Meta label="Usuario">
          {log.user
            ? `${log.user.nombre} ${log.user.apellido}`
            : log.userEmail ?? 'Sistema'}
        </Meta>
        <Meta label="Email">{log.userEmail ?? '—'}</Meta>
        <Meta label="ID entidad">
          <span className="font-mono text-[11px]">{log.entityId ?? '—'}</span>
        </Meta>
        <Meta label="IP">{log.ipAddress ?? '—'}</Meta>
        <Meta label="Navegador" className="sm:col-span-2">
          <span className="text-[11px] text-muted-foreground">{log.userAgent ?? '—'}</span>
        </Meta>
      </div>

      <Diff before={log.oldValues} after={log.newValues} />
    </div>
  );
}

function Meta({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 [overflow-wrap:anywhere]', className)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Diff({ before, after }: { before: unknown; after: unknown }) {
  const fields = computeDiff(before, after);

  if (fields.length === 0) {
    // Just show whatever has data.
    return (
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {before != null && <Snapshot label="Antes" data={before} />}
        {after != null && <Snapshot label="Después" data={after} />}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="hidden gap-px bg-border sm:grid sm:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Campo
        </div>
        <div className="bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-600">
          Antes
        </div>
        <div className="bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
          Después
        </div>
      </div>
      {fields.map((f) => <FieldRow key={f.key} field={f} />)}
    </div>
  );
}

function FieldRow({
  field,
}: {
  field: AuditFieldDiff;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-px border-t bg-border sm:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 bg-card px-3 py-2 font-mono text-[11px] [overflow-wrap:anywhere]">{field.key}</div>
      <div className="min-w-0 bg-red-50/30 px-3 py-2 text-[12px] text-red-700">
        <span className="mb-1 block text-[10px] font-semibold uppercase sm:sr-only">Antes</span>
        <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">{renderAuditValue(field.before, field.beforeCaptured)}</div>
      </div>
      <div className="min-w-0 bg-emerald-50/30 px-3 py-2 text-[12px] text-emerald-700">
        <span className="mb-1 block text-[10px] font-semibold uppercase sm:sr-only">Después</span>
        <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">{renderAuditValue(field.after, field.afterCaptured)}</div>
      </div>
    </div>
  );
}

function Snapshot({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="min-w-0 rounded-md border">
      <div className="border-b bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <pre className="min-w-0 whitespace-pre-wrap p-3 text-[11px] [overflow-wrap:anywhere]">{renderAuditValue(data)}</pre>
    </div>
  );
}
