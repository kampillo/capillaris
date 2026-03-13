'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, FileText, HeartPulse, Dna, Pill, Stethoscope, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  useClinicalHistoriesByPatient,
  useCreateClinicalHistory,
} from '@/hooks/use-clinical';
import type { ClinicalHistory } from '@/hooks/use-clinical';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function SectionHeader({ icon: Icon, title, iconBg, iconColor }: { icon: typeof FileText; title: string; iconBg: string; iconColor: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{title}</h3>
    </div>
  );
}

function BoolField({ label, value }: { label: string; value?: boolean }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200 mr-2 mb-1">
      {label}
    </span>
  );
}

function HistoryView({ history }: { history: ClinicalHistory }) {
  const ir = history.inheritRelatives;
  const np = history.nonPathologicalPersonal;
  const pt = history.previousTreatment;
  const pe = history.physicalExploration;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Creada el {format(new Date(history.createdAt), 'dd MMM yyyy', { locale: es })}
      </p>

      {history.padecimientoActual && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <SectionHeader icon={ClipboardList} title="Padecimiento Actual" iconBg="bg-blue-50" iconColor="text-blue-600" />
            <p className="text-sm whitespace-pre-wrap">{history.padecimientoActual}</p>
          </CardContent>
        </Card>
      )}

      {history.personalesPatologicos && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <SectionHeader icon={HeartPulse} title="Antecedentes Personales Patológicos" iconBg="bg-red-50" iconColor="text-red-600" />
            <p className="text-sm whitespace-pre-wrap">{history.personalesPatologicos}</p>
          </CardContent>
        </Card>
      )}

      {ir && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <SectionHeader icon={Dna} title="Antecedentes Heredofamiliares" iconBg="bg-violet-50" iconColor="text-violet-600" />
            {ir.negados ? (
              <p className="text-sm text-muted-foreground">Negados</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                <BoolField label="HTA" value={ir.hta} />
                <BoolField label="Diabetes Mellitus" value={ir.dm} />
                <BoolField label="Cáncer" value={ir.ca} />
                <BoolField label="Respiratorios" value={ir.respiratorios} />
                {ir.otros && <p className="text-sm mt-2 w-full">Otros: {ir.otros}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {np && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <SectionHeader icon={HeartPulse} title="Antecedentes No Patológicos" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <div className="flex flex-wrap gap-1">
              <BoolField label="Tabaquismo" value={np.tabaquismo} />
              <BoolField label="Alcoholismo" value={np.alcoholismo} />
              <BoolField label="Alergias" value={np.alergias} />
              <BoolField label="Actividad Física" value={np.actFisica} />
              {np.otros && <p className="text-sm mt-2 w-full">Otros: {np.otros}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {pt && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <SectionHeader icon={Pill} title="Tratamientos Previos" iconBg="bg-amber-50" iconColor="text-amber-600" />
            {pt.negados ? (
              <p className="text-sm text-muted-foreground">Negados</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                <BoolField label="Minoxidil" value={pt.minoxidil} />
                <BoolField label="FUE" value={pt.fue} />
                <BoolField label="Finasteride" value={pt.finasteride} />
                <BoolField label="FUSS" value={pt.fuss} />
                <BoolField label="Dutasteride" value={pt.dutasteride} />
                <BoolField label="Bicalutamida" value={pt.bicalutamida} />
                {pt.otros && <p className="text-sm mt-2 w-full">Otros: {pt.otros}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {pe && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <SectionHeader icon={Stethoscope} title="Exploración Física" iconBg="bg-cyan-50" iconColor="text-cyan-600" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {pe.fc != null && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">FC</p>
                  <p className="text-sm font-semibold">{pe.fc} bpm</p>
                </div>
              )}
              {pe.ta && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">TA</p>
                  <p className="text-sm font-semibold">{pe.ta} mmHg</p>
                </div>
              )}
              {pe.fr != null && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">FR</p>
                  <p className="text-sm font-semibold">{pe.fr} rpm</p>
                </div>
              )}
              {pe.temperatura != null && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Temperatura</p>
                  <p className="text-sm font-semibold">{pe.temperatura}°C</p>
                </div>
              )}
              {pe.peso != null && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Peso</p>
                  <p className="text-sm font-semibold">{pe.peso} kg</p>
                </div>
              )}
              {pe.talla != null && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Talla</p>
                  <p className="text-sm font-semibold">{pe.talla} cm</p>
                </div>
              )}
            </div>
            {pe.description && <p className="text-sm mt-4 whitespace-pre-wrap">{pe.description}</p>}
          </CardContent>
        </Card>
      )}

      {history.tratamiento && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <SectionHeader icon={Pill} title="Tratamiento" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <p className="text-sm whitespace-pre-wrap">{history.tratamiento}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HistoryForm({ patientId, onSuccess }: { patientId: string; onSuccess: () => void }) {
  const createMutation = useCreateClinicalHistory();
  const [form, setForm] = useState({
    padecimientoActual: '',
    personalesPatologicos: '',
    tratamiento: '',
    ir_negados: false, ir_hta: false, ir_dm: false, ir_ca: false, ir_respiratorios: false, ir_otros: '',
    np_tabaquismo: false, np_alcoholismo: false, np_alergias: false, np_actFisica: false, np_otros: '',
    pt_negados: false, pt_minoxidil: false, pt_fue: false, pt_finasteride: false,
    pt_fuss: false, pt_dutasteride: false, pt_bicalutamida: false, pt_otros: '',
    pe_fc: '', pe_ta: '', pe_fr: '', pe_temperatura: '', pe_peso: '', pe_talla: '', pe_description: '',
  });

  const set = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      patientId,
      padecimientoActual: form.padecimientoActual || undefined,
      personalesPatologicos: form.personalesPatologicos || undefined,
      tratamiento: form.tratamiento || undefined,
      inheritRelatives: {
        negados: form.ir_negados,
        hta: form.ir_hta, dm: form.ir_dm, ca: form.ir_ca,
        respiratorios: form.ir_respiratorios,
        otros: form.ir_otros || undefined,
      },
      nonPathologicalPersonal: {
        tabaquismo: form.np_tabaquismo, alcoholismo: form.np_alcoholismo,
        alergias: form.np_alergias, actFisica: form.np_actFisica,
        otros: form.np_otros || undefined,
      },
      previousTreatment: {
        negados: form.pt_negados, minoxidil: form.pt_minoxidil,
        fue: form.pt_fue, finasteride: form.pt_finasteride,
        fuss: form.pt_fuss, dutasteride: form.pt_dutasteride,
        bicalutamida: form.pt_bicalutamida,
        otros: form.pt_otros || undefined,
      },
    };

    const hasPE = form.pe_fc || form.pe_ta || form.pe_fr || form.pe_temperatura || form.pe_peso || form.pe_talla || form.pe_description;
    if (hasPE) {
      payload.physicalExploration = {
        fc: form.pe_fc ? Number(form.pe_fc) : undefined,
        ta: form.pe_ta || undefined,
        fr: form.pe_fr ? Number(form.pe_fr) : undefined,
        temperatura: form.pe_temperatura ? Number(form.pe_temperatura) : undefined,
        peso: form.pe_peso ? Number(form.pe_peso) : undefined,
        talla: form.pe_talla ? Number(form.pe_talla) : undefined,
        description: form.pe_description || undefined,
      };
    }

    try {
      await createMutation.mutateAsync(payload);
      onSuccess();
    } catch {
      // Error captured in createMutation.error
    }
  };

  const Check = ({ label, field }: { label: string; field: string }) => (
    <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={form[field as keyof typeof form] as boolean}
        onChange={(e) => set(field, e.target.checked)}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={ClipboardList} title="Padecimiento Actual" iconBg="bg-blue-50" iconColor="text-blue-600" />
          <Textarea value={form.padecimientoActual} onChange={(e) => set('padecimientoActual', e.target.value)} rows={3} placeholder="Motivo de consulta y padecimiento actual..." className="resize-none" />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={HeartPulse} title="Antecedentes Personales Patológicos" iconBg="bg-red-50" iconColor="text-red-600" />
          <Textarea value={form.personalesPatologicos} onChange={(e) => set('personalesPatologicos', e.target.value)} rows={3} placeholder="Enfermedades previas, cirugías, alergias medicamentosas..." className="resize-none" />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Dna} title="Antecedentes Heredofamiliares" iconBg="bg-violet-50" iconColor="text-violet-600" />
          <div className="space-y-4">
            <Check label="Negados" field="ir_negados" />
            {!form.ir_negados && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                <Check label="HTA" field="ir_hta" />
                <Check label="Diabetes Mellitus" field="ir_dm" />
                <Check label="Cáncer" field="ir_ca" />
                <Check label="Respiratorios" field="ir_respiratorios" />
                <div className="col-span-2 md:col-span-4 space-y-1.5">
                  <Label>Otros</Label>
                  <Input placeholder="Otros antecedentes heredofamiliares..." value={form.ir_otros} onChange={(e) => set('ir_otros', e.target.value)} className="h-11" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={HeartPulse} title="Antecedentes No Patológicos" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Check label="Tabaquismo" field="np_tabaquismo" />
              <Check label="Alcoholismo" field="np_alcoholismo" />
              <Check label="Alergias" field="np_alergias" />
              <Check label="Actividad Física" field="np_actFisica" />
            </div>
            <div className="space-y-1.5">
              <Label>Otros</Label>
              <Input placeholder="Otros antecedentes no patológicos..." value={form.np_otros} onChange={(e) => set('np_otros', e.target.value)} className="h-11" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Pill} title="Tratamientos Previos" iconBg="bg-amber-50" iconColor="text-amber-600" />
          <div className="space-y-4">
            <Check label="Negados" field="pt_negados" />
            {!form.pt_negados && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                  <Check label="Minoxidil" field="pt_minoxidil" />
                  <Check label="FUE" field="pt_fue" />
                  <Check label="Finasteride" field="pt_finasteride" />
                  <Check label="FUSS" field="pt_fuss" />
                  <Check label="Dutasteride" field="pt_dutasteride" />
                  <Check label="Bicalutamida" field="pt_bicalutamida" />
                </div>
                <div className="space-y-1.5">
                  <Label>Otros</Label>
                  <Input placeholder="Otros tratamientos previos..." value={form.pt_otros} onChange={(e) => set('pt_otros', e.target.value)} className="h-11" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Stethoscope} title="Exploración Física" iconBg="bg-cyan-50" iconColor="text-cyan-600" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1.5"><Label>FC (bpm)</Label><Input type="number" value={form.pe_fc} onChange={(e) => set('pe_fc', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>TA (mmHg)</Label><Input placeholder="120/80" value={form.pe_ta} onChange={(e) => set('pe_ta', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>FR (rpm)</Label><Input type="number" value={form.pe_fr} onChange={(e) => set('pe_fr', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Temperatura (°C)</Label><Input type="number" step="0.1" value={form.pe_temperatura} onChange={(e) => set('pe_temperatura', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Peso (kg)</Label><Input type="number" step="0.1" value={form.pe_peso} onChange={(e) => set('pe_peso', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Talla (cm)</Label><Input type="number" step="0.1" value={form.pe_talla} onChange={(e) => set('pe_talla', e.target.value)} className="h-11" /></div>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label>Descripción</Label>
            <Textarea value={form.pe_description} onChange={(e) => set('pe_description', e.target.value)} rows={2} placeholder="Hallazgos relevantes..." className="resize-none" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Pill} title="Tratamiento" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <Textarea value={form.tratamiento} onChange={(e) => set('tratamiento', e.target.value)} rows={3} placeholder="Plan de tratamiento..." className="resize-none" />
        </CardContent>
      </Card>

      {createMutation.isError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear historia clínica'}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" className="h-11" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" className="h-11 px-8 font-medium" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Guardando...' : 'Guardar Historia Clínica'}
        </Button>
      </div>
    </form>
  );
}

export default function PatientHistoryPage({ params }: { params: { id: string } }) {
  const { data: histories, isLoading } = useClinicalHistoriesByPatient(params.id);
  const [showForm, setShowForm] = useState(false);

  const latestHistory = histories?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
            <Link href={`/dashboard/patients/${params.id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Historia Clínica</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {latestHistory ? 'Última historia registrada' : 'Sin historia clínica'}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button className="h-10 font-medium shadow-sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Nueva Historia
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      ) : showForm ? (
        <HistoryForm patientId={params.id} onSuccess={() => setShowForm(false)} />
      ) : latestHistory ? (
        <HistoryView history={latestHistory} />
      ) : (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No hay historia clínica registrada</p>
            <Button className="h-10 font-medium mt-2" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />Crear Historia Clínica
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
