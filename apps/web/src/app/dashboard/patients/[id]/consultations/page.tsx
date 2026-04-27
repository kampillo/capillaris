'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Plus,
  Stethoscope,
  Eye,
  Scissors,
  MessageSquare,
  Calendar,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScalpZonePicker } from '@/components/clinic/scalp-zone-picker';
import { ScalpMap } from '@/components/clinic/scalp-map';
import { variantsToSeverity } from '@/components/clinic/scalp-zones';
import {
  useConsultationsByPatient,
  useCreateConsultation,
  useDonorZones,
  useVariants,
  useDoctors,
} from '@/hooks/use-clinical';
import type { MedicalConsultation } from '@/hooks/use-clinical';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  HairThickness,
  HairColor,
  HairTexture,
  DonorZoneAssessment,
} from '@capillaris/shared';

const GROSOR_LABELS: Record<string, string> = {
  [HairThickness.FRAGIL]: 'Frágil',
  [HairThickness.MEDIANO]: 'Mediano',
  [HairThickness.GRUESO]: 'Grueso',
};
const COLOR_LABELS: Record<string, string> = {
  [HairColor.NEGRO]: 'Negro',
  [HairColor.CASTANO]: 'Castaño',
  [HairColor.RUBIO]: 'Rubio',
  [HairColor.BLANCO]: 'Blanco',
  [HairColor.OTRO]: 'Otro',
};
const TEXTURA_LABELS: Record<string, string> = {
  [HairTexture.RIZADO]: 'Rizado',
  [HairTexture.LISO]: 'Liso',
  [HairTexture.ONDULADO]: 'Ondulado',
};
const VALORACION_LABELS: Record<string, string> = {
  [DonorZoneAssessment.ESCASA]: 'Escasa',
  [DonorZoneAssessment.MEDIA]: 'Media',
  [DonorZoneAssessment.SUFICIENTE]: 'Suficiente',
  [DonorZoneAssessment.AMPLIA]: 'Amplia',
};

const DIAGNOSTICO_TEMPLATES = [
  'Alopecia androgénica grado II',
  'Alopecia androgénica grado III',
  'Alopecia androgénica grado IV',
  'Alopecia areata',
  'Alopecia difusa',
  'Efluvio telógeno',
  'Sin alopecia aparente',
];

const ESTRATEGIA_TEMPLATES = [
  'Se sugiere FUE con 2000–2500 folículos',
  'Se sugiere FUE con 2500–3000 folículos',
  'Se sugiere FUE con 3000–3500 folículos',
  'Requiere segunda sesión para densidad',
  'Candidato a PRP + medicación',
  'No candidato quirúrgico',
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
  tone = 'brand',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'brand' | 'lilac' | 'amber';
}) {
  const activeClasses =
    tone === 'lilac'
      ? 'border-lilac bg-lilac-soft text-lilac'
      : tone === 'amber'
        ? 'border-amber bg-amber-soft text-amber'
        : 'border-brand bg-brand-soft text-brand-dark';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? activeClasses
          : 'border-border-strong bg-surface text-foreground hover:bg-surface-2',
      )}
    >
      {children}
    </button>
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
      className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function appendTemplate(current: string, template: string) {
  if (!current.trim()) return template;
  return current + '\n' + template;
}

// ── Consultation card (read-only) ──────────────────────────

function ConsultationCard({
  consultation,
}: {
  consultation: MedicalConsultation;
}) {
  const stats = [
    consultation.grosor && {
      k: 'Grosor',
      v: GROSOR_LABELS[consultation.grosor] || consultation.grosor,
    },
    consultation.color && {
      k: 'Color',
      v: COLOR_LABELS[consultation.color] || consultation.color,
    },
    consultation.textura && {
      k: 'Textura',
      v: TEXTURA_LABELS[consultation.textura] || consultation.textura,
    },
    consultation.valoracionZonaDonante && {
      k: 'Valoración donante',
      v:
        VALORACION_LABELS[consultation.valoracionZonaDonante] ||
        consultation.valoracionZonaDonante,
    },
    consultation.caspa != null && {
      k: 'Caspa',
      v: consultation.caspa ? 'Sí' : 'No',
    },
    consultation.grasa != null && {
      k: 'Grasa',
      v: consultation.grasa ? 'Sí' : 'No',
    },
  ].filter(Boolean) as Array<{ k: string; v: string }>;

  const donorZoneNames =
    consultation.donorZones?.map((dz) => dz.donorZone.name) ?? [];
  const variantNames =
    consultation.variants?.map((v) => v.variant.name) ?? [];
  const severity = variantsToSeverity(variantNames);
  const hasMapData = donorZoneNames.length > 0 || severity > 0;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="text-[15px] font-semibold">
            {format(new Date(consultation.consultationDate), "dd 'de' MMMM yyyy", {
              locale: es,
            })}
          </div>
          {consultation.doctor && (
            <div className="text-xs text-text-tertiary">
              Dr. {consultation.doctor.nombre} {consultation.doctor.apellido}
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5" /> PDF
        </Button>
      </div>

      <div className="flex flex-col gap-5 p-6">
        {/* Visual summary: mini scalp map + stats */}
        <div className="grid gap-5 md:grid-cols-[140px_1fr]">
          {hasMapData ? (
            <div className="flex justify-center md:justify-start">
              <ScalpMap
                severity={severity}
                highlightedZoneNames={donorZoneNames}
                className="max-w-[140px]"
              />
            </div>
          ) : (
            <div />
          )}
          <div className="flex flex-col gap-3">
            {stats.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-border bg-surface-2 p-4 md:grid-cols-3">
                {stats.map((s, i) => (
                  <div key={i}>
                    <div className="cap-eyebrow mb-1">{s.k}</div>
                    <div className="text-sm font-medium">{s.v}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {donorZoneNames.length > 0 && (
                <div>
                  <div className="cap-eyebrow mb-1.5">Zonas donantes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {donorZoneNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-dark"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {variantNames.length > 0 && (
                <div>
                  <div className="cap-eyebrow mb-1.5">Variantes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {variantNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center rounded-full border border-lilac/25 bg-lilac-soft px-2 py-0.5 text-[11px] font-medium text-lilac"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {consultation.diagnostico && (
          <div className="border-t border-border pt-4">
            <div className="cap-eyebrow mb-1.5">Diagnóstico</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {consultation.diagnostico}
            </p>
          </div>
        )}
        {consultation.estrategiaQuirurgica && (
          <div>
            <div className="cap-eyebrow mb-1.5">Estrategia quirúrgica</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {consultation.estrategiaQuirurgica}
            </p>
          </div>
        )}
        {consultation.fechaSugeridaTransplante && (
          <div className="inline-flex items-center gap-2 rounded-md bg-brand-softer px-3 py-2 text-xs text-brand-darker">
            <Calendar className="h-3.5 w-3.5" />
            Fecha sugerida de trasplante:{' '}
            <span className="cap-mono font-medium">
              {format(
                new Date(consultation.fechaSugeridaTransplante),
                "dd 'de' MMM yyyy",
                { locale: es },
              )}
            </span>
          </div>
        )}
        {consultation.comentarios && (
          <div>
            <div className="cap-eyebrow mb-1.5">Comentarios</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
              {consultation.comentarios}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Form ───────────────────────────────────────────────────

function ConsultationForm({
  patientId,
  onSuccess,
  onCancel,
}: {
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreateConsultation();
  const { data: donorZones = [] } = useDonorZones();
  const { data: variants = [] } = useVariants();
  const { data: doctors = [] } = useDoctors();

  const [form, setForm] = useState({
    doctorId: '',
    consultationDate: new Date().toISOString().split('T')[0],
    grosor: '',
    color: '',
    textura: '',
    caspa: undefined as boolean | undefined,
    grasa: undefined as boolean | undefined,
    valoracionZonaDonante: '',
    diagnostico: '',
    estrategiaQuirurgica: '',
    fechaSugeridaTransplante: '',
    comentarios: '',
    donorZoneIds: [] as string[],
    variantIds: [] as string[],
  });

  const set = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleArray = (key: 'donorZoneIds' | 'variantIds', id: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((v) => v !== id)
        : [...prev[key], id],
    }));
  };

  const toggleBool = (key: 'caspa' | 'grasa', value: boolean) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      patientId,
      doctorId: form.doctorId,
      consultationDate: form.consultationDate,
      grosor: form.grosor || undefined,
      color: form.color || undefined,
      textura: form.textura || undefined,
      caspa: form.caspa,
      grasa: form.grasa,
      valoracionZonaDonante: form.valoracionZonaDonante || undefined,
      diagnostico: form.diagnostico || undefined,
      estrategiaQuirurgica: form.estrategiaQuirurgica || undefined,
      fechaSugeridaTransplante: form.fechaSugeridaTransplante || undefined,
      comentarios: form.comentarios || undefined,
      donorZoneIds:
        form.donorZoneIds.length > 0 ? form.donorZoneIds : undefined,
      variantIds: form.variantIds.length > 0 ? form.variantIds : undefined,
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
      {/* Compact header strip: doctor + fecha */}
      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-surface px-5 py-4 shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
          <Stethoscope className="h-4 w-4" />
        </div>
        <div className="min-w-[180px] flex-1 space-y-1">
          <Label className="text-[11px] text-text-secondary">
            Doctor <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.doctorId}
            onValueChange={(v) => set('doctorId', v)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Seleccionar doctor..." />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  Dr. {d.nombre} {d.apellido}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px] space-y-1">
          <Label className="text-[11px] text-text-secondary">
            Fecha <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            value={form.consultationDate}
            onChange={(v) => set('consultationDate', v)}
            className="h-10"
            toDate={new Date()}
          />
        </div>
      </section>

      {/* Evaluación capilar */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={Eye} title="Evaluación capilar" />
        <div className="grid gap-4">
          <div>
            <Label className="cap-eyebrow mb-2 block">Grosor</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(GROSOR_LABELS).map(([v, l]) => (
                <ChoicePill
                  key={v}
                  active={form.grosor === v}
                  onClick={() => set('grosor', form.grosor === v ? '' : v)}
                >
                  {l}
                </ChoicePill>
              ))}
            </div>
          </div>
          <div>
            <Label className="cap-eyebrow mb-2 block">Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(COLOR_LABELS).map(([v, l]) => (
                <ChoicePill
                  key={v}
                  active={form.color === v}
                  onClick={() => set('color', form.color === v ? '' : v)}
                >
                  {l}
                </ChoicePill>
              ))}
            </div>
          </div>
          <div>
            <Label className="cap-eyebrow mb-2 block">Textura</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TEXTURA_LABELS).map(([v, l]) => (
                <ChoicePill
                  key={v}
                  active={form.textura === v}
                  onClick={() => set('textura', form.textura === v ? '' : v)}
                >
                  {l}
                </ChoicePill>
              ))}
            </div>
          </div>

          {/* Condiciones: caspa + grasa as Sí/No */}
          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <Label className="cap-eyebrow mb-2 block">Caspa</Label>
              <div className="flex gap-1.5">
                <ChoicePill
                  active={form.caspa === true}
                  onClick={() => toggleBool('caspa', true)}
                >
                  Sí
                </ChoicePill>
                <ChoicePill
                  active={form.caspa === false}
                  onClick={() => toggleBool('caspa', false)}
                >
                  No
                </ChoicePill>
              </div>
            </div>
            <div>
              <Label className="cap-eyebrow mb-2 block">Grasa</Label>
              <div className="flex gap-1.5">
                <ChoicePill
                  active={form.grasa === true}
                  onClick={() => toggleBool('grasa', true)}
                >
                  Sí
                </ChoicePill>
                <ChoicePill
                  active={form.grasa === false}
                  onClick={() => toggleBool('grasa', false)}
                >
                  No
                </ChoicePill>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Zonas donantes (+ valoración integrada) */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={Scissors} title="Zonas donantes" />
        <p className="-mt-2 mb-4 text-xs text-text-tertiary">
          Haz clic en el mapa para marcar las zonas del cuero cabelludo con
          disponibilidad de folículos para extracción.
        </p>
        <ScalpZonePicker
          zones={donorZones}
          value={form.donorZoneIds}
          onChange={(ids) => set('donorZoneIds', ids)}
        />
        <div className="mt-5 border-t border-border pt-4">
          <Label className="cap-eyebrow mb-2 block">
            Valoración de la zona donante
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(VALORACION_LABELS).map(([v, l]) => (
              <ChoicePill
                key={v}
                active={form.valoracionZonaDonante === v}
                onClick={() =>
                  set(
                    'valoracionZonaDonante',
                    form.valoracionZonaDonante === v ? '' : v,
                  )
                }
              >
                {l}
              </ChoicePill>
            ))}
          </div>
        </div>
      </section>

      {/* Diagnóstico y estrategia (incluye variantes) */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <SectionHeader icon={MessageSquare} title="Diagnóstico y estrategia" />
        <div className="grid gap-5">
          <div>
            <Label className="cap-eyebrow mb-2 block">
              Variantes (Norwood / Ludwig)
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {variants.map((v) => {
                const active = form.variantIds.includes(v.id);
                return (
                  <ChoicePill
                    key={v.id}
                    tone="lilac"
                    active={active}
                    onClick={() => toggleArray('variantIds', v.id)}
                  >
                    {v.name}
                  </ChoicePill>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Diagnóstico</Label>
            <Textarea
              value={form.diagnostico}
              onChange={(e) => set('diagnostico', e.target.value)}
              rows={3}
              placeholder="Diagnóstico del paciente..."
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

          <div className="space-y-2">
            <Label>Estrategia quirúrgica</Label>
            <Textarea
              value={form.estrategiaQuirurgica}
              onChange={(e) => set('estrategiaQuirurgica', e.target.value)}
              rows={3}
              placeholder="Plan quirúrgico propuesto..."
              className="resize-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {ESTRATEGIA_TEMPLATES.map((t) => (
                <TemplateChip
                  key={t}
                  onClick={() =>
                    set(
                      'estrategiaQuirurgica',
                      appendTemplate(form.estrategiaQuirurgica, t),
                    )
                  }
                >
                  {t}
                </TemplateChip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fecha sugerida de trasplante</Label>
              <DatePicker
                value={form.fechaSugeridaTransplante}
                onChange={(v) => set('fechaSugeridaTransplante', v)}
                fromDate={new Date()}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Comentarios</Label>
            <Textarea
              value={form.comentarios}
              onChange={(e) => set('comentarios', e.target.value)}
              rows={2}
              placeholder="Comentarios adicionales..."
              className="resize-none"
            />
          </div>
        </div>
      </section>

      {createMutation.isError && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear consulta'}
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
          disabled={createMutation.isPending || !form.doctorId}
        >
          {createMutation.isPending ? 'Guardando...' : 'Guardar consulta'}
        </Button>
      </div>
    </form>
  );
}

export default function PatientConsultationsPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: consultations, isLoading } = useConsultationsByPatient(
    params.id,
  );
  const [showForm, setShowForm] = useState(false);

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
          <h2 className="cap-h2 mb-1">Consultas médicas</h2>
          <p className="text-[13px] text-text-secondary">
            {consultations
              ? `${consultations.length} consulta${consultations.length === 1 ? '' : 's'} registrada${consultations.length === 1 ? '' : 's'}`
              : 'Cargando...'}
          </p>
        </div>
        {!showForm && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Nueva consulta
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-surface py-16 shadow-xs">
          <p className="text-sm text-text-secondary">Cargando...</p>
        </div>
      ) : showForm ? (
        <ConsultationForm
          patientId={params.id}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      ) : consultations && consultations.length > 0 ? (
        <div className="flex flex-col gap-4">
          {consultations.map((c) => (
            <ConsultationCard key={c.id} consultation={c} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-16 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <Stethoscope className="h-6 w-6 text-text-tertiary" />
          </div>
          <p className="text-sm text-text-secondary">
            No hay consultas registradas
          </p>
          <Button
            size="sm"
            className="mt-2 gap-1.5"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Crear consulta
          </Button>
        </div>
      )}
    </div>
  );
}
