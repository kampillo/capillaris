'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Stethoscope, Eye, Scissors, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

function SectionHeader({ icon: Icon, title, iconBg, iconColor }: { icon: typeof Stethoscope; title: string; iconBg: string; iconColor: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{title}</h3>
    </div>
  );
}

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

function ConsultationCard({ consultation }: { consultation: MedicalConsultation }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Stethoscope className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                Consulta - {format(new Date(consultation.consultationDate), 'dd MMM yyyy', { locale: es })}
              </h3>
              {consultation.doctor && (
                <p className="text-xs text-muted-foreground">
                  Dr. {consultation.doctor.nombre} {consultation.doctor.apellido}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {consultation.grosor && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Grosor</p>
                <p className="text-sm font-semibold">{GROSOR_LABELS[consultation.grosor] || consultation.grosor}</p>
              </div>
            )}
            {consultation.color && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Color</p>
                <p className="text-sm font-semibold">{COLOR_LABELS[consultation.color] || consultation.color}</p>
              </div>
            )}
            {consultation.textura && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Textura</p>
                <p className="text-sm font-semibold">{TEXTURA_LABELS[consultation.textura] || consultation.textura}</p>
              </div>
            )}
            {consultation.valoracionZonaDonante && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Zona donante</p>
                <p className="text-sm font-semibold">{VALORACION_LABELS[consultation.valoracionZonaDonante] || consultation.valoracionZonaDonante}</p>
              </div>
            )}
            {consultation.caspa != null && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Caspa</p>
                <p className="text-sm font-semibold">{consultation.caspa ? 'Sí' : 'No'}</p>
              </div>
            )}
            {consultation.grasa != null && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Grasa</p>
                <p className="text-sm font-semibold">{consultation.grasa ? 'Sí' : 'No'}</p>
              </div>
            )}
          </div>

          {consultation.donorZones && consultation.donorZones.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Zonas donantes</p>
              <div className="flex flex-wrap gap-1.5">
                {consultation.donorZones.map((dz) => (
                  <span key={dz.donorZone.id || dz.donorZone.name} className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                    {dz.donorZone.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {consultation.variants && consultation.variants.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Variantes</p>
              <div className="flex flex-wrap gap-1.5">
                {consultation.variants.map((v) => (
                  <span key={v.variant.id || v.variant.name} className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 border-violet-200">
                    {v.variant.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {consultation.diagnostico && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Diagnóstico</p>
              <p className="text-sm whitespace-pre-wrap">{consultation.diagnostico}</p>
            </div>
          )}
          {consultation.estrategiaQuirurgica && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Estrategia Quirúrgica</p>
              <p className="text-sm whitespace-pre-wrap">{consultation.estrategiaQuirurgica}</p>
            </div>
          )}
          {consultation.fechaSugeridaTransplante && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Fecha sugerida de trasplante</p>
              <p className="text-sm">{format(new Date(consultation.fechaSugeridaTransplante), 'dd MMM yyyy', { locale: es })}</p>
            </div>
          )}
          {consultation.comentarios && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Comentarios</p>
              <p className="text-sm whitespace-pre-wrap">{consultation.comentarios}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ConsultationForm({ patientId, onSuccess }: { patientId: string; onSuccess: () => void }) {
  const createMutation = useCreateConsultation();
  const { data: donorZones = [] } = useDonorZones();
  const { data: variants = [] } = useVariants();
  const { data: doctors = [] } = useDoctors();

  const [form, setForm] = useState({
    doctorId: '',
    consultationDate: new Date().toISOString().split('T')[0],
    grosor: '', color: '', textura: '',
    caspa: false, grasa: false,
    valoracionZonaDonante: '',
    diagnostico: '', estrategiaQuirurgica: '',
    fechaSugeridaTransplante: '',
    comentarios: '',
    donorZoneIds: [] as string[],
    variantIds: [] as string[],
  });

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleArray = (key: 'donorZoneIds' | 'variantIds', id: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((v) => v !== id)
        : [...prev[key], id],
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
      donorZoneIds: form.donorZoneIds.length > 0 ? form.donorZoneIds : undefined,
      variantIds: form.variantIds.length > 0 ? form.variantIds : undefined,
    };

    try {
      await createMutation.mutateAsync(payload);
      onSuccess();
    } catch {
      // Error captured in createMutation.error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Stethoscope} title="Datos de la Consulta" iconBg="bg-blue-50" iconColor="text-blue-600" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label>Doctor <span className="text-destructive">*</span></Label>
              <Select value={form.doctorId} onValueChange={(v) => set('doctorId', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar doctor..." /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>Dr. {d.nombre} {d.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de Consulta <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.consultationDate} onChange={(e) => set('consultationDate', e.target.value)} className="h-11" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Eye} title="Evaluación Capilar" iconBg="bg-violet-50" iconColor="text-violet-600" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label>Grosor</Label>
              <Select value={form.grosor} onValueChange={(v) => set('grosor', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GROSOR_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Select value={form.color} onValueChange={(v) => set('color', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COLOR_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Textura</Label>
              <Select value={form.textura} onValueChange={(v) => set('textura', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TEXTURA_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valoración Zona Donante</Label>
              <Select value={form.valoracionZonaDonante} onValueChange={(v) => set('valoracionZonaDonante', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VALORACION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2.5 text-sm self-end cursor-pointer select-none pb-2">
              <input type="checkbox" checked={form.caspa} onChange={(e) => set('caspa', e.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
              Caspa
            </label>
            <label className="flex items-center gap-2.5 text-sm self-end cursor-pointer select-none pb-2">
              <input type="checkbox" checked={form.grasa} onChange={(e) => set('grasa', e.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
              Grasa
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Scissors} title="Zonas Donantes" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <div className="flex flex-wrap gap-2">
            {donorZones.map((dz) => (
              <button
                key={dz.id}
                type="button"
                onClick={() => toggleArray('donorZoneIds', dz.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors font-medium ${
                  form.donorZoneIds.includes(dz.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-muted'
                }`}
              >
                {dz.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Eye} title="Variantes (Norwood)" iconBg="bg-amber-50" iconColor="text-amber-600" />
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => toggleArray('variantIds', v.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors font-medium ${
                  form.variantIds.includes(v.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-muted'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={MessageSquare} title="Diagnóstico y Estrategia" iconBg="bg-blue-50" iconColor="text-blue-600" />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Diagnóstico</Label>
              <Textarea value={form.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} rows={3} placeholder="Diagnóstico del paciente..." className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label>Estrategia Quirúrgica</Label>
              <Textarea value={form.estrategiaQuirurgica} onChange={(e) => set('estrategiaQuirurgica', e.target.value)} rows={3} placeholder="Plan quirúrgico propuesto..." className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha Sugerida de Trasplante</Label>
              <Input type="date" value={form.fechaSugeridaTransplante} onChange={(e) => set('fechaSugeridaTransplante', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Comentarios</Label>
              <Textarea value={form.comentarios} onChange={(e) => set('comentarios', e.target.value)} rows={2} placeholder="Comentarios adicionales..." className="resize-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {createMutation.isError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear consulta'}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" className="h-11" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" className="h-11 px-8 font-medium" disabled={createMutation.isPending || !form.doctorId}>
          {createMutation.isPending ? 'Guardando...' : 'Guardar Consulta'}
        </Button>
      </div>
    </form>
  );
}

export default function PatientConsultationsPage({ params }: { params: { id: string } }) {
  const { data: consultations, isLoading } = useConsultationsByPatient(params.id);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
            <Link href={`/dashboard/patients/${params.id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Consultas Médicas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {consultations ? `${consultations.length} consulta(s) registrada(s)` : 'Cargando...'}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button className="h-10 font-medium shadow-sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Nueva Consulta
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      ) : showForm ? (
        <ConsultationForm patientId={params.id} onSuccess={() => setShowForm(false)} />
      ) : consultations && consultations.length > 0 ? (
        <div className="space-y-4">
          {consultations.map((c) => <ConsultationCard key={c.id} consultation={c} />)}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Stethoscope className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No hay consultas registradas</p>
            <Button className="h-10 font-medium mt-2" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />Crear Consulta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
