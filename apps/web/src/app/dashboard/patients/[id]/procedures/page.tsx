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
} from '@/hooks/use-clinical';
import type { ProcedureReport } from '@/hooks/use-clinical';
import { useHasRole } from '@/hooks/use-has-role';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

function ProcedureCard({ procedure }: { procedure: ProcedureReport }) {
  const cb1 = procedure.cb1 ?? 0;
  const cb2 = procedure.cb2 ?? 0;
  const cb3 = procedure.cb3 ?? 0;
  const cb4 = procedure.cb4 ?? 0;
  const folicullesSum = cb1 + cb2 + cb3 + cb4;
  const hairCount = cb1 + cb2 * 2 + cb3 * 3 + cb4 * 4;
  const displayTotal = procedure.totalFoliculos ?? folicullesSum;

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
            {format(new Date(procedure.procedureDate), "dd 'de' MMMM yyyy", {
              locale: es,
            })}
          </div>
          {procedure.doctors && procedure.doctors.length > 0 && (
            <div className="text-xs text-text-tertiary">
              {procedure.doctors
                .map((d) => `Dr. ${d.doctor.nombre} ${d.doctor.apellido}`)
                .join(' · ')}
            </div>
          )}
        </div>
        {displayTotal > 0 && (
          <div className="text-right">
            <div className="cap-eyebrow">Total folículos</div>
            <div className="cap-mono text-xl font-semibold text-brand-dark">
              {displayTotal.toLocaleString()}
            </div>
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
                    ≈ {hairCount.toLocaleString()} pelos
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

        {procedure.hairTypes && procedure.hairTypes.length > 0 && (
          <div>
            <div className="cap-eyebrow mb-2">Tipos de cabello</div>
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

  const [form, setForm] = useState({
    procedureDate: new Date().toISOString().split('T')[0],
    descripcion: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const num = (v: string) => (v ? Number(v) : undefined);
    const str = (v: string) => v || undefined;

    const payload: any = {
      patientId,
      procedureDate: form.procedureDate,
      descripcion: str(form.descripcion),
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
                  Dr. {d.nombre} {d.apellido}
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
                folículos · ≈{' '}
                <span className="font-medium text-foreground">
                  {hairCount.toLocaleString()}
                </span>{' '}
                pelos
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

      {/* Tipos de cabello */}
      {hairTypes.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <SectionHeader icon={Scissors} title="Tipos de cabello" />
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
          {procedures.map((p) => (
            <ProcedureCard key={p.id} procedure={p} />
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
