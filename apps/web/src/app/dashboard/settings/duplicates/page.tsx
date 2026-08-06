'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  AlertTriangle,
  Check,
  Loader2,
  Merge,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useRequireRole } from '@/hooks/use-has-role';
import {
  useDuplicatePatients,
  useMergePatients,
  type ClasificacionDuplicado,
  type GrupoDuplicado,
  type PacienteDuplicado,
} from '@/hooks/use-patients';
import { formatDateOnly, formatInstantDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

const CLASIFICACION: Record<
  ClasificacionDuplicado,
  { label: string; hint: string; className: string }
> = {
  fusion_obligatoria: {
    label: 'Fusión obligatoria',
    hint: 'Los dos expedientes tienen registros clínicos. Borrar cualquiera pierde historial.',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  borrado_seguro: {
    label: 'Datos en uno solo',
    hint: 'Sólo un expediente tiene registros clínicos, pero el otro puede tener datos de contacto que valga la pena rescatar.',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  ambos_vacios: {
    label: 'Ambos vacíos',
    hint: 'Ninguno tiene registros clínicos.',
    className: 'border-border bg-surface-2 text-text-secondary',
  },
};

/** Campos que se comparan lado a lado al revisar un grupo. */
const CAMPOS: { key: keyof PacienteDuplicado; label: string }[] = [
  { key: 'email', label: 'Correo' },
  { key: 'celular', label: 'Celular' },
  { key: 'fechaNacimiento', label: 'Nacimiento' },
  { key: 'genero', label: 'Género' },
  { key: 'estadoCivil', label: 'Estado civil' },
  { key: 'ocupacion', label: 'Ocupación' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'estado', label: 'Estado' },
  { key: 'tipoPaciente', label: 'Tipo' },
  { key: 'origenCanal', label: 'Origen' },
  { key: 'referidoPor', label: 'Referido por' },
  { key: 'notasInternas', label: 'Notas internas' },
];

const REGISTROS: { key: string; label: string }[] = [
  { key: 'medicalConsultations', label: 'Consultas' },
  { key: 'procedureReports', label: 'Procedimientos' },
  { key: 'clinicalHistories', label: 'Historias' },
  { key: 'prescriptions', label: 'Recetas' },
  { key: 'appointments', label: 'Citas' },
  { key: 'patientImages', label: 'Imágenes' },
  { key: 'micropigmentations', label: 'Micropigmentación' },
  { key: 'hairmedicines', label: 'Hairmedicine' },
  { key: 'reminders', label: 'Recordatorios' },
];

function valorMostrable(p: PacienteDuplicado, key: keyof PacienteDuplicado) {
  const v = p[key];
  if (v === null || v === undefined || v === '') return null;
  if (key === 'fechaNacimiento') return formatDateOnly(v as string);
  return String(v);
}

export default function DuplicatesPage() {
  const authorized = useRequireRole('admin');
  const { data: grupos = [], isLoading, error } = useDuplicatePatients(authorized);
  const [revisando, setRevisando] = useState<GrupoDuplicado | null>(null);

  if (!authorized) return null;

  const resumen = grupos.reduce<Record<string, number>>((acc, g) => {
    acc[g.clasificacion] = (acc[g.clasificacion] ?? 0) + 1;
    return acc;
  }, {});

  const enRiesgo = grupos
    .filter((g) => g.clasificacion === 'fusion_obligatoria')
    .reduce((n, g) => n + g.pacientes.slice(1).reduce((m, p) => m + p.totalRegistros, 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/settings"
        className="inline-flex w-fit items-center gap-1 text-xs text-text-secondary transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Volver a configuración
      </Link>

      <div>
        <h2 className="cap-h1 mb-1">Pacientes duplicados</h2>
        <p className="text-sm text-text-secondary">
          Expedientes que comparten nombre completo. Fusionar mueve todos los
          registros al que conserves y deja el otro archivado — es reversible.
        </p>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-text-secondary">
          Buscando duplicados...
        </p>
      )}

      {error && (
        <p className="py-16 text-center text-sm text-destructive">
          No se pudo cargar la lista de duplicados.
        </p>
      )}

      {!isLoading && !error && grupos.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <Check className="mx-auto mb-3 h-8 w-8 text-brand" />
          <p className="text-sm font-medium">No hay expedientes duplicados</p>
        </div>
      )}

      {grupos.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Resumen
              icon={ShieldAlert}
              valor={resumen.fusion_obligatoria ?? 0}
              label="Requieren fusión"
              detalle={`${enRiesgo} registros clínicos se perderían si se borran`}
              tone="danger"
            />
            <Resumen
              icon={Users}
              valor={resumen.borrado_seguro ?? 0}
              label="Datos en uno solo"
              detalle="El vacío puede tener contacto útil"
            />
            <Resumen
              icon={Users}
              valor={grupos.length}
              label="Grupos en total"
              detalle={`${grupos.reduce((n, g) => n + g.pacientes.length, 0)} expedientes`}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            {grupos.map((g) => (
              <FilaGrupo key={g.key} grupo={g} onRevisar={() => setRevisando(g)} />
            ))}
          </div>
        </>
      )}

      {revisando && (
        <DialogoFusion
          grupo={revisando}
          onClose={() => setRevisando(null)}
        />
      )}
    </div>
  );
}

function Resumen({
  icon: Icon,
  valor,
  label,
  detalle,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  valor: number;
  label: string;
  detalle: string;
  tone?: 'danger';
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="mb-1 flex items-center gap-2">
        <Icon
          className={cn(
            'h-4 w-4',
            tone === 'danger' ? 'text-red-600' : 'text-text-tertiary',
          )}
        />
        <span className="cap-eyebrow">{label}</span>
      </div>
      <div className="cap-mono text-2xl font-semibold">{valor}</div>
      <p className="mt-0.5 text-[11px] text-text-tertiary">{detalle}</p>
    </div>
  );
}

function FilaGrupo({
  grupo,
  onRevisar,
}: {
  grupo: GrupoDuplicado;
  onRevisar: () => void;
}) {
  const clase = CLASIFICACION[grupo.clasificacion];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-3.5 shadow-xs">
      <div className="min-w-[240px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{grupo.key}</span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium',
              clase.className,
            )}
          >
            {clase.label}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-tertiary">
          {grupo.pacientes.map((p) => (
            <span key={p.id} className="cap-mono">
              {p.legacyId ? `#${p.legacyId}` : p.id.slice(0, 8)} ·{' '}
              {p.totalRegistros} registros
            </span>
          ))}
        </div>
        {grupo.conflictos.length > 0 && (
          <div className="mt-1 flex items-start gap-1.5 text-[11px] text-amber-700">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{grupo.conflictos.join(' · ')}</span>
          </div>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onRevisar}>
        Revisar
      </Button>
    </div>
  );
}

function DialogoFusion({
  grupo,
  onClose,
}: {
  grupo: GrupoDuplicado;
  onClose: () => void;
}) {
  const mergeMutation = useMergePatients();
  const [survivorId, setSurvivorId] = useState(grupo.sugeridoConservarId);
  // Por cada campo, de cuál expediente se toma el valor.
  const [elegidos, setElegidos] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState(false);

  const survivor = grupo.pacientes.find((p) => p.id === survivorId)!;
  const absorbidos = grupo.pacientes.filter((p) => p.id !== survivorId);

  // Sólo se mandan los campos donde se eligió el valor del otro expediente:
  // lo demás ya está en el que se conserva.
  const campos = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const { key } of CAMPOS) {
      const origenId = elegidos[key];
      if (!origenId || origenId === survivorId) continue;
      const origen = grupo.pacientes.find((p) => p.id === origenId);
      if (origen) out[key] = origen[key];
    }
    return out;
  }, [elegidos, survivorId, grupo.pacientes]);

  const totalResultante = grupo.pacientes.reduce(
    (n, p) => n + p.totalRegistros,
    0,
  );

  const handleMerge = async () => {
    // Con más de dos expedientes se absorben de uno en uno.
    for (const absorbido of absorbidos) {
      await mergeMutation.mutateAsync({
        survivorId,
        absorbedId: absorbido.id,
        campos: campos as never,
      });
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{grupo.key}</DialogTitle>
        </DialogHeader>

        <p className="-mt-2 text-xs text-text-secondary">
          {CLASIFICACION[grupo.clasificacion].hint}
        </p>

        {grupo.conflictos.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <strong>Datos que no coinciden.</strong> Elige abajo cuál es el
              correcto: {grupo.conflictos.join('; ')}.
            </div>
          </div>
        )}

        {/* Elección de sobreviviente */}
        <div className="grid gap-3 sm:grid-cols-2">
          {grupo.pacientes.map((p) => {
            const activo = p.id === survivorId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSurvivorId(p.id)}
                className={cn(
                  'rounded-lg border p-4 text-left transition-colors',
                  activo
                    ? 'border-brand bg-brand-soft'
                    : 'border-border bg-surface hover:bg-surface-2',
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="cap-eyebrow">
                    {activo ? 'Se conserva' : 'Se absorbe'}
                  </span>
                  {p.id === grupo.sugeridoConservarId && (
                    <Badge variant="outline" className="text-[10px]">
                      sugerido
                    </Badge>
                  )}
                </div>
                <div className="cap-mono text-xs text-text-secondary">
                  {p.legacyId ? `legacy #${p.legacyId}` : p.id.slice(0, 8)}
                </div>
                <div className="mt-1.5 text-lg font-semibold">
                  {p.totalRegistros}{' '}
                  <span className="text-xs font-normal text-text-secondary">
                    registros clínicos
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-text-tertiary">
                  {REGISTROS.filter(
                    (r) => (p._count as never as Record<string, number>)[r.key] > 0,
                  ).map((r) => (
                    <span key={r.key}>
                      {r.label}{' '}
                      <strong className="text-foreground">
                        {(p._count as never as Record<string, number>)[r.key]}
                      </strong>
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 text-[11px] text-text-tertiary">
                  Creado {formatInstantDate(p.createdAt)} · editado{' '}
                  {formatInstantDate(p.updatedAt)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Resolución campo por campo */}
        <div className="rounded-lg border border-border">
          <div className="border-b border-border bg-surface-2 px-4 py-2">
            <span className="cap-eyebrow">Datos del expediente resultante</span>
          </div>
          <div className="divide-y divide-border">
            {CAMPOS.map(({ key, label }) => {
              const valores = grupo.pacientes.map((p) => ({
                id: p.id,
                valor: valorMostrable(p, key),
              }));
              if (valores.every((v) => !v.valor)) return null;

              const distintos =
                new Set(valores.map((v) => v.valor ?? '')).size > 1;
              const elegido = elegidos[key] ?? survivorId;

              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center gap-3 px-4 py-2"
                >
                  <span className="w-28 shrink-0 text-xs text-text-secondary">
                    {label}
                  </span>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {valores.map((v) => {
                      const activo = elegido === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={!distintos}
                          onClick={() =>
                            setElegidos((prev) => ({ ...prev, [key]: v.id }))
                          }
                          className={cn(
                            'rounded-sm border px-2.5 py-1 text-xs transition-colors',
                            !distintos && 'cursor-default border-transparent',
                            distintos && activo && 'border-brand bg-brand-soft font-medium',
                            distintos &&
                              !activo &&
                              'border-border-strong hover:bg-surface-2',
                          )}
                        >
                          {v.valor ?? (
                            <span className="text-text-tertiary">vacío</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {mergeMutation.error && (
          <p className="text-xs text-destructive">
            No se pudo fusionar. Intenta de nuevo.
          </p>
        )}

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-secondary">
            El expediente resultante queda con{' '}
            <strong className="text-foreground">
              {totalResultante} registros
            </strong>
            . El absorbido se archiva, no se borra.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {confirmando ? (
              <Button
                onClick={handleMerge}
                disabled={mergeMutation.isPending}
                className="gap-1.5"
              >
                {mergeMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Merge className="h-3.5 w-3.5" />
                )}
                Confirmar fusión
              </Button>
            ) : (
              <Button onClick={() => setConfirmando(true)} className="gap-1.5">
                <Merge className="h-3.5 w-3.5" />
                Fusionar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
