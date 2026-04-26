'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  MapPin,
  Tag,
  FileCheck,
  Megaphone,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PatientType,
  Gender,
  MaritalStatus,
  Occupation,
  OriginChannel,
} from '@capillaris/shared';

// ── Schema ─────────────────────────────────────────────────

const patientSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  celular: z.string().optional(),
  direccion: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  edadApproximada: z.boolean().optional(),
  genero: z.string().optional(),
  estadoCivil: z.string().optional(),
  ocupacion: z.string().optional(),
  tipoPaciente: z.string().optional(),
  origenCanal: z.string().optional(),
  referidoPor: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  pais: z.string().optional(),
  consentDataProcessing: z.boolean().optional(),
  consentMarketing: z.boolean().optional(),
  notasInternas: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

// ── Label maps ─────────────────────────────────────────────

const PATIENT_TYPE_LABELS: Record<string, string> = {
  [PatientType.LEAD]: 'Lead',
  [PatientType.REGISTERED]: 'Registrado',
  [PatientType.EVALUATION]: 'En evaluación',
  [PatientType.ACTIVE]: 'Activo',
  [PatientType.INACTIVE]: 'Inactivo',
  [PatientType.ARCHIVED]: 'Archivado',
};

const PATIENT_TYPE_TONES: Record<
  string,
  { color: string; bg: string; border: string }
> = {
  [PatientType.LEAD]: {
    color: 'hsl(var(--accent-lilac))',
    bg: 'hsl(var(--accent-lilac-soft))',
    border: 'hsl(var(--accent-lilac))',
  },
  [PatientType.REGISTERED]: {
    color: 'hsl(var(--accent-info))',
    bg: 'hsl(var(--accent-info-soft))',
    border: 'hsl(var(--accent-info))',
  },
  [PatientType.EVALUATION]: {
    color: 'hsl(var(--accent-amber))',
    bg: 'hsl(var(--accent-amber-soft))',
    border: 'hsl(var(--accent-amber))',
  },
  [PatientType.ACTIVE]: {
    color: 'hsl(var(--brand-primary-dark))',
    bg: 'hsl(var(--brand-primary-soft))',
    border: 'hsl(var(--brand-primary))',
  },
  [PatientType.INACTIVE]: {
    color: 'hsl(var(--text-secondary))',
    bg: 'hsl(var(--surface-2))',
    border: 'hsl(var(--border-strong))',
  },
  [PatientType.ARCHIVED]: {
    color: 'hsl(var(--text-tertiary))',
    bg: 'hsl(var(--surface-2))',
    border: 'hsl(var(--border-strong))',
  },
};

const GENDER_LABELS: Record<string, string> = {
  [Gender.HOMBRE]: 'Hombre',
  [Gender.MUJER]: 'Mujer',
  [Gender.OTRO]: 'Otro',
  [Gender.PREFIERO_NO_DECIR]: 'Prefiero no decir',
};

const MARITAL_STATUS_LABELS: Record<string, string> = {
  [MaritalStatus.SOLTERO]: 'Soltero/a',
  [MaritalStatus.CASADO]: 'Casado/a',
  [MaritalStatus.UNION_LIBRE]: 'Unión libre',
  [MaritalStatus.DIVORCIADO]: 'Divorciado/a',
  [MaritalStatus.VIUDO]: 'Viudo/a',
  [MaritalStatus.OTRO]: 'Otro',
};

const OCCUPATION_LABELS: Record<string, string> = {
  [Occupation.PROFESIONISTA]: 'Profesionista',
  [Occupation.TECNICO]: 'Técnico',
  [Occupation.ESTUDIANTE]: 'Estudiante',
  [Occupation.OTRO]: 'Otro',
};

const ORIGIN_LABELS: Record<string, string> = {
  [OriginChannel.FACEBOOK]: 'Facebook',
  [OriginChannel.INSTAGRAM]: 'Instagram',
  [OriginChannel.WHATSAPP]: 'WhatsApp',
  [OriginChannel.WEB]: 'Web',
  [OriginChannel.REFERIDO]: 'Referido',
  [OriginChannel.GOOGLE]: 'Google',
  [OriginChannel.OTRO]: 'Otro',
};

const COUNTRY_PRESETS = ['Mexico', 'Estados Unidos', 'Guatemala', 'Colombia'];

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

function TypePill({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: { color: string; bg: string; border: string };
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors',
        !active && 'border-border-strong bg-surface text-foreground hover:bg-surface-2',
      )}
      style={
        active
          ? { color: tone.color, background: tone.bg, borderColor: tone.border }
          : undefined
      }
    >
      {active && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: tone.color }}
        />
      )}
      {children}
    </button>
  );
}

function SwitchToggle({
  active,
  onClick,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={active}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
        active ? 'bg-brand' : 'bg-surface-3',
      )}
    >
      <span
        className={cn(
          'block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform',
          active ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function ConsentCard({
  icon: Icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors',
        active
          ? 'border-brand bg-brand-softer'
          : 'border-border bg-surface hover:bg-surface-2',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
          active ? 'bg-brand text-white' : 'bg-surface-2 text-text-secondary',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-text-tertiary">{description}</div>
      </div>
      <SwitchToggle active={active} onClick={onClick} ariaLabel={title} />
    </div>
  );
}

// ── Form ───────────────────────────────────────────────────

interface PatientFormProps {
  defaultValues?: Partial<PatientFormValues>;
  onSubmit: (data: PatientFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

// Age ↔ date helpers — used when "Edad aproximada" is active.
function ageToDate(age: number): string {
  if (!age || age < 0) return '';
  const year = new Date().getFullYear() - age;
  return `${year}-01-01`;
}

function dateToAge(iso: string): number | null {
  if (!iso) return null;
  const year = new Date(iso).getFullYear();
  if (!year) return null;
  return new Date().getFullYear() - year;
}

export function PatientForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = 'Guardar',
}: PatientFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      celular: '',
      tipoPaciente: PatientType.LEAD,
      pais: 'Mexico',
      ...defaultValues,
    },
  });

  const tipoPaciente = watch('tipoPaciente') || '';
  const genero = watch('genero') || '';
  const estadoCivil = watch('estadoCivil') || '';
  const ocupacion = watch('ocupacion') || '';
  const origenCanal = watch('origenCanal') || '';
  const edadAprox = watch('edadApproximada') || false;
  const fechaNacimiento = watch('fechaNacimiento') || '';
  const pais = watch('pais') || '';
  const consentData = watch('consentDataProcessing') || false;
  const consentMkt = watch('consentMarketing') || false;

  // Local state for "age in years" entry when aproximada is active
  const [ageInput, setAgeInput] = useState<string>(() => {
    if (defaultValues?.edadApproximada && defaultValues?.fechaNacimiento) {
      const a = dateToAge(defaultValues.fechaNacimiento);
      return a != null ? String(a) : '';
    }
    return '';
  });

  // When user types age, sync to fechaNacimiento via ageToDate
  useEffect(() => {
    if (!edadAprox) return;
    if (!ageInput) {
      setValue('fechaNacimiento', '');
      return;
    }
    const n = parseInt(ageInput, 10);
    if (!isNaN(n) && n >= 0 && n <= 120) {
      setValue('fechaNacimiento', ageToDate(n));
    }
  }, [ageInput, edadAprox, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Datos personales */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={User} title="Datos personales" required />
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              {...register('nombre')}
              className="h-11"
              placeholder="Nombre del paciente"
            />
            {errors.nombre && (
              <p className="text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apellido">
              Apellido <span className="text-destructive">*</span>
            </Label>
            <Input
              id="apellido"
              {...register('apellido')}
              className="h-11"
              placeholder="Apellido del paciente"
            />
            {errors.apellido && (
              <p className="text-xs text-destructive">
                {errors.apellido.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              className="h-11"
              placeholder="correo@ejemplo.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              {...register('celular')}
              className="h-11"
              placeholder="+52 55 1234 5678"
            />
          </div>

          {/* Fecha nacimiento con toggle aproximada */}
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label>
                <Calendar className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
                {edadAprox ? 'Edad (años)' : 'Fecha de nacimiento'}
              </Label>
              <ChoicePill
                active={edadAprox}
                onClick={() => {
                  const next = !edadAprox;
                  setValue('edadApproximada', next);
                  if (!next) {
                    // Leaving approximate mode — clear local age, keep fechaNacimiento
                    setAgeInput('');
                  } else if (fechaNacimiento) {
                    // Entering approximate mode — derive age from existing date
                    const a = dateToAge(fechaNacimiento);
                    if (a != null) setAgeInput(String(a));
                  }
                }}
              >
                Edad aproximada
              </ChoicePill>
            </div>
            {edadAprox ? (
              <Input
                type="number"
                min="0"
                max="120"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                className="cap-mono h-11 max-w-[180px]"
                placeholder="45"
              />
            ) : (
              <Input
                id="fechaNacimiento"
                type="date"
                {...register('fechaNacimiento')}
                className="h-11 max-w-[220px]"
              />
            )}
          </div>

          {/* Género */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="cap-eyebrow">Género</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(GENDER_LABELS).map(([v, l]) => (
                <ChoicePill
                  key={v}
                  active={genero === v}
                  onClick={() => setValue('genero', genero === v ? '' : v)}
                >
                  {l}
                </ChoicePill>
              ))}
            </div>
          </div>

          {/* Estado civil */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="cap-eyebrow">Estado civil</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(MARITAL_STATUS_LABELS).map(([v, l]) => (
                <ChoicePill
                  key={v}
                  active={estadoCivil === v}
                  onClick={() =>
                    setValue('estadoCivil', estadoCivil === v ? '' : v)
                  }
                >
                  {l}
                </ChoicePill>
              ))}
            </div>
          </div>

          {/* Ocupación */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="cap-eyebrow">Ocupación</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(OCCUPATION_LABELS).map(([v, l]) => (
                <ChoicePill
                  key={v}
                  active={ocupacion === v}
                  onClick={() =>
                    setValue('ocupacion', ocupacion === v ? '' : v)
                  }
                >
                  {l}
                </ChoicePill>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dirección */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={MapPin} title="Dirección" />
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              {...register('direccion')}
              className="h-11"
              placeholder="Calle, número, colonia..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input
              id="ciudad"
              {...register('ciudad')}
              className="h-11"
              placeholder="Ciudad"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estado">Estado</Label>
            <Input
              id="estado"
              {...register('estado')}
              className="h-11"
              placeholder="Estado"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pais">País</Label>
            <Input
              id="pais"
              {...register('pais')}
              className="h-11"
              placeholder="País"
            />
            <div className="flex flex-wrap gap-1">
              {COUNTRY_PRESETS.map((p) => (
                <ChoicePill
                  key={p}
                  active={pais === p}
                  onClick={() => setValue('pais', p)}
                >
                  {p}
                </ChoicePill>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Clasificación */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={Tag} title="Clasificación" />
        <div className="grid gap-5">
          <div className="space-y-2">
            <Label className="cap-eyebrow">Tipo de paciente</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PATIENT_TYPE_LABELS).map(([v, l]) => (
                <TypePill
                  key={v}
                  active={tipoPaciente === v}
                  tone={PATIENT_TYPE_TONES[v]}
                  onClick={() => setValue('tipoPaciente', v)}
                >
                  {l}
                </TypePill>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="cap-eyebrow">Canal de origen</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ORIGIN_LABELS).map(([v, l]) => (
                <ChoicePill
                  key={v}
                  active={origenCanal === v}
                  onClick={() =>
                    setValue('origenCanal', origenCanal === v ? '' : v)
                  }
                >
                  {l}
                </ChoicePill>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 max-w-md">
            <Label htmlFor="referidoPor">Referido por</Label>
            <Input
              id="referidoPor"
              {...register('referidoPor')}
              className="h-11"
              placeholder="Nombre de quien refiere"
            />
          </div>
        </div>
      </section>

      {/* Consentimientos y notas */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={FileCheck} title="Consentimientos y notas" />
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ConsentCard
              icon={FileCheck}
              title="Procesamiento de datos"
              description="Necesario para procesar historia clínica y expediente"
              active={consentData}
              onClick={() =>
                setValue('consentDataProcessing', !consentData)
              }
            />
            <ConsentCard
              icon={Megaphone}
              title="Comunicación comercial"
              description="Campañas, promociones y recordatorios comerciales"
              active={consentMkt}
              onClick={() => setValue('consentMarketing', !consentMkt)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notasInternas">Notas internas</Label>
            <Textarea
              id="notasInternas"
              {...register('notasInternas')}
              placeholder="Notas internas sobre el paciente..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className="h-11 px-8 font-medium"
          disabled={isLoading}
        >
          {isLoading ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
