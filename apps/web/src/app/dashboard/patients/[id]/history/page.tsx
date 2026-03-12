'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useClinicalHistoriesByPatient,
  useCreateClinicalHistory,
} from '@/hooks/use-clinical';
import type { ClinicalHistory } from '@/hooks/use-clinical';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function BoolField({ label, value }: { label: string; value?: boolean }) {
  if (!value) return null;
  return <span className="inline-block bg-muted px-2 py-0.5 rounded text-xs mr-2 mb-1">{label}</span>;
}

function HistoryView({ history }: { history: ClinicalHistory }) {
  const ir = history.inheritRelatives;
  const np = history.nonPathologicalPersonal;
  const pt = history.previousTreatment;
  const pe = history.physicalExploration;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Creada el {format(new Date(history.createdAt), 'dd MMM yyyy', { locale: es })}
      </p>

      {history.padecimientoActual && (
        <Card>
          <CardHeader><CardTitle className="text-base">Padecimiento Actual</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{history.padecimientoActual}</p></CardContent>
        </Card>
      )}

      {history.personalesPatologicos && (
        <Card>
          <CardHeader><CardTitle className="text-base">Antecedentes Personales Patológicos</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{history.personalesPatologicos}</p></CardContent>
        </Card>
      )}

      {ir && (
        <Card>
          <CardHeader><CardTitle className="text-base">Antecedentes Heredofamiliares</CardTitle></CardHeader>
          <CardContent>
            {ir.negados ? (
              <p className="text-sm text-muted-foreground">Negados</p>
            ) : (
              <div>
                <BoolField label="HTA" value={ir.hta} />
                <BoolField label="Diabetes Mellitus" value={ir.dm} />
                <BoolField label="Cáncer" value={ir.ca} />
                <BoolField label="Respiratorios" value={ir.respiratorios} />
                {ir.otros && <p className="text-sm mt-1">Otros: {ir.otros}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {np && (
        <Card>
          <CardHeader><CardTitle className="text-base">Antecedentes No Patológicos</CardTitle></CardHeader>
          <CardContent>
            <BoolField label="Tabaquismo" value={np.tabaquismo} />
            <BoolField label="Alcoholismo" value={np.alcoholismo} />
            <BoolField label="Alergias" value={np.alergias} />
            <BoolField label="Actividad Física" value={np.actFisica} />
            {np.otros && <p className="text-sm mt-1">Otros: {np.otros}</p>}
          </CardContent>
        </Card>
      )}

      {pt && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tratamientos Previos</CardTitle></CardHeader>
          <CardContent>
            {pt.negados ? (
              <p className="text-sm text-muted-foreground">Negados</p>
            ) : (
              <div>
                <BoolField label="Minoxidil" value={pt.minoxidil} />
                <BoolField label="FUE" value={pt.fue} />
                <BoolField label="Finasteride" value={pt.finasteride} />
                <BoolField label="FUSS" value={pt.fuss} />
                <BoolField label="Dutasteride" value={pt.dutasteride} />
                <BoolField label="Bicalutamida" value={pt.bicalutamida} />
                {pt.otros && <p className="text-sm mt-1">Otros: {pt.otros}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {pe && (
        <Card>
          <CardHeader><CardTitle className="text-base">Exploración Física</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {pe.fc != null && <div><span className="text-muted-foreground">FC:</span> {pe.fc} bpm</div>}
              {pe.ta && <div><span className="text-muted-foreground">TA:</span> {pe.ta} mmHg</div>}
              {pe.fr != null && <div><span className="text-muted-foreground">FR:</span> {pe.fr} rpm</div>}
              {pe.temperatura != null && <div><span className="text-muted-foreground">Temp:</span> {pe.temperatura}°C</div>}
              {pe.peso != null && <div><span className="text-muted-foreground">Peso:</span> {pe.peso} kg</div>}
              {pe.talla != null && <div><span className="text-muted-foreground">Talla:</span> {pe.talla} cm</div>}
            </div>
            {pe.description && <p className="text-sm mt-2 whitespace-pre-wrap">{pe.description}</p>}
          </CardContent>
        </Card>
      )}

      {history.tratamiento && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tratamiento</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{history.tratamiento}</p></CardContent>
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

    await createMutation.mutateAsync(payload);
    onSuccess();
  };

  const Check = ({ label, field }: { label: string; field: string }) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={form[field as keyof typeof form] as boolean} onChange={(e) => set(field, e.target.checked)} className="rounded border-input" />
      {label}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Padecimiento Actual</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.padecimientoActual} onChange={(e) => set('padecimientoActual', e.target.value)} rows={3} placeholder="Motivo de consulta y padecimiento actual..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Antecedentes Personales Patológicos</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.personalesPatologicos} onChange={(e) => set('personalesPatologicos', e.target.value)} rows={3} placeholder="Enfermedades previas, cirugías, alergias medicamentosas..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Antecedentes Heredofamiliares</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Check label="Negados" field="ir_negados" />
          {!form.ir_negados && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <Check label="HTA" field="ir_hta" />
              <Check label="Diabetes Mellitus" field="ir_dm" />
              <Check label="Cáncer" field="ir_ca" />
              <Check label="Respiratorios" field="ir_respiratorios" />
              <div className="col-span-2 md:col-span-4">
                <Input placeholder="Otros..." value={form.ir_otros} onChange={(e) => set('ir_otros', e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Antecedentes No Patológicos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Check label="Tabaquismo" field="np_tabaquismo" />
            <Check label="Alcoholismo" field="np_alcoholismo" />
            <Check label="Alergias" field="np_alergias" />
            <Check label="Actividad Física" field="np_actFisica" />
            <div className="col-span-2 md:col-span-4">
              <Input placeholder="Otros..." value={form.np_otros} onChange={(e) => set('np_otros', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tratamientos Previos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Check label="Negados" field="pt_negados" />
          {!form.pt_negados && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <Check label="Minoxidil" field="pt_minoxidil" />
              <Check label="FUE" field="pt_fue" />
              <Check label="Finasteride" field="pt_finasteride" />
              <Check label="FUSS" field="pt_fuss" />
              <Check label="Dutasteride" field="pt_dutasteride" />
              <Check label="Bicalutamida" field="pt_bicalutamida" />
              <div className="col-span-2 md:col-span-3">
                <Input placeholder="Otros..." value={form.pt_otros} onChange={(e) => set('pt_otros', e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Exploración Física</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1"><Label>FC (bpm)</Label><Input type="number" value={form.pe_fc} onChange={(e) => set('pe_fc', e.target.value)} /></div>
            <div className="space-y-1"><Label>TA (mmHg)</Label><Input placeholder="120/80" value={form.pe_ta} onChange={(e) => set('pe_ta', e.target.value)} /></div>
            <div className="space-y-1"><Label>FR (rpm)</Label><Input type="number" value={form.pe_fr} onChange={(e) => set('pe_fr', e.target.value)} /></div>
            <div className="space-y-1"><Label>Temperatura (°C)</Label><Input type="number" step="0.1" value={form.pe_temperatura} onChange={(e) => set('pe_temperatura', e.target.value)} /></div>
            <div className="space-y-1"><Label>Peso (kg)</Label><Input type="number" step="0.1" value={form.pe_peso} onChange={(e) => set('pe_peso', e.target.value)} /></div>
            <div className="space-y-1"><Label>Talla (cm)</Label><Input type="number" step="0.1" value={form.pe_talla} onChange={(e) => set('pe_talla', e.target.value)} /></div>
          </div>
          <div className="mt-4 space-y-1">
            <Label>Descripción</Label>
            <Textarea value={form.pe_description} onChange={(e) => set('pe_description', e.target.value)} rows={2} placeholder="Hallazgos relevantes..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tratamiento</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.tratamiento} onChange={(e) => set('tratamiento', e.target.value)} rows={3} placeholder="Plan de tratamiento..." />
        </CardContent>
      </Card>

      {createMutation.isError && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear historia clínica'}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending}>
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/patients/${params.id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Historia Clínica</h2>
            <p className="text-muted-foreground">
              {latestHistory ? 'Última historia registrada' : 'Sin historia clínica'}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Nueva Historia
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      ) : showForm ? (
        <HistoryForm patientId={params.id} onSuccess={() => setShowForm(false)} />
      ) : latestHistory ? (
        <HistoryView history={latestHistory} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay historia clínica registrada</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />Crear Historia Clínica
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
