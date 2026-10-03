'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/patients/patient-context-link';
import {
  ChevronLeft,
  Plus,
  Pencil,
  FileText,
  HeartPulse,
  Dna,
  Pill,
  Stethoscope,
  ClipboardList,
  Activity,
  Microscope,
  Cigarette,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useClinicalHistoriesByPatient,
  useCreateClinicalHistory,
  useUpdateClinicalHistory,
} from '@/hooks/use-clinical';
import type { ClinicalHistory } from '@/hooks/use-clinical';
import { usePatient } from '@/hooks/use-patients';
import { useHasRole } from '@/hooks/use-has-role';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const HISTORY_SECTIONS = [
  ['heredofamiliares', 'Heredofamiliares'],
  ['habitos', 'Hábitos'],
  ['patologicos', 'Patológicos'],
  ['previos', 'Tratamientos previos'],
  ['motivo', 'Motivo'],
  ['exploracion', 'Exploración'],
  ['diagnostico', 'Diagnóstico'],
  ['plan', 'Plan'],
] as const;

// ── Templates ──────────────────────────────────────────────

const PADECIMIENTO_TEMPLATES = [
  'Caída de cabello progresiva',
  'Revaloración',
  'Disminución de densidad capilar',
  'Consulta para valoración',
  'Pérdida de cabello post parto',
];

const PATOLOGICOS_TEMPLATES = [
  'Diabetes mellitus tipo 2',
  'Hipertensión arterial',
  'Hipotiroidismo',
  'Alergia a penicilina',
  'Niega patologías previas',
];

const DIAGNOSTICO_TEMPLATES = [
  'Alopecia Androgenética',
  'Alopecia de Patrón Femenino',
  'Alopecia Frontal Fibrosante',
  'Alopecia Areata',
  'Alopecia Cicatrizal',
  'Alopecia Difusa',
  'Efluvio Telógeno',
  'Dermatitis Seborreica',
];

const TRATAMIENTO_TEMPLATES = [
  'Minoxidil 5% tópico BID',
  'Finasteride 1mg VO diario',
  'PRP mensual × 3 sesiones',
  'Dutasteride 0.5mg VO diario',
  'Suplementación biotina + zinc',
  'Control en 3 meses',
];

// ── Field configs ──────────────────────────────────────────

const INHERIT_FIELDS = [
  { key: 'ir_hta', label: 'HTA' },
  { key: 'ir_dm', label: 'Diabetes mellitus' },
  { key: 'ir_ca', label: 'Cáncer' },
  { key: 'ir_respiratorios', label: 'Respiratorios' },
] as const;

const HABITS_FIELDS = [
  { key: 'np_tabaquismo', label: 'Tabaquismo' },
  { key: 'np_alcoholismo', label: 'Alcoholismo' },
  { key: 'np_alergias', label: 'Alergias' },
  { key: 'np_actFisica', label: 'Actividad física' },
] as const;

const PREVTREAT_FIELDS = [
  { key: 'pt_minoxidil', label: 'Minoxidil' },
  { key: 'pt_finasteride', label: 'Finasteride' },
  { key: 'pt_dutasteride', label: 'Dutasteride' },
  { key: 'pt_bicalutamida', label: 'Bicalutamida' },
  { key: 'pt_fue', label: 'FUE' },
  { key: 'pt_fuss', label: 'FUSS' },
] as const;

// ── Helpers ────────────────────────────────────────────────

function appendTemplate(current: string, template: string) {
  if (!current.trim()) return template;
  return current + '\n' + template;
}

function computeBMI(pesoKg: number, talla: number, unit?: string | null) {
  if (!pesoKg || !talla || !['cm', 'm'].includes(unit ?? '')) return null;
  const m = unit === 'cm' ? talla / 100 : talla;
  return pesoKg / (m * m);
}

function bmiCategory(bmi: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (bmi < 18.5)
    return {
      label: 'Bajo peso',
      color: 'hsl(var(--accent-info))',
      bg: 'hsl(var(--accent-info-soft))',
      border: 'hsl(var(--accent-info) / 0.25)',
    };
  if (bmi < 25)
    return {
      label: 'Normal',
      color: 'hsl(var(--brand-primary))',
      bg: 'hsl(var(--brand-primary-soft))',
      border: 'hsl(var(--brand-primary) / 0.25)',
    };
  if (bmi < 30)
    return {
      label: 'Sobrepeso',
      color: 'hsl(var(--accent-amber))',
      bg: 'hsl(var(--accent-amber-soft))',
      border: 'hsl(var(--accent-amber) / 0.25)',
    };
  return {
    label: 'Obesidad',
    color: 'hsl(var(--accent-danger))',
    bg: 'hsl(var(--accent-danger-soft))',
    border: 'hsl(var(--accent-danger) / 0.25)',
  };
}

// ── UI primitives ──────────────────────────────────────────

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
      <h3 className="cap-eyebrow text-[13px] leading-5">
        {title}
        {required && <span className="ml-1 text-destructive">*</span>}
      </h3>
    </div>
  );
}

function TemplateChip({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-full border border-border bg-surface-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-3 hover:text-foreground"
    >
      {children}
    </button>
  );
}

// ── Bool-list editor ───────────────────────────────────────

type BoolField = { key: string; label: string };

function BoolListEditor<T extends Record<string, any>>({
  fields,
  values,
  onToggle,
  negadosKey,
  onNegadosAll,
  otrosKey,
  otrosPlaceholder,
}: {
  fields: readonly BoolField[];
  values: T;
  onToggle: (key: string) => void;
  negadosKey: keyof T;
  onNegadosAll: () => void;
  otrosKey: keyof T;
  otrosPlaceholder?: string;
}) {
  const negados = values[negadosKey] === true;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onNegadosAll}
          aria-pressed={negados}
          className={cn(
            'min-h-11 rounded-sm border px-3 py-2 text-sm font-semibold transition-colors',
            negados
              ? 'border-destructive bg-destructive/10 text-destructive'
              : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-2',
          )}
        >
          {negados ? '✓ Todos negados' : 'Todos negados'}
        </button>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {fields.map((f) => {
            const active = values[f.key] === true && !negados;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => onToggle(f.key)}
                disabled={negados}
                aria-pressed={active}
                className={cn(
                  'min-h-11 rounded-sm border px-3 py-2 text-sm font-medium transition-colors',
                  negados
                    ? 'cursor-not-allowed border-border bg-surface-2 text-text-tertiary/60'
                    : active
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-border-strong bg-surface text-foreground hover:bg-surface-2',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
      <Input
        aria-label={otrosPlaceholder ?? 'Otros'}
        placeholder={otrosPlaceholder ?? 'Otros...'}
        value={(values[otrosKey] as string) ?? ''}
        onChange={(e) => onToggle(`__otros__:${String(otrosKey)}:${e.target.value}`)}
        disabled={negados}
        className="h-10"
      />
    </div>
  );
}

// ── View (read-only) ───────────────────────────────────────

function BoolPill({
  label,
  value,
}: {
  label: string;
  value: boolean | null | undefined;
}) {
  const active = value === true;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        active
          ? 'border-brand/25 bg-brand-soft text-brand-dark'
          : 'border-border bg-surface-2 text-text-tertiary',
      )}
    >
      {active && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
      {label}
      {!active && (
        <span className="text-[10px] text-text-tertiary/80">· no</span>
      )}
    </span>
  );
}

function HistoryView({ history }: { history: ClinicalHistory }) {
  const ir = history.inheritRelatives;
  const np = history.nonPathologicalPersonal;
  const pt = history.previousTreatment;
  const pe = history.physicalExploration;

  const bmi =
    pe?.peso && pe?.talla
      ? computeBMI(Number(pe.peso), Number(pe.talla), pe.tallaUnidad)
      : null;
  const bmiCat = bmi != null ? bmiCategory(bmi) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4 shadow-xs">
        <div>
          <div className="cap-eyebrow">Historia clínica</div>
          <div className="text-sm font-medium">
            Creada el{' '}
            {format(new Date(history.createdAt), "dd 'de' MMMM yyyy", {
              locale: es,
            })}
          </div>
        </div>
      </div>

      {ir && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
          <SectionHeader icon={Dna} title="Antecedentes heredofamiliares" />
          {ir.negados ? (
            <span className="inline-flex items-center rounded-sm border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
              Todos negados
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <BoolPill label="HTA" value={ir.hta} />
              <BoolPill label="Diabetes mellitus" value={ir.dm} />
              <BoolPill label="Cáncer" value={ir.ca} />
              <BoolPill label="Respiratorios" value={ir.respiratorios} />
            </div>
          )}
          {ir.otros && (
            <p className="mt-2 text-xs text-text-secondary">
              <span className="cap-eyebrow mr-1">Otros</span>
              {ir.otros}
            </p>
          )}
        </section>
      )}

      {np && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
          <SectionHeader
            icon={Cigarette}
            title="Antecedentes personales no patológicos"
          />
          <div className="flex flex-wrap gap-1.5">
            <BoolPill label="Tabaquismo" value={np.tabaquismo} />
            <BoolPill label="Alcoholismo" value={np.alcoholismo} />
            <BoolPill label="Alergias" value={np.alergias} />
            <BoolPill label="Actividad física" value={np.actFisica} />
          </div>
          {np.otros && (
            <p className="mt-2 text-xs text-text-secondary">
              <span className="cap-eyebrow mr-1">Otros</span>
              {np.otros}
            </p>
          )}
        </section>
      )}

      {history.personalesPatologicos && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
          <SectionHeader
            icon={HeartPulse}
            title="Antecedentes personales patológicos"
          />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {history.personalesPatologicos}
          </p>
        </section>
      )}

      {pt && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
          <SectionHeader icon={History} title="Tratamientos previos" />
          {pt.negados ? (
            <span className="inline-flex items-center rounded-sm border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
              Todos negados
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <BoolPill label="Minoxidil" value={pt.minoxidil} />
              <BoolPill label="Finasteride" value={pt.finasteride} />
              <BoolPill label="Dutasteride" value={pt.dutasteride} />
              <BoolPill label="Bicalutamida" value={pt.bicalutamida} />
              <BoolPill label="FUE" value={pt.fue} />
              <BoolPill label="FUSS" value={pt.fuss} />
            </div>
          )}
          {pt.otros && (
            <p className="mt-2 text-xs text-text-secondary">
              <span className="cap-eyebrow mr-1">Otros</span>
              {pt.otros}
            </p>
          )}
        </section>
      )}

      {history.padecimientoActual && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
          <SectionHeader icon={ClipboardList} title="Motivo de consulta" />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {history.padecimientoActual}
          </p>
        </section>
      )}

      {pe && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
          <SectionHeader icon={Stethoscope} title="Exploración física" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {pe.fc != null && (
              <div className="rounded-md border border-border bg-surface-2 p-3">
                <div className="cap-eyebrow mb-1">FC</div>
                <div className="cap-mono text-sm font-medium">{pe.fc} bpm</div>
              </div>
            )}
            {pe.ta && (
              <div className="rounded-md border border-border bg-surface-2 p-3">
                <div className="cap-eyebrow mb-1">TA</div>
                <div className="cap-mono text-sm font-medium">
                  {pe.ta} mmHg
                </div>
              </div>
            )}
            {pe.fr != null && (
              <div className="rounded-md border border-border bg-surface-2 p-3">
                <div className="cap-eyebrow mb-1">FR</div>
                <div className="cap-mono text-sm font-medium">{pe.fr} rpm</div>
              </div>
            )}
            {pe.temperatura != null && (
              <div className="rounded-md border border-border bg-surface-2 p-3">
                <div className="cap-eyebrow mb-1">Temperatura</div>
                <div className="cap-mono text-sm font-medium">
                  {pe.temperatura}°C
                </div>
              </div>
            )}
            {pe.peso != null && (
              <div className="rounded-md border border-border bg-surface-2 p-3">
                <div className="cap-eyebrow mb-1">Peso</div>
                <div className="cap-mono text-sm font-medium">{pe.peso} kg</div>
              </div>
            )}
            {pe.talla != null && (
              <div className="rounded-md border border-border bg-surface-2 p-3">
                <div className="cap-eyebrow mb-1">Talla</div>
                <div className="cap-mono text-sm font-medium">
                  {pe.talla} {pe.tallaUnidad || '(unidad sin confirmar)'}
                </div>
              </div>
            )}
            {bmi != null && bmiCat && (
              <div
                className="rounded-md border p-3 sm:col-span-2"
                style={{
                  background: bmiCat.bg,
                  borderColor: bmiCat.border,
                }}
              >
                <div
                  className="cap-eyebrow mb-1"
                  style={{ color: bmiCat.color }}
                >
                  IMC
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="cap-mono text-xl font-medium"
                    style={{ color: bmiCat.color }}
                  >
                    {bmi.toFixed(1)}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: bmiCat.color }}
                  >
                    {bmiCat.label}
                  </span>
                </div>
              </div>
            )}
          </div>
          {pe.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
              {pe.description}
            </p>
          )}
        </section>
      )}

      {history.diagnostico && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
          <SectionHeader icon={Microscope} title="Diagnóstico" />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {history.diagnostico}
          </p>
        </section>
      )}

      {history.tratamiento && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
          <SectionHeader icon={Pill} title="Plan de tratamiento" />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {history.tratamiento}
          </p>
        </section>
      )}
    </div>
  );
}

// ── Form ───────────────────────────────────────────────────

function HistoryForm({
  patientId,
  existing,
  onSuccess,
  onCancel,
}: {
  patientId: string;
  existing?: ClinicalHistory;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreateClinicalHistory();
  const updateMutation = useUpdateClinicalHistory();
  const isEdit = !!existing;
  const mutation = isEdit ? updateMutation : createMutation;

  const [form, setForm] = useState(() => {
    const ir = existing?.inheritRelatives;
    const np = existing?.nonPathologicalPersonal;
    const pt = existing?.previousTreatment;
    const pe = existing?.physicalExploration;
    const numStr = (v: number | undefined | null) =>
      v == null ? '' : String(v);
    return {
      padecimientoActual: existing?.padecimientoActual ?? '',
      personalesPatologicos: existing?.personalesPatologicos ?? '',
      diagnostico: existing?.diagnostico ?? '',
      tratamiento: existing?.tratamiento ?? '',
      // Heredofamiliares
      ir_negados: ir?.negados ?? false,
      ir_hta: ir?.hta ?? false,
      ir_dm: ir?.dm ?? false,
      ir_ca: ir?.ca ?? false,
      ir_respiratorios: ir?.respiratorios ?? false,
      ir_otros: ir?.otros ?? '',
      // Hábitos
      np_tabaquismo: np?.tabaquismo ?? false,
      np_alcoholismo: np?.alcoholismo ?? false,
      np_alergias: np?.alergias ?? false,
      np_actFisica: np?.actFisica ?? false,
      np_otros: np?.otros ?? '',
      // Tratamientos previos
      pt_negados: pt?.negados ?? false,
      pt_minoxidil: pt?.minoxidil ?? false,
      pt_fue: pt?.fue ?? false,
      pt_finasteride: pt?.finasteride ?? false,
      pt_fuss: pt?.fuss ?? false,
      pt_dutasteride: pt?.dutasteride ?? false,
      pt_bicalutamida: pt?.bicalutamida ?? false,
      pt_otros: pt?.otros ?? '',
      // Exploración física
      pe_fc: numStr(pe?.fc),
      pe_ta: pe?.ta ?? '',
      pe_fr: numStr(pe?.fr),
      pe_temperatura: numStr(pe?.temperatura),
      pe_peso: numStr(pe?.peso),
      pe_talla: numStr(pe?.talla),
      pe_tallaUnidad: pe?.tallaUnidad || '',
      pe_description: pe?.description ?? '',
    };
  });

  const initialSnapshot = useRef(JSON.stringify(form));
  const hasUnsavedChanges = JSON.stringify(form) !== initialSnapshot.current;
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsHeight, setActionsHeight] = useState(136);

  useEffect(() => {
    const actions = actionsRef.current;
    if (!actions) return;
    const measure = () => setActionsHeight(actions.getBoundingClientRect().height);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(actions);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const set = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Special handler compatible with BoolListEditor (keeps toggle + otros writes in one callback)
  const handleBoolChange = (instruction: string) => {
    if (instruction.startsWith('__otros__:')) {
      const [, key, ...rest] = instruction.split(':');
      set(key, rest.join(':'));
      return;
    }
    setForm((prev) => ({
      ...prev,
      [instruction]: !prev[instruction as keyof typeof prev],
    }));
  };

  // "Todos negados" para un grupo: limpia individuales y toggle negados
  const negadosAll = (prefix: 'ir' | 'pt', fields: readonly BoolField[]) => {
    setForm((prev) => {
      const next = { ...prev };
      const negadosKey = `${prefix}_negados` as keyof typeof prev;
      const currentNegados = prev[negadosKey] as boolean;
      if (currentNegados) {
        // turning OFF
        (next as any)[negadosKey] = false;
      } else {
        // turning ON — clear individuals
        (next as any)[negadosKey] = true;
        fields.forEach((f) => {
          (next as any)[f.key] = false;
        });
      }
      return next;
    });
  };

  // Live BMI
  const peso = parseFloat(form.pe_peso) || 0;
  const talla = parseFloat(form.pe_talla) || 0;
  const bmi = peso && talla ? computeBMI(peso, talla, form.pe_tallaUnidad) : null;
  const bmiCat = bmi != null ? bmiCategory(bmi) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      patientId,
      padecimientoActual: form.padecimientoActual || undefined,
      personalesPatologicos: form.personalesPatologicos || undefined,
      diagnostico: form.diagnostico || undefined,
      tratamiento: form.tratamiento || undefined,
      inheritRelatives: {
        negados: form.ir_negados,
        hta: form.ir_hta,
        dm: form.ir_dm,
        ca: form.ir_ca,
        respiratorios: form.ir_respiratorios,
        otros: form.ir_otros || undefined,
      },
      nonPathologicalPersonal: {
        tabaquismo: form.np_tabaquismo,
        alcoholismo: form.np_alcoholismo,
        alergias: form.np_alergias,
        actFisica: form.np_actFisica,
        otros: form.np_otros || undefined,
      },
      previousTreatment: {
        negados: form.pt_negados,
        minoxidil: form.pt_minoxidil,
        fue: form.pt_fue,
        finasteride: form.pt_finasteride,
        fuss: form.pt_fuss,
        dutasteride: form.pt_dutasteride,
        bicalutamida: form.pt_bicalutamida,
        otros: form.pt_otros || undefined,
      },
    };

    const hasPE =
      form.pe_fc ||
      form.pe_ta ||
      form.pe_fr ||
      form.pe_temperatura ||
      form.pe_peso ||
      form.pe_talla ||
      form.pe_description;
    if (hasPE) {
      payload.physicalExploration = {
        fc: form.pe_fc ? Number(form.pe_fc) : undefined,
        ta: form.pe_ta || undefined,
        fr: form.pe_fr ? Number(form.pe_fr) : undefined,
        temperatura: form.pe_temperatura
          ? Number(form.pe_temperatura)
          : undefined,
        peso: form.pe_peso ? Number(form.pe_peso) : undefined,
        talla: form.pe_talla ? Number(form.pe_talla) : undefined,
        tallaUnidad: form.pe_tallaUnidad || null,
        description: form.pe_description || undefined,
      };
    }

    try {
      if (isEdit && existing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          patientId,
          ...payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess();
    } catch {
      // captured in mutation.error
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ paddingBottom: `calc(${actionsHeight}px + 1.5rem)` }} className="flex min-w-0 flex-col gap-5 [&_input]:text-base [&_select]:text-base [&_textarea]:text-base sm:[&_input]:text-sm sm:[&_select]:text-sm sm:[&_textarea]:text-sm">
      <nav aria-label="Secciones de historia" className="sticky top-[calc(var(--dashboard-header-height,0px)+0.75rem)] z-20 flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-surface p-2 shadow-xs">
        {HISTORY_SECTIONS.map(([id, label]) => (
          <a key={id} href={`#history-${id}`} className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-brand-softer hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            {label}
          </a>
        ))}
      </nav>
      {/* Antecedentes heredofamiliares */}
      <section id="history-heredofamiliares" tabIndex={-1} className="scroll-mt-[calc(var(--dashboard-header-height,0px)+5.5rem)] rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
        <SectionHeader icon={Dna} title="Antecedentes heredofamiliares" />
        <BoolListEditor
          fields={INHERIT_FIELDS}
          values={form}
          onToggle={handleBoolChange}
          negadosKey="ir_negados"
          onNegadosAll={() => negadosAll('ir', INHERIT_FIELDS)}
          otrosKey="ir_otros"
          otrosPlaceholder="Otros antecedentes heredofamiliares..."
        />
      </section>

      {/* Antecedentes personales no patológicos */}
      <section id="history-habitos" tabIndex={-1} className="scroll-mt-[calc(var(--dashboard-header-height,0px)+5.5rem)] rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
        <SectionHeader
          icon={Cigarette}
          title="Antecedentes personales no patológicos"
        />
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {HABITS_FIELDS.map((f) => {
              const active = form[f.key as keyof typeof form] === true;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => handleBoolChange(f.key)}
                  aria-pressed={active}
                  className={cn(
                    'min-h-11 rounded-sm border px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-border-strong bg-surface text-foreground hover:bg-surface-2',
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <Input
            aria-label="Otros hábitos"
            placeholder="Otros hábitos..."
            value={form.np_otros}
            onChange={(e) => set('np_otros', e.target.value)}
            className="h-10"
          />
        </div>
      </section>

      {/* Antecedentes personales patológicos */}
      <section id="history-patologicos" tabIndex={-1} className="scroll-mt-[calc(var(--dashboard-header-height,0px)+5.5rem)] rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
        <SectionHeader
          icon={HeartPulse}
          title="Antecedentes personales patológicos"
        />
        <div className="space-y-2">
          <Textarea
            aria-label="Antecedentes personales patológicos"
            value={form.personalesPatologicos}
            onChange={(e) => set('personalesPatologicos', e.target.value)}
            rows={3}
            placeholder="Enfermedades previas, cirugías, alergias medicamentosas..."
            className="resize-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {PATOLOGICOS_TEMPLATES.map((t) => (
              <TemplateChip
                key={t}
                onClick={() =>
                  set(
                    'personalesPatologicos',
                    appendTemplate(form.personalesPatologicos, t),
                  )
                }
              >
                {t}
              </TemplateChip>
            ))}
          </div>
        </div>
      </section>

      {/* Tratamientos previos */}
      <section id="history-previos" tabIndex={-1} className="scroll-mt-[calc(var(--dashboard-header-height,0px)+5.5rem)] rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
        <SectionHeader icon={History} title="Tratamientos previos" />
        <BoolListEditor
          fields={PREVTREAT_FIELDS}
          values={form}
          onToggle={handleBoolChange}
          negadosKey="pt_negados"
          onNegadosAll={() => negadosAll('pt', PREVTREAT_FIELDS)}
          otrosKey="pt_otros"
          otrosPlaceholder="Otros tratamientos previos, dosis, tiempo..."
        />
      </section>

      {/* Motivo de consulta */}
      <section id="history-motivo" tabIndex={-1} className="scroll-mt-[calc(var(--dashboard-header-height,0px)+5.5rem)] rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
        <SectionHeader icon={ClipboardList} title="Motivo de consulta" />
        <div className="space-y-2">
          <Textarea
            aria-label="Motivo de consulta"
            value={form.padecimientoActual}
            onChange={(e) => set('padecimientoActual', e.target.value)}
            rows={3}
            placeholder="¿Por qué viene? Ej: caída de cabello progresiva, revaloración..."
            className="resize-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {PADECIMIENTO_TEMPLATES.map((t) => (
              <TemplateChip
                key={t}
                onClick={() =>
                  set(
                    'padecimientoActual',
                    appendTemplate(form.padecimientoActual, t),
                  )
                }
              >
                {t}
              </TemplateChip>
            ))}
          </div>
        </div>
      </section>

      {/* Exploración física */}
      <section id="history-exploracion" tabIndex={-1} className="scroll-mt-[calc(var(--dashboard-header-height,0px)+5.5rem)] rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
        <SectionHeader icon={Stethoscope} title="Exploración física" />
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="history-pe-fc">FC (bpm)</Label>
            <Input
              id="history-pe-fc"
              type="number"
              value={form.pe_fc}
              onChange={(e) => set('pe_fc', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="history-pe-ta">TA (mmHg)</Label>
            <Input
              id="history-pe-ta"
              placeholder="120/80"
              value={form.pe_ta}
              onChange={(e) => set('pe_ta', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="history-pe-fr">FR (rpm)</Label>
            <Input
              id="history-pe-fr"
              type="number"
              value={form.pe_fr}
              onChange={(e) => set('pe_fr', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="history-pe-temperature">Temperatura (°C)</Label>
            <Input
              id="history-pe-temperature"
              type="number"
              step="0.1"
              value={form.pe_temperatura}
              onChange={(e) => set('pe_temperatura', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="history-pe-weight">Peso (kg)</Label>
            <Input
              id="history-pe-weight"
              type="number"
              step="0.1"
              value={form.pe_peso}
              onChange={(e) => set('pe_peso', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="history-pe-height">Talla</Label>
            <select aria-label="Unidad de talla" className="h-11 w-full rounded border px-2" value={form.pe_tallaUnidad} onChange={e => set('pe_tallaUnidad', e.target.value)}><option value="">Unidad sin confirmar</option><option value="cm">Centímetros</option><option value="m">Metros</option></select>
            <Input
              id="history-pe-height"
              type="number"
              step="0.1"
              value={form.pe_talla}
              onChange={(e) => set('pe_talla', e.target.value)}
              className="cap-mono h-11"
            />
          </div>
        </div>

        {bmi != null && bmiCat && (
          <div
            className="mt-5 flex items-center gap-3 rounded-md border p-3"
            style={{ background: bmiCat.bg, borderColor: bmiCat.border }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{
                background: bmiCat.color,
                color: 'white',
              }}
            >
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div
                className="cap-eyebrow"
                style={{ color: bmiCat.color }}
              >
                IMC calculado
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="cap-mono text-xl font-medium"
                  style={{ color: bmiCat.color }}
                >
                  {bmi.toFixed(1)}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: bmiCat.color }}
                >
                  {bmiCat.label}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="history-pe-description">Descripción</Label>
          <Textarea
            id="history-pe-description"
            value={form.pe_description}
            onChange={(e) => set('pe_description', e.target.value)}
            rows={2}
            placeholder="Hallazgos relevantes de la exploración..."
            className="resize-none"
          />
        </div>
      </section>

      {/* Diagnóstico */}
      <section id="history-diagnostico" tabIndex={-1} className="scroll-mt-[calc(var(--dashboard-header-height,0px)+5.5rem)] rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
        <SectionHeader icon={Microscope} title="Diagnóstico" />
        <div className="space-y-2">
          <Textarea
            aria-label="Diagnóstico"
            value={form.diagnostico}
            onChange={(e) => set('diagnostico', e.target.value)}
            rows={3}
            placeholder="Diagnóstico clínico (tipo de alopecia, comorbilidades dermatológicas...)"
            className="resize-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {DIAGNOSTICO_TEMPLATES.map((t) => (
              <TemplateChip
                key={t}
                onClick={() =>
                  set('diagnostico', appendTemplate(form.diagnostico, t))
                }
              >
                {t}
              </TemplateChip>
            ))}
          </div>
        </div>
      </section>

      {/* Plan de tratamiento */}
      <section id="history-plan" tabIndex={-1} className="scroll-mt-[calc(var(--dashboard-header-height,0px)+5.5rem)] rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6">
        <SectionHeader icon={Pill} title="Plan de tratamiento" />
        <div className="space-y-2">
          <Textarea
            aria-label="Plan de tratamiento"
            value={form.tratamiento}
            onChange={(e) => set('tratamiento', e.target.value)}
            rows={3}
            placeholder="Plan terapéutico propuesto..."
            className="resize-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {TRATAMIENTO_TEMPLATES.map((t) => (
              <TemplateChip
                key={t}
                onClick={() =>
                  set('tratamiento', appendTemplate(form.tratamiento, t))
                }
              >
                {t}
              </TemplateChip>
            ))}
          </div>
        </div>
      </section>

      <div ref={actionsRef} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg lg:left-[248px]">
        <div className="mx-auto flex max-w-[1424px] flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p role="status" aria-live="polite" className={cn('text-sm font-medium', hasUnsavedChanges ? 'text-brand-dark' : 'text-text-secondary')}>
              {mutation.isPending ? 'Guardando...' : hasUnsavedChanges ? 'Cambios pendientes' : 'Sin cambios pendientes'}
            </p>
            {mutation.isError && <p role="alert" className="mt-1 text-sm text-destructive [overflow-wrap:anywhere]">
              {mutation.error?.message || (isEdit ? 'Error al actualizar historia clínica' : 'Error al crear historia clínica')}
            </p>}
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 sm:flex-none"
          onClick={onCancel}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-11 flex-1 px-4 font-medium sm:flex-none sm:px-8"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? 'Guardando...'
            : isEdit
              ? 'Guardar cambios'
              : 'Guardar historia'}
        </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function PatientHistoryPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: histories, isLoading } = useClinicalHistoriesByPatient(
    params.id,
  );
  const { data: patient } = usePatient(params.id);
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canWrite = useHasRole('admin', 'doctor');

  const total = histories?.length ?? 0;
  const selectedHistory =
    (selectedId && histories?.find((h) => h.id === selectedId)) ||
    histories?.[0];
  const isLatestSelected =
    !!selectedHistory && selectedHistory.id === histories?.[0]?.id;
  const showForm = mode !== 'view';

  const patientName = patient
    ? `${patient.nombre} ${patient.apellido}`.trim()
    : null;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/dashboard/patients/${params.id}`}
        className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-text-secondary transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Volver al paciente
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="cap-eyebrow mb-1">Historia clínica</div>
          <h2 className="cap-h2 mb-1 [overflow-wrap:anywhere]">
            {patientName ?? 'Cargando paciente...'}
          </h2>
          <p className="text-[13px] text-text-secondary">
            {total === 0
              ? 'Sin historia clínica'
              : total === 1
                ? '1 historia registrada'
                : `${total} historias registradas`}
          </p>
        </div>
        {!showForm && canWrite && (
          <div className="flex items-center gap-2">
            {selectedHistory && isLatestSelected && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setMode('edit')}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setMode('create')}
            >
              <Plus className="h-3.5 w-3.5" />
              {selectedHistory ? 'Nueva historia' : 'Crear historia'}
            </Button>
          </div>
        )}
      </div>

      {!showForm && histories && histories.length > 1 && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="cap-eyebrow mb-2.5">Historias previas</div>
          <div className="flex flex-wrap gap-1.5">
            {histories.map((h, idx) => {
              const active = h.id === selectedHistory?.id;
              const isLatest = idx === 0;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedId(h.id)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                    active
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-foreground',
                  )}
                >
                  {format(new Date(h.createdAt), "dd MMM yyyy", { locale: es })}
                  {isLatest && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide',
                        active
                          ? 'bg-brand text-white'
                          : 'bg-surface-3 text-text-tertiary',
                      )}
                    >
                      Actual
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!showForm && selectedHistory && !isLatestSelected && (
        <div className="flex items-center justify-between rounded-md border border-amber/25 bg-amber-soft px-4 py-2.5 text-xs text-amber">
          <span>Estás viendo una historia anterior (solo lectura).</span>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="font-medium underline-offset-2 hover:underline"
          >
            Ver la más reciente
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-surface py-16 shadow-xs">
          <p className="text-sm text-text-secondary">Cargando...</p>
        </div>
      ) : showForm ? (
        <HistoryForm
          patientId={params.id}
          existing={mode === 'edit' ? selectedHistory : undefined}
          onSuccess={() => setMode('view')}
          onCancel={() => setMode('view')}
        />
      ) : selectedHistory ? (
        <HistoryView history={selectedHistory} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-16 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <FileText className="h-6 w-6 text-text-tertiary" />
          </div>
          <p className="text-sm text-text-secondary">
            No hay historia clínica registrada
          </p>
          {canWrite && (
            <Button
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => setMode('create')}
            >
              <Plus className="h-3.5 w-3.5" /> Crear historia clínica
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
