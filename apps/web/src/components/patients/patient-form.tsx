'use client';

import { useForm } from 'react-hook-form';
import {
  User,
  MapPin,
  Tag,
  FileCheck,
  Megaphone,
  StickyNote,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PatientType,
  Gender,
  MaritalStatus,
  Occupation,
  OriginChannel,
} from '@capillaris/shared';
import { patientFormOptions, type PatientFormValues } from './patient-form-config';

export type { PatientFormValues } from './patient-form-config';

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

// ── Patient form primitives ────────────────────────────────

function FormSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-[calc(var(--cap-header-height,72px)+1rem)] rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 id={`${id}-title`} className="text-base font-semibold leading-6">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-text-secondary">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FormField({
  id,
  label,
  required,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: (props: {
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
    'aria-required': boolean | undefined;
  }) => React.ReactNode;
}) {
  const describedBy = [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="block text-sm leading-5">
        {label}{required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
      </Label>
      {children({
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })}
      {help && <p id={`${id}-help`} className="text-sm leading-5 text-text-secondary">{help}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-sm leading-5 text-destructive">{error}</p>}
    </div>
  );
}

function ChoiceGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium leading-5">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function ChoicePill({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: { color: string; bg: string; border: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait',
        active
          ? 'border-brand bg-brand-soft text-brand-dark'
          : 'border-border-strong bg-surface text-foreground hover:bg-surface-2',
      )}
      style={active && tone ? { color: tone.color, background: tone.bg, borderColor: tone.border } : undefined}
    >
      {children}
    </button>
  );
}

function ConsentCard({
  id,
  icon: Icon,
  title,
  description,
  active,
  onClick,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={active}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-help`}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait',
        active ? 'border-brand bg-brand-softer' : 'border-border-strong bg-surface hover:bg-surface-2',
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-dark" />
      <span className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block text-sm font-medium leading-5">{title}</span>
        <span id={`${id}-help`} className="mt-1 block text-sm leading-5 text-text-secondary">{description}</span>
      </span>
      <span aria-hidden="true" className="flex shrink-0 flex-col items-center gap-1">
        <span className={cn('relative h-6 w-11 rounded-full transition-colors', active ? 'bg-brand' : 'bg-surface-3')}>
          <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', active && 'translate-x-5')} />
        </span>
        <span className="text-sm text-text-secondary">{active ? 'Sí' : 'No'}</span>
      </span>
    </button>
  );
}

const FORM_SECTIONS = [
  ['patient-identidad', 'Identidad y contacto'],
  ['patient-direccion', 'Dirección'],
  ['patient-clasificacion', 'Clasificación'],
  ['patient-documentos', 'Documentos'],
  ['patient-notas', 'Notas'],
] as const;

// ── Form ───────────────────────────────────────────────────

interface PatientFormProps {
  defaultValues?: Partial<PatientFormValues>;
  onSubmit: (data: PatientFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  submitError?: string;
}

export function PatientForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = 'Guardar',
  submitError,
}: PatientFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PatientFormValues>(patientFormOptions(defaultValues));

  const tipoPaciente = watch('tipoPaciente') || '';
  const genero = watch('genero') || '';
  const estadoCivil = watch('estadoCivil') || '';
  const ocupacion = watch('ocupacion') || '';
  const origenCanal = watch('origenCanal') || '';
  const fechaNacimiento = watch('fechaNacimiento') || '';
  const pais = watch('pais') || '';
  const consentData = watch('consentDataProcessing') || false;
  const consentMkt = watch('consentMarketing') || false;
  const saving = !!isLoading || isSubmitting;
  const status = saving
    ? 'Guardando paciente…'
    : submitError
      ? 'Error al guardar. Tus cambios siguen en el formulario.'
      : isDirty
        ? 'Cambios sin guardar'
        : defaultValues ? 'Sin cambios pendientes' : 'Completa los datos y guarda al terminar.';

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-busy={saving}
      className="flex min-w-0 flex-col gap-5 [&_input]:text-base [&_textarea]:text-base sm:[&_input]:text-sm sm:[&_textarea]:text-sm"
    >
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">Nombre y apellido son obligatorios. Los demás campos son opcionales.</p>
        <nav aria-label="Secciones del formulario de paciente" className="flex flex-wrap gap-2">
          {FORM_SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm text-text-secondary transition-colors hover:border-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {label}
            </a>
          ))}
        </nav>
      </div>

      {Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Revisa los campos marcados antes de guardar.
        </p>
      )}

      {/* Keep fields focusable while the resolver reports validation errors. */}
      <fieldset disabled={!!isLoading} className="min-w-0 space-y-5">
        <legend className="sr-only">Datos del paciente</legend>
        <FormSection id="patient-identidad" icon={User} title="Identidad y contacto" description="Datos personales y medios de contacto del paciente.">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField id="nombre" label="Nombre" required error={errors.nombre?.message}>
              {props => <Input id="nombre" {...register('nombre')} {...props} className="h-11" placeholder="Nombre del paciente" autoComplete="given-name" />}
            </FormField>
            <FormField id="apellido" label="Apellido" required error={errors.apellido?.message}>
              {props => <Input id="apellido" {...register('apellido')} {...props} className="h-11" placeholder="Apellido del paciente" autoComplete="family-name" />}
            </FormField>
            <FormField id="email" label="Email" error={errors.email?.message}>
              {props => <Input id="email" type="email" {...register('email')} {...props} className="h-11" placeholder="correo@ejemplo.com" autoComplete="email" />}
            </FormField>
            <FormField id="celular" label="Celular" error={errors.celular?.message}>
              {props => <Input id="celular" {...register('celular')} {...props} className="h-11" placeholder="+52 55 1234 5678" type="tel" autoComplete="tel" />}
            </FormField>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fechaNacimiento" className="block text-sm leading-5">Fecha de nacimiento</Label>
              <DatePicker id="fechaNacimiento" value={fechaNacimiento} onChange={v => setValue('fechaNacimiento', v, { shouldDirty: true })} className="sm:max-w-sm" toDate={new Date()} />
              <label htmlFor="edadApproximada" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm leading-5">
                <input id="edadApproximada" type="checkbox" {...register('edadApproximada')} aria-describedby="edadApproximada-help" className="h-4 w-4 shrink-0 accent-brand" />
                Fecha aproximada, pendiente de confirmar
              </label>
              <p id="edadApproximada-help" className="text-sm leading-5 text-text-secondary">Desmarca únicamente cuando la fecha esté confirmada con el paciente. Las estimaciones históricas se conservan.</p>
            </div>
            <ChoiceGroup label="Género">
              {Object.entries(GENDER_LABELS).map(([v, l]) => <ChoicePill key={v} active={genero === v} onClick={() => setValue('genero', genero === v ? '' : v, { shouldDirty: true })}>{l}</ChoicePill>)}
            </ChoiceGroup>
            <ChoiceGroup label="Estado civil">
              {Object.entries(MARITAL_STATUS_LABELS).map(([v, l]) => <ChoicePill key={v} active={estadoCivil === v} onClick={() => setValue('estadoCivil', estadoCivil === v ? '' : v, { shouldDirty: true })}>{l}</ChoicePill>)}
            </ChoiceGroup>
            <div className="sm:col-span-2">
              <ChoiceGroup label="Ocupación">
                {Object.entries(OCCUPATION_LABELS).map(([v, l]) => <ChoicePill key={v} active={ocupacion === v} onClick={() => setValue('ocupacion', ocupacion === v ? '' : v, { shouldDirty: true })}>{l}</ChoicePill>)}
              </ChoiceGroup>
            </div>
          </div>
        </FormSection>

        <FormSection id="patient-direccion" icon={MapPin} title="Dirección" description="Ubicación y dirección de contacto.">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField id="direccion" label="Dirección" error={errors.direccion?.message}>
                {props => <Input id="direccion" {...register('direccion')} {...props} className="h-11" placeholder="Calle, número, colonia..." autoComplete="street-address" />}
              </FormField>
            </div>
            <FormField id="ciudad" label="Ciudad" error={errors.ciudad?.message}>
              {props => <Input id="ciudad" {...register('ciudad')} {...props} className="h-11" placeholder="Ciudad" autoComplete="address-level2" />}
            </FormField>
            <FormField id="estado" label="Estado" error={errors.estado?.message}>
              {props => <Input id="estado" {...register('estado')} {...props} className="h-11" placeholder="Estado" autoComplete="address-level1" />}
            </FormField>
            <div className="space-y-2 sm:col-span-2">
              <FormField id="pais" label="País" error={errors.pais?.message}>
                {props => <Input id="pais" {...register('pais')} {...props} className="h-11 sm:max-w-sm" placeholder="País" autoComplete="country-name" />}
              </FormField>
              <div role="group" aria-label="Países frecuentes" className="flex flex-wrap gap-2">
                {COUNTRY_PRESETS.map(p => <ChoicePill key={p} active={pais === p} onClick={() => setValue('pais', p, { shouldDirty: true })}>{p}</ChoicePill>)}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection id="patient-clasificacion" icon={Tag} title="Clasificación, origen y referencia" description="Estado del paciente y cómo llegó a la clínica.">
          <div className="space-y-5">
            <ChoiceGroup label="Tipo de paciente">
              {Object.entries(PATIENT_TYPE_LABELS).map(([v, l]) => <ChoicePill key={v} active={tipoPaciente === v} tone={PATIENT_TYPE_TONES[v]} onClick={() => setValue('tipoPaciente', v, { shouldDirty: true })}>{l}</ChoicePill>)}
            </ChoiceGroup>
            <ChoiceGroup label="Canal de origen">
              {Object.entries(ORIGIN_LABELS).map(([v, l]) => <ChoicePill key={v} active={origenCanal === v} onClick={() => setValue('origenCanal', origenCanal === v ? '' : v, { shouldDirty: true })}>{l}</ChoicePill>)}
            </ChoiceGroup>
            <div className="sm:max-w-md">
              <FormField id="referidoPor" label="Referido por" error={errors.referidoPor?.message}>
                {props => <Input id="referidoPor" {...register('referidoPor')} {...props} className="h-11" placeholder="Nombre de quien refiere" />}
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection id="patient-documentos" icon={FileCheck} title="Documentos y consentimientos" description="Carpeta de fotos del paciente y autorizaciones otorgadas.">
          <div className="space-y-6">
            <FormField id="driveFolderUrl" label="Enlace a la carpeta existente de Google Drive" error={errors.driveFolderUrl?.message} help="Se abre con la cuenta de Google del usuario y conserva los permisos de la carpeta.">
              {props => <Input id="driveFolderUrl" {...register('driveFolderUrl')} {...props} className="h-11" placeholder="https://drive.google.com/drive/folders/…" />}
            </FormField>
            <div className="space-y-3">
              <p className="text-sm leading-5 text-text-secondary">Activa cada opción únicamente si el paciente otorgó ese consentimiento. Guarda para registrar el cambio.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ConsentCard id="consentDataProcessing" icon={FileCheck} title="Procesamiento de datos" description="Necesario para procesar historia clínica y expediente" active={consentData} onClick={() => setValue('consentDataProcessing', !consentData, { shouldDirty: true })} />
                <ConsentCard id="consentMarketing" icon={Megaphone} title="Comunicación comercial" description="Campañas, promociones y recordatorios comerciales" active={consentMkt} onClick={() => setValue('consentMarketing', !consentMkt, { shouldDirty: true })} />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection id="patient-notas" icon={StickyNote} title="Notas internas" description="Información adicional para el equipo de la clínica. Opcional.">
          <FormField id="notasInternas" label="Notas internas" error={errors.notasInternas?.message}>
            {props => <Textarea id="notasInternas" {...register('notasInternas')} {...props} placeholder="Notas internas sobre el paciente..." rows={4} className="resize-y" />}
          </FormField>
        </FormSection>

        {submitError && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm leading-5 text-destructive">
            <p className="font-medium">{submitError}</p>
            <p className="mt-1">Los datos siguen en el formulario. Revisa el error e intenta guardar de nuevo.</p>
          </div>
        )}

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p role="status" aria-live="polite" className="text-sm leading-5 text-text-secondary">{status}</p>
          <div className="flex shrink-0 gap-3">
            {onCancel && <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={onCancel} disabled={saving}>Cancelar</Button>}
            <Button type="submit" className="h-11 flex-1 px-6 font-medium sm:flex-none" disabled={saving}>
              {saving && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Guardando…' : submitLabel}
            </Button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
