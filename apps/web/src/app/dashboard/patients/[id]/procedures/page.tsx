'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Plus,
  Scissors,
  Syringe,
  Users,
  Hash,
  FileText,
  Zap,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useProceduresByPatient,
  useCreateProcedure,
  useDoctors,
  useHairTypes,
  useOperatingRooms,
} from '@/hooks/use-clinical';
import type { ProcedureReport } from '@/hooks/use-clinical';
import { useHasRole } from '@/hooks/use-has-role';
import { formatDateLong, todayInput } from '@/lib/dates';
import {
  useLinkProcedureSession,
  useUnlinkProcedureSession,
} from '@/hooks/use-clinical';
import { displayName } from '@/lib/names';

const PUNCH_PRESETS = ['0.8', '0.9', '1.0'];
const IMPLANTADOR_PRESETS = ['Choi', 'DHI', 'FUE punch', 'Zafiro'];

const ANESTHESIA_RECIPES: Array<{
  label: string;
  values: {
    lidocaina: string;
    adrenalina: string;
    bicarbonatoDeSodio: string;
    solucionFisiologica: string;
  };
}> = [
  {
    label: 'Estándar FUE',
    values: {
      lidocaina: '2%',
      adrenalina: '1',
      bicarbonatoDeSodio: '2',
      solucionFisiologica: '40',
    },
  },
  {
    label: 'Concentrada',
    values: {
      lidocaina: '2%',
      adrenalina: '1.5',
      bicarbonatoDeSodio: '2.5',
      solucionFisiologica: '30',
    },
  },
  {
    label: 'Suave',
    values: {
      lidocaina: '1%',
      adrenalina: '0.5',
      bicarbonatoDeSodio: '1.5',
      solucionFisiologica: '50',
    },
  },
];

function SectionHeader({
  icon: Icon,
  title,
  required,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  required?: boolean;
}) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="cap-eyebrow">
        {title}
        {required && <span className="ml-1 text-destructive">*</span>}
      </h3>
    </div>
  );
}

function ChoicePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-brand bg-brand-soft text-brand-dark'
          : 'border-border-strong bg-surface text-foreground hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  );
}

function FollicleDistributionBar({
  cb1,
  cb2,
  cb3,
  cb4,
}: {
  cb1: number;
  cb2: number;
  cb3: number;
  cb4: number;
}) {
  const total = cb1 + cb2 + cb3 + cb4;
  if (total === 0) return null;
  const segments = [
    { key: 'CB1', value: cb1, color: 'hsl(var(--brand-primary) / 0.35)' },
    { key: 'CB2', value: cb2, color: 'hsl(var(--brand-primary) / 0.55)' },
    { key: 'CB3', value: cb3, color: 'hsl(var(--brand-primary) / 0.75)' },
    { key: 'CB4', value: cb4, color: 'hsl(var(--brand-primary))' },
  ];
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
      {segments.map((s) =>
        s.value > 0 ? (
          <div
            key={s.key}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
            }}
            title={`${s.key}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
          />
        ) : null,
      )}
    </div>
  );
}

/** Minutos entre dos horas "HH:MM". Null si falta alguna o el orden no cuadra. */
function minutosEntre(desde?: string, hasta?: string): number | null {
  if (!desde || !hasta) return null;
  const [h1, m1] = desde.split(':').map(Number);
  const [h2, m2] = hasta.split(':').map(Number);
  const diff = h2 * 60 + m2 - (h1 * 60 + m1);
  return diff > 0 ? diff : null;
}

function duracion(min: number | null): string | null {
  if (min === null) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${m ? `${m} min` : ''}`.trim() : `${m} min`;
}

/** Hora de un timestamp de anestesia, fijada a la zona de la clínica. */
function horaDeInstante(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City',
  });
}

/**
 * Agrupa los reportes por sesión. Un trasplante repartido en dos días son dos
 * reportes que comparten sessionGroupId, y la clínica los quiere ver como un
 * solo procedimiento con el total sumado.
 */
type Sesion = { key: string; dias: ProcedureReport[] };

function agruparPorSesion(procedures: ProcedureReport[]): Sesion[] {
  const sesiones: Sesion[] = [];
  const indice = new Map<string, Sesion>();

  for (const p of procedures) {
    if (!p.sessionGroupId) {
      sesiones.push({ key: p.id, dias: [p] });
      continue;
    }
    const existente = indice.get(p.sessionGroupId);
    if (existente) {
      existente.dias.push(p);
    } else {
      const nueva = { key: p.sessionGroupId, dias: [p] };
      indice.set(p.sessionGroupId, nueva);
      sesiones.push(nueva);
    }
  }

  for (const s of sesiones) {
    s.dias.sort((a, b) => (a.sessionDay ?? 0) - (b.sessionDay ?? 0));
  }
  return sesiones;
}

function TarjetaSesion({
  sesion,
  candidatos,
  puedeEditar,
}: {
  sesion: Sesion;
  /** Otros procedimientos del paciente, para poder unirlos como otro día. */
  candidatos: ProcedureReport[];
  puedeEditar: boolean;
}) {
  const unlink = useUnlinkProcedureSession();
  const link = useLinkProcedureSession();
  const [uniendo, setUniendo] = useState(false);

  if (sesion.dias.length === 1) {
    const solo = sesion.dias[0];
    return (
      <div>
        <ProcedureCard procedure={solo} />
        {puedeEditar && candidatos.length > 0 && (
          <div className="mt-1.5 pl-1">
            {uniendo ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-text-secondary">
                  Unir con:
                </span>
                {candidatos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={link.isPending}
                    onClick={() =>
                      link.mutate(
                        { id: solo.id, withId: c.id },
                        { onSuccess: () => setUniendo(false) },
                      )
                    }
                    className="rounded-sm border border-border-strong px-2 py-0.5 text-[11px] hover:bg-surface-2"
                  >
                    {formatDateLong(c.procedureDate)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUniendo(false)}
                  className="text-[11px] text-text-tertiary hover:text-foreground"
                >
                  cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setUniendo(true)}
                className="text-[11px] text-text-tertiary underline underline-offset-2 hover:text-foreground"
              >
                Es parte de un trasplante de varios días
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const foliculos = sesion.dias.reduce((n, d) => {
    const suma = (d.cb1 ?? 0) + (d.cb2 ?? 0) + (d.cb3 ?? 0) + (d.cb4 ?? 0);
    return n + (d.totalFoliculos ?? suma);
  }, 0);
  const pelos = sesion.dias.reduce(
    (n, d) =>
      n + (d.cb1 ?? 0) + (d.cb2 ?? 0) * 2 + (d.cb3 ?? 0) * 3 + (d.cb4 ?? 0) * 4,
    0,
  );
  const sumaCb = sesion.dias.reduce(
    (n, d) => n + (d.cb1 ?? 0) + (d.cb2 ?? 0) + (d.cb3 ?? 0) + (d.cb4 ?? 0),
    0,
  );

  return (
    <section className="rounded-xl border-2 border-brand/30 bg-brand-softer/40 p-1.5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="cap-eyebrow mb-0.5">
            Sesión de {sesion.dias.length} días
          </div>
          <div className="text-[15px] font-semibold">
            {formatDateLong(sesion.dias[0].procedureDate)} —{' '}
            {formatDateLong(sesion.dias[sesion.dias.length - 1].procedureDate)}
          </div>
        </div>
        <div className="flex items-start gap-6 text-right">
          <div>
            <div className="cap-eyebrow">Total folículos</div>
            <div className="cap-mono text-xl font-semibold text-brand-dark">
              {foliculos.toLocaleString()}
            </div>
          </div>
          {pelos > 0 && (
            <div>
              <div className="cap-eyebrow">Total pelos</div>
              <div className="cap-mono text-xl font-semibold text-brand-dark">
                {pelos.toLocaleString()}
              </div>
            </div>
          )}
          {sumaCb > 0 && (
            <div>
              <div className="cap-eyebrow">Pelos / folículo</div>
              <div className="cap-mono text-xl font-semibold text-brand-dark">
                {(pelos / sumaCb).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {sesion.dias.map((d) => (
          <div key={d.id} className="relative">
            <span className="absolute -left-0.5 top-4 z-10 rounded-r-sm bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Día {d.sessionDay}
            </span>
            <ProcedureCard procedure={d} />
            {puedeEditar && (
              <button
                type="button"
                onClick={() => unlink.mutate(d.id)}
                disabled={unlink.isPending}
                className="absolute right-3 top-3 text-[11px] text-text-tertiary underline underline-offset-2 hover:text-foreground"
              >
                separar de la sesión
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function LineaDeTiempo({ procedure }: { procedure: ProcedureReport }) {
  const hitos = [
    { label: 'Inicio', hora: procedure.horaInicio },
    {
      label: 'Anestesia extracción',
      hora: horaDeInstante(procedure.anestExtFechaInicial),
    },
    { label: 'Comida', hora: procedure.horaComidaInicio },
    { label: 'Reanudación', hora: procedure.horaComidaFin },
    {
      label: 'Anestesia implantación',
      hora: horaDeInstante(procedure.anestImpFechaInicial),
    },
    { label: 'Implantación', hora: procedure.horaImplantacionInicio },
    { label: 'Fin', hora: procedure.horaFin },
  ].filter((h) => h.hora);

  if (hitos.length === 0) return null;

  const total = minutosEntre(procedure.horaInicio, procedure.horaFin);
  const comida = minutosEntre(procedure.horaComidaInicio, procedure.horaComidaFin);
  const efectivo = total !== null && comida !== null ? total - comida : total;
  const implantacion = minutosEntre(
    procedure.horaImplantacionInicio,
    procedure.horaFin,
  );

  return (
    <div className="rounded-md border border-border bg-surface-2 p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="cap-eyebrow">Tiempos</div>
        <div className="flex flex-wrap gap-x-3 text-[11px] text-text-secondary">
          {total !== null && (
            <span>
              Duración total{' '}
              <strong className="text-foreground">{duracion(total)}</strong>
            </span>
          )}
          {efectivo !== null && comida !== null && (
            <span>
              Quirúrgico{' '}
              <strong className="text-foreground">{duracion(efectivo)}</strong>
            </span>
          )}
          {implantacion !== null && (
            <span>
              Implantación{' '}
              <strong className="text-foreground">
                {duracion(implantacion)}
              </strong>
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {hitos.map((h) => (
          <div key={h.label}>
            <div className="text-[10px] uppercase tracking-wide text-text-tertiary">
              {h.label}
            </div>
            <div className="cap-mono text-sm font-medium">{h.hora}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcedureCard({ procedure }: { procedure: ProcedureReport }) {
  const cb1 = procedure.cb1 ?? 0;
  const cb2 = procedure.cb2 ?? 0;
  const cb3 = procedure.cb3 ?? 0;
  const cb4 = procedure.cb4 ?? 0;
  const folicullesSum = cb1 + cb2 + cb3 + cb4;
  const hairCount = cb1 + cb2 * 2 + cb3 * 3 + cb4 * 4;
  const displayTotal = procedure.totalFoliculos ?? folicullesSum;
  // Se calcula sobre la suma de CB, no sobre totalFoliculos: el total puede
  // capturarse a mano y no siempre cuadra con la distribución.
  const coeficiente =
    folicullesSum > 0 ? (hairCount / folicullesSum).toFixed(2) : null;

  const anesthesiaRows: Array<{
    label: string;
    unit?: string;
    ext?: string | number | null;
    imp?: string | number | null;
  }> = [
    {
      label: 'Lidocaína',
      ext: procedure.anestExtLidocaina,
      imp: procedure.anestImpLidocaina,
    },
    {
      label: 'Adrenalina',
      unit: 'mL',
      ext: procedure.anestExtAdrenalina,
      imp: procedure.anestImpAdrenalina,
    },
    {
      label: 'Bicarbonato',
      unit: 'mL',
      ext: procedure.anestExtBicarbonatoDeSodio,
      imp: procedure.anestImpBicarbonatoDeSodio,
    },
    {
      label: 'Sol. fisiológica',
      unit: 'mL',
      ext: procedure.anestExtSolucionFisiologica,
      imp: procedure.anestImpSolucionFisiologica,
    },
    {
      label: 'Anestesia infiltrada',
      ext: procedure.anestExtAnestesiaInfiltrada,
      imp: procedure.anestImpAnestesiaInfiltrada,
    },
    {
      label: 'Betametasona',
      ext: procedure.anestExtBetametasona,
      imp: procedure.anestImpBetametasona,
    },
  ].filter((r) => r.ext || r.imp);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="text-[15px] font-semibold">
            {formatDateLong(procedure.procedureDate)}
          </div>
          {procedure.doctors && procedure.doctors.length > 0 && (
            <div className="text-xs text-text-tertiary">
              {procedure.doctors
                .map((d) => displayName(d.doctor))
                .join(' · ')}
            </div>
          )}
          {procedure.operatingRoom && (
            <span className="mt-1 inline-flex items-center rounded-full border border-brand/25 bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-dark">
              {procedure.operatingRoom.name}
            </span>
          )}
        </div>
        {(displayTotal > 0 || hairCount > 0) && (
          <div className="flex items-start gap-6 text-right">
            {displayTotal > 0 && (
              <div>
                <div className="cap-eyebrow">Total folículos</div>
                <div className="cap-mono text-xl font-semibold text-brand-dark">
                  {displayTotal.toLocaleString()}
                </div>
              </div>
            )}
            {hairCount > 0 && (
              <div>
                <div className="cap-eyebrow">Total pelos</div>
                <div className="cap-mono text-xl font-semibold text-brand-dark">
                  {hairCount.toLocaleString()}
                </div>
              </div>
            )}
            {coeficiente && (
              <div>
                <div className="cap-eyebrow">Pelos / folículo</div>
                <div className="cap-mono text-xl font-semibold text-brand-dark">
                  {coeficiente}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 p-6">
        {/* Meta + follicle distribution */}
        {(procedure.punchSize || procedure.implantador || folicullesSum > 0) && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-border bg-surface-2 p-4 md:grid-cols-[auto_auto_1fr]">
            {procedure.punchSize && (
              <div>
                <div className="cap-eyebrow mb-1">Punch</div>
                <div className="cap-mono text-sm font-medium">
                  {procedure.punchSize} mm
                </div>
              </div>
            )}
            {procedure.implantador && (
              <div>
                <div className="cap-eyebrow mb-1">Implantador</div>
                <div className="text-sm font-medium">{procedure.implantador}</div>
              </div>
            )}
            {folicullesSum > 0 && (
              <div className="col-span-2 md:col-span-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="cap-eyebrow">Distribución</div>
                  <div className="cap-mono text-[11px] text-text-tertiary">
                    {folicullesSum.toLocaleString()} folículos
                  </div>
                </div>
                <FollicleDistributionBar
                  cb1={cb1}
                  cb2={cb2}
                  cb3={cb3}
                  cb4={cb4}
                />
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
                  {[
                    ['CB1', cb1],
                    ['CB2', cb2],
                    ['CB3', cb3],
                    ['CB4', cb4],
                  ]
                    .filter(([, v]) => (v as number) > 0)
                    .map(([k, v]) => (
                      <span key={k as string} className="cap-mono">
                        <span className="text-text-tertiary">{k}</span>{' '}
                        <span className="font-medium text-foreground">{v}</span>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <LineaDeTiempo procedure={procedure} />

        {procedure.hairTypes && procedure.hairTypes.length > 0 && (
          <div>
            <div className="cap-eyebrow mb-2">Zonas tratadas</div>
            <div className="flex flex-wrap gap-1.5">
              {procedure.hairTypes.map((ht) => (
                <span
                  key={ht.hairType.id || ht.hairType.name}
                  className="inline-flex items-center rounded-full border border-amber/25 bg-amber-soft px-2 py-0.5 text-[11px] font-medium text-amber"
                >
                  {ht.hairType.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {anesthesiaRows.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="cap-eyebrow mb-3">Anestesia</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="cap-eyebrow pb-2 pr-4 text-left font-normal" />
                    <th className="cap-eyebrow pb-2 pr-4 text-left font-normal">
                      Extracción
                    </th>
                    <th className="cap-eyebrow pb-2 text-left font-normal">
                      Implantación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {anesthesiaRows.map((r) => (
                    <tr key={r.label} className="border-b border-border last:border-b-0">
                      <td className="py-2 pr-4 text-xs text-text-secondary">
                        {r.label}
                      </td>
                      <td className="cap-mono py-2 pr-4 text-xs">
                        {r.ext ?? '—'}
                        {r.ext && r.unit ? ` ${r.unit}` : ''}
                      </td>
                      <td className="cap-mono py-2 text-xs">
                        {r.imp ?? '—'}
                        {r.imp && r.unit ? ` ${r.unit}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {procedure.descripcion && (
          <div className="border-t border-border pt-4">
            <div className="cap-eyebrow mb-1.5">Descripción</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {procedure.descripcion}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Anesthesia input row ───────────────────────────────────

function AnesthesiaRow({
  label,
  unit,
  extValue,
  impValue,
  onExtChange,
  onImpChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  unit?: string;
  extValue: string;
  impValue: string;
  onExtChange: (v: string) => void;
  onImpChange: (v: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr_1fr] items-center gap-3 border-b border-border py-2 last:border-b-0">
      <Label className="text-xs text-text-secondary">
        {label}
        {unit && (
          <span className="ml-1 text-[10px] text-text-tertiary">({unit})</span>
        )}
      </Label>
      <Input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={extValue}
        onChange={(e) => onExtChange(e.target.value)}
        placeholder={placeholder}
        className="h-9"
      />
      <Input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={impValue}
        onChange={(e) => onImpChange(e.target.value)}
        placeholder={placeholder}
        className="h-9"
      />
    </div>
  );
}

// ── Form ───────────────────────────────────────────────────

function ProcedureForm({
  patientId,
  onSuccess,
  onCancel,
}: {
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreateProcedure();
  const { data: doctors = [] } = useDoctors();
  const { data: hairTypes = [] } = useHairTypes();
  const { data: operatingRooms = [] } = useOperatingRooms();

  const [form, setForm] = useState({
    procedureDate: todayInput(),
    horaInicio: '',
    horaComidaInicio: '',
    horaComidaFin: '',
    horaImplantacionInicio: '',
    horaFin: '',
    descripcion: '',
    operatingRoomId: '',
    punchSize: '',
    implantador: '',
    cb1: '',
    cb2: '',
    cb3: '',
    cb4: '',
    totalFoliculos: '',
    doctorIds: [] as string[],
    hairTypeIds: [] as string[],
    anestExtLidocaina: '',
    anestExtAdrenalina: '',
    anestExtBicarbonatoDeSodio: '',
    anestExtSolucionFisiologica: '',
    anestExtAnestesiaInfiltrada: '',
    anestExtBetametasona: '',
    anestImpLidocaina: '',
    anestImpAdrenalina: '',
    anestImpBicarbonatoDeSodio: '',
    anestImpSolucionFisiologica: '',
    anestImpAnestesiaInfiltrada: '',
    anestImpBetametasona: '',
  });

  const set = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleArray = (key: 'doctorIds' | 'hairTypeIds', id: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((v) => v !== id)
        : [...prev[key], id],
    }));
  };

  const applyRecipe = (recipe: typeof ANESTHESIA_RECIPES[number]) => {
    setForm((prev) => ({
      ...prev,
      anestExtLidocaina: recipe.values.lidocaina,
      anestExtAdrenalina: recipe.values.adrenalina,
      anestExtBicarbonatoDeSodio: recipe.values.bicarbonatoDeSodio,
      anestExtSolucionFisiologica: recipe.values.solucionFisiologica,
      anestImpLidocaina: recipe.values.lidocaina,
      anestImpAdrenalina: recipe.values.adrenalina,
      anestImpBicarbonatoDeSodio: recipe.values.bicarbonatoDeSodio,
      anestImpSolucionFisiologica: recipe.values.solucionFisiologica,
    }));
  };

  // Live follicle totals
  const cb1n = parseInt(form.cb1, 10) || 0;
  const cb2n = parseInt(form.cb2, 10) || 0;
  const cb3n = parseInt(form.cb3, 10) || 0;
  const cb4n = parseInt(form.cb4, 10) || 0;
  const follicleSum = useMemo(
    () => cb1n + cb2n + cb3n + cb4n,
    [cb1n, cb2n, cb3n, cb4n],
  );
  const hairCount = useMemo(
    () => cb1n + cb2n * 2 + cb3n * 3 + cb4n * 4,
    [cb1n, cb2n, cb3n, cb4n],
  );

  const resumenTiempos = useMemo(() => {
    const total = minutosEntre(form.horaInicio, form.horaFin);
    if (total === null) return null;
    const comida = minutosEntre(form.horaComidaInicio, form.horaComidaFin);
    const partes = [`Duración total ${duracion(total)}`];
    if (comida !== null) {
      partes.push(`comida ${duracion(comida)}`);
      partes.push(`quirúrgico ${duracion(total - comida)}`);
    }
    return partes.join(' · ');
  }, [form.horaInicio, form.horaFin, form.horaComidaInicio, form.horaComidaFin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const num = (v: string) => (v ? Number(v) : undefined);
    const str = (v: string) => v || undefined;

    const payload: any = {
      patientId,
      procedureDate: form.procedureDate,
      horaInicio: str(form.horaInicio),
      horaComidaInicio: str(form.horaComidaInicio),
      horaComidaFin: str(form.horaComidaFin),
      horaImplantacionInicio: str(form.horaImplantacionInicio),
      horaFin: str(form.horaFin),
      descripcion: str(form.descripcion),
      operatingRoomId: str(form.operatingRoomId),
      punchSize: num(form.punchSize),
      implantador: str(form.implantador),
      cb1: num(form.cb1),
      cb2: num(form.cb2),
      cb3: num(form.cb3),
      cb4: num(form.cb4),
      totalFoliculos: num(form.totalFoliculos),
      doctorIds: form.doctorIds.length > 0 ? form.doctorIds : undefined,
      hairTypeIds: form.hairTypeIds.length > 0 ? form.hairTypeIds : undefined,
      anestExtLidocaina: str(form.anestExtLidocaina),
      anestExtAdrenalina: num(form.anestExtAdrenalina),
      anestExtBicarbonatoDeSodio: num(form.anestExtBicarbonatoDeSodio),
      anestExtSolucionFisiologica: num(form.anestExtSolucionFisiologica),
      anestExtAnestesiaInfiltrada: str(form.anestExtAnestesiaInfiltrada),
      anestExtBetametasona: str(form.anestExtBetametasona),
      anestImpLidocaina: str(form.anestImpLidocaina),
      anestImpAdrenalina: num(form.anestImpAdrenalina),
      anestImpBicarbonatoDeSodio: num(form.anestImpBicarbonatoDeSodio),
      anestImpSolucionFisiologica: num(form.anestImpSolucionFisiologica),
      anestImpAnestesiaInfiltrada: str(form.anestImpAnestesiaInfiltrada),
      anestImpBetametasona: str(form.anestImpBetametasona),
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    try {
      await createMutation.mutateAsync(payload);
      onSuccess();
    } catch {
      // captured in createMutation.error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Datos del procedimiento */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader
          icon={Scissors}
          title="Datos del procedimiento"
          required
        />
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>
              Fecha <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              value={form.procedureDate}
              onChange={(v) => set('procedureDate', v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Punch (mm)</Label>
            <div className="space-y-1.5">
              <Input
                type="number"
                step="0.1"
                value={form.punchSize}
                onChange={(e) => set('punchSize', e.target.value)}
                placeholder="0.8"
                className="h-11"
              />
              <div className="flex gap-1">
                {PUNCH_PRESETS.map((p) => (
                  <ChoicePill
                    key={p}
                    active={form.punchSize === p}
                    onClick={() => set('punchSize', p)}
                  >
                    {p}
                  </ChoicePill>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Implantador</Label>
            <div className="space-y-1.5">
              <Input
                value={form.implantador}
                onChange={(e) => set('implantador', e.target.value)}
                placeholder="Choi"
                className="h-11"
              />
              <div className="flex flex-wrap gap-1">
                {IMPLANTADOR_PRESETS.map((p) => (
                  <ChoicePill
                    key={p}
                    active={form.implantador === p}
                    onClick={() => set('implantador', p)}
                  >
                    {p}
                  </ChoicePill>
                ))}
              </div>
            </div>
          </div>
        </div>

        {operatingRooms.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <Label className="cap-eyebrow">Quirófano</Label>
            <div className="flex flex-wrap gap-1.5">
              {operatingRooms.map((room) => (
                <ChoicePill
                  key={room.id}
                  active={form.operatingRoomId === room.id}
                  onClick={() =>
                    set(
                      'operatingRoomId',
                      form.operatingRoomId === room.id ? '' : room.id,
                    )
                  }
                >
                  {room.name}
                </ChoicePill>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Tiempos */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={Clock} title="Tiempos del procedimiento" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              ['horaInicio', 'Inicio'],
              ['horaComidaInicio', 'Comida'],
              ['horaComidaFin', 'Reanudación'],
              ['horaImplantacionInicio', 'Implantación'],
              ['horaFin', 'Fin'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key} className="cap-eyebrow">
                {label}
              </Label>
              <Input
                id={key}
                type="time"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="h-11"
              />
            </div>
          ))}
        </div>
        {resumenTiempos && (
          <p className="mt-3 text-xs text-text-secondary">{resumenTiempos}</p>
        )}
      </section>

      {/* Doctores */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={Users} title="Doctores" />
        {doctors.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            No hay doctores registrados
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {doctors.map((d) => {
              const active = form.doctorIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleArray('doctorIds', d.id)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-border bg-surface text-text-secondary hover:bg-surface-2 hover:text-foreground',
                  )}
                >
                  {displayName(d, { isDoctor: true })}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Folículos */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={Hash} title="Conteo de folículos" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label>
              CB1 <span className="text-[10px] text-text-tertiary">(1 pelo)</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={form.cb1}
              onChange={(e) => set('cb1', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              CB2 <span className="text-[10px] text-text-tertiary">(2 pelos)</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={form.cb2}
              onChange={(e) => set('cb2', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              CB3 <span className="text-[10px] text-text-tertiary">(3 pelos)</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={form.cb3}
              onChange={(e) => set('cb3', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              CB4 <span className="text-[10px] text-text-tertiary">(4 pelos)</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={form.cb4}
              onChange={(e) => set('cb4', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Total{' '}
              <span className="text-[10px] text-text-tertiary">(opcional)</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={form.totalFoliculos}
              onChange={(e) => set('totalFoliculos', e.target.value)}
              placeholder={follicleSum > 0 ? String(follicleSum) : ''}
              className="cap-mono h-11"
            />
          </div>
        </div>

        {follicleSum > 0 && (
          <div className="mt-5 rounded-md border border-border bg-surface-2 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="cap-eyebrow">Distribución en vivo</div>
              <div className="cap-mono text-xs text-text-secondary">
                <span className="font-medium text-foreground">
                  {follicleSum.toLocaleString()}
                </span>{' '}
                folículos ·{' '}
                <span className="font-medium text-foreground">
                  {hairCount.toLocaleString()}
                </span>{' '}
                pelos ·{' '}
                <span className="font-medium text-foreground">
                  {(hairCount / follicleSum).toFixed(2)}
                </span>{' '}
                pelos/folículo
              </div>
            </div>
            <FollicleDistributionBar
              cb1={cb1n}
              cb2={cb2n}
              cb3={cb3n}
              cb4={cb4n}
            />
          </div>
        )}
      </section>

      {/* Zonas tratadas */}
      {hairTypes.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <SectionHeader icon={Scissors} title="Zonas tratadas" />
          <div className="flex flex-wrap gap-1.5">
            {hairTypes.map((ht) => {
              const active = form.hairTypeIds.includes(ht.id);
              return (
                <button
                  key={ht.id}
                  type="button"
                  onClick={() => toggleArray('hairTypeIds', ht.id)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'border-amber bg-amber-soft text-amber'
                      : 'border-border bg-surface text-text-secondary hover:bg-surface-2 hover:text-foreground',
                  )}
                >
                  {ht.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Anestesia — unified */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={Syringe} title="Anestesia" />

        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-text-tertiary" />
          <span className="cap-eyebrow">Recetas rápidas</span>
          <div className="flex flex-wrap gap-1.5">
            {ANESTHESIA_RECIPES.map((r) => (
              <ChoicePill key={r.label} active={false} onClick={() => applyRecipe(r)}>
                {r.label}
              </ChoicePill>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[140px_1fr_1fr] items-center gap-3 border-b border-border pb-2">
          <span />
          <span className="cap-eyebrow">Extracción</span>
          <span className="cap-eyebrow">Implantación</span>
        </div>

        <AnesthesiaRow
          label="Lidocaína"
          placeholder="2%"
          extValue={form.anestExtLidocaina}
          impValue={form.anestImpLidocaina}
          onExtChange={(v) => set('anestExtLidocaina', v)}
          onImpChange={(v) => set('anestImpLidocaina', v)}
        />
        <AnesthesiaRow
          label="Adrenalina"
          unit="mL"
          type="number"
          extValue={form.anestExtAdrenalina}
          impValue={form.anestImpAdrenalina}
          onExtChange={(v) => set('anestExtAdrenalina', v)}
          onImpChange={(v) => set('anestImpAdrenalina', v)}
        />
        <AnesthesiaRow
          label="Bicarbonato"
          unit="mL"
          type="number"
          extValue={form.anestExtBicarbonatoDeSodio}
          impValue={form.anestImpBicarbonatoDeSodio}
          onExtChange={(v) => set('anestExtBicarbonatoDeSodio', v)}
          onImpChange={(v) => set('anestImpBicarbonatoDeSodio', v)}
        />
        <AnesthesiaRow
          label="Sol. fisiológica"
          unit="mL"
          type="number"
          extValue={form.anestExtSolucionFisiologica}
          impValue={form.anestImpSolucionFisiologica}
          onExtChange={(v) => set('anestExtSolucionFisiologica', v)}
          onImpChange={(v) => set('anestImpSolucionFisiologica', v)}
        />
        <AnesthesiaRow
          label="Anest. infiltrada"
          extValue={form.anestExtAnestesiaInfiltrada}
          impValue={form.anestImpAnestesiaInfiltrada}
          onExtChange={(v) => set('anestExtAnestesiaInfiltrada', v)}
          onImpChange={(v) => set('anestImpAnestesiaInfiltrada', v)}
        />
        <AnesthesiaRow
          label="Betametasona"
          extValue={form.anestExtBetametasona}
          impValue={form.anestImpBetametasona}
          onExtChange={(v) => set('anestExtBetametasona', v)}
          onImpChange={(v) => set('anestImpBetametasona', v)}
        />
      </section>

      {/* Descripción */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={FileText} title="Descripción" />
        <Textarea
          value={form.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          rows={3}
          placeholder="Notas del procedimiento, incidencias, detalles técnicos..."
          className="resize-none"
        />
      </section>

      {createMutation.isError && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear procedimiento'}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-11 px-8 font-medium"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Guardando...' : 'Guardar procedimiento'}
        </Button>
      </div>
    </form>
  );
}

export default function PatientProceduresPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: procedures, isLoading } = useProceduresByPatient(params.id);
  const [showForm, setShowForm] = useState(false);
  const canWrite = useHasRole('admin', 'doctor');

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/dashboard/patients/${params.id}`}
        className="inline-flex w-fit items-center gap-1 text-xs text-text-secondary transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Volver al paciente
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="cap-h2 mb-1">Procedimientos</h2>
          <p className="text-[13px] text-text-secondary">
            {procedures
              ? `${procedures.length} procedimiento${procedures.length === 1 ? '' : 's'} registrado${procedures.length === 1 ? '' : 's'}`
              : 'Cargando...'}
          </p>
        </div>
        {!showForm && canWrite && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Nuevo procedimiento
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-surface py-16 shadow-xs">
          <p className="text-sm text-text-secondary">Cargando...</p>
        </div>
      ) : showForm ? (
        <ProcedureForm
          patientId={params.id}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      ) : procedures && procedures.length > 0 ? (
        <div className="flex flex-col gap-4">
          {agruparPorSesion(procedures).map((sesion, _i, todas) => (
            <TarjetaSesion
              key={sesion.key}
              sesion={sesion}
              candidatos={todas
                .filter((o) => o.key !== sesion.key)
                .flatMap((o) => o.dias)}
              puedeEditar={canWrite}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-16 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <Scissors className="h-6 w-6 text-text-tertiary" />
          </div>
          <p className="text-sm text-text-secondary">
            No hay procedimientos registrados
          </p>
          {canWrite && (
            <Button size="sm" className="mt-2 gap-1.5" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Crear procedimiento
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
