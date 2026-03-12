'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Consulta - {format(new Date(consultation.consultationDate), 'dd MMM yyyy', { locale: es })}
          </CardTitle>
          {consultation.doctor && (
            <Badge variant="outline">
              Dr. {consultation.doctor.nombre} {consultation.doctor.apellido}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {consultation.grosor && <div><span className="text-muted-foreground">Grosor:</span> {GROSOR_LABELS[consultation.grosor] || consultation.grosor}</div>}
          {consultation.color && <div><span className="text-muted-foreground">Color:</span> {COLOR_LABELS[consultation.color] || consultation.color}</div>}
          {consultation.textura && <div><span className="text-muted-foreground">Textura:</span> {TEXTURA_LABELS[consultation.textura] || consultation.textura}</div>}
          {consultation.valoracionZonaDonante && <div><span className="text-muted-foreground">Zona donante:</span> {VALORACION_LABELS[consultation.valoracionZonaDonante] || consultation.valoracionZonaDonante}</div>}
          {consultation.caspa != null && <div><span className="text-muted-foreground">Caspa:</span> {consultation.caspa ? 'Sí' : 'No'}</div>}
          {consultation.grasa != null && <div><span className="text-muted-foreground">Grasa:</span> {consultation.grasa ? 'Sí' : 'No'}</div>}
        </div>

        {consultation.donorZones && consultation.donorZones.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Zonas donantes: </span>
            {consultation.donorZones.map((dz) => dz.donorZone.name).join(', ')}
          </div>
        )}

        {consultation.variants && consultation.variants.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Variantes: </span>
            {consultation.variants.map((v) => v.variant.name).join(', ')}
          </div>
        )}

        {consultation.diagnostico && (
          <div><p className="text-sm font-medium">Diagnóstico</p><p className="text-sm whitespace-pre-wrap">{consultation.diagnostico}</p></div>
        )}
        {consultation.estrategiaQuirurgica && (
          <div><p className="text-sm font-medium">Estrategia Quirúrgica</p><p className="text-sm whitespace-pre-wrap">{consultation.estrategiaQuirurgica}</p></div>
        )}
        {consultation.fechaSugeridaTransplante && (
          <div className="text-sm"><span className="text-muted-foreground">Fecha sugerida de trasplante:</span> {format(new Date(consultation.fechaSugeridaTransplante), 'dd MMM yyyy', { locale: es })}</div>
        )}
        {consultation.comentarios && (
          <div><p className="text-sm font-medium">Comentarios</p><p className="text-sm whitespace-pre-wrap">{consultation.comentarios}</p></div>
        )}
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

    await createMutation.mutateAsync(payload);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Datos de la Consulta</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Doctor *</Label>
            <Select value={form.doctorId} onValueChange={(v) => set('doctorId', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar doctor..." /></SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>Dr. {d.nombre} {d.apellido}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fecha de Consulta *</Label>
            <Input type="date" value={form.consultationDate} onChange={(e) => set('consultationDate', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Evaluación Capilar</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Grosor</Label>
            <Select value={form.grosor} onValueChange={(v) => set('grosor', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(GROSOR_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <Select value={form.color} onValueChange={(v) => set('color', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(COLOR_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Textura</Label>
            <Select value={form.textura} onValueChange={(v) => set('textura', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(TEXTURA_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valoración Zona Donante</Label>
            <Select value={form.valoracionZonaDonante} onValueChange={(v) => set('valoracionZonaDonante', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(VALORACION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm self-end">
            <input type="checkbox" checked={form.caspa} onChange={(e) => set('caspa', e.target.checked)} className="rounded border-input" />
            Caspa
          </label>
          <label className="flex items-center gap-2 text-sm self-end">
            <input type="checkbox" checked={form.grasa} onChange={(e) => set('grasa', e.target.checked)} className="rounded border-input" />
            Grasa
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Zonas Donantes</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {donorZones.map((dz) => (
              <button
                key={dz.id}
                type="button"
                onClick={() => toggleArray('donorZoneIds', dz.id)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
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

      <Card>
        <CardHeader><CardTitle>Variantes (Norwood)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => toggleArray('variantIds', v.id)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
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

      <Card>
        <CardHeader><CardTitle>Diagnóstico y Estrategia</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Diagnóstico</Label>
            <Textarea value={form.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} rows={3} placeholder="Diagnóstico del paciente..." />
          </div>
          <div className="space-y-2">
            <Label>Estrategia Quirúrgica</Label>
            <Textarea value={form.estrategiaQuirurgica} onChange={(e) => set('estrategiaQuirurgica', e.target.value)} rows={3} placeholder="Plan quirúrgico propuesto..." />
          </div>
          <div className="space-y-2">
            <Label>Fecha Sugerida de Trasplante</Label>
            <Input type="date" value={form.fechaSugeridaTransplante} onChange={(e) => set('fechaSugeridaTransplante', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Comentarios</Label>
            <Textarea value={form.comentarios} onChange={(e) => set('comentarios', e.target.value)} rows={2} placeholder="Comentarios adicionales..." />
          </div>
        </CardContent>
      </Card>

      {createMutation.isError && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear consulta'}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending || !form.doctorId}>
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/patients/${params.id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Consultas Médicas</h2>
            <p className="text-muted-foreground">
              {consultations ? `${consultations.length} consulta(s) registrada(s)` : 'Cargando...'}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Nueva Consulta
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      ) : showForm ? (
        <ConsultationForm patientId={params.id} onSuccess={() => setShowForm(false)} />
      ) : consultations && consultations.length > 0 ? (
        <div className="space-y-4">
          {consultations.map((c) => <ConsultationCard key={c.id} consultation={c} />)}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Stethoscope className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay consultas registradas</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />Crear Consulta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
