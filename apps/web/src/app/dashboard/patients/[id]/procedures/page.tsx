'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Scissors } from 'lucide-react';
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
  useProceduresByPatient,
  useCreateProcedure,
  useDoctors,
  useHairTypes,
} from '@/hooks/use-clinical';
import type { ProcedureReport } from '@/hooks/use-clinical';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function ProcedureCard({ procedure }: { procedure: ProcedureReport }) {
  const total = procedure.totalFoliculos ||
    ((procedure.cb1 || 0) + (procedure.cb2 || 0) * 2 + (procedure.cb3 || 0) * 3 + (procedure.cb4 || 0) * 4);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Procedimiento - {format(new Date(procedure.procedureDate), 'dd MMM yyyy', { locale: es })}
          </CardTitle>
          {total > 0 && <Badge>{total} folículos</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {procedure.doctors && procedure.doctors.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Doctores: </span>
            {procedure.doctors.map((d) => `Dr. ${d.doctor.nombre} ${d.doctor.apellido}`).join(', ')}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {procedure.punchSize && <div><span className="text-muted-foreground">Punch:</span> {procedure.punchSize} mm</div>}
          {procedure.implantador && <div><span className="text-muted-foreground">Implantador:</span> {procedure.implantador}</div>}
          {procedure.cb1 != null && <div><span className="text-muted-foreground">CB1:</span> {procedure.cb1}</div>}
          {procedure.cb2 != null && <div><span className="text-muted-foreground">CB2:</span> {procedure.cb2}</div>}
          {procedure.cb3 != null && <div><span className="text-muted-foreground">CB3:</span> {procedure.cb3}</div>}
          {procedure.cb4 != null && <div><span className="text-muted-foreground">CB4:</span> {procedure.cb4}</div>}
        </div>

        {procedure.hairTypes && procedure.hairTypes.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Tipos de cabello: </span>
            {procedure.hairTypes.map((ht) => ht.hairType.name).join(', ')}
          </div>
        )}

        {procedure.descripcion && (
          <div><p className="text-sm font-medium">Descripción</p><p className="text-sm whitespace-pre-wrap">{procedure.descripcion}</p></div>
        )}

        {/* Anesthesia summary */}
        {(procedure.anestExtLidocaina || procedure.anestImpLidocaina) && (
          <div className="border-t pt-3 mt-3">
            <p className="text-sm font-medium mb-2">Anestesia</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {procedure.anestExtLidocaina && (
                <div className="space-y-1">
                  <p className="font-medium">Extracción</p>
                  <p>Lidocaína: {procedure.anestExtLidocaina}</p>
                  {procedure.anestExtAdrenalina && <p>Adrenalina: {procedure.anestExtAdrenalina} ml</p>}
                  {procedure.anestExtBicarbonatoDeSodio && <p>Bicarbonato: {procedure.anestExtBicarbonatoDeSodio} ml</p>}
                </div>
              )}
              {procedure.anestImpLidocaina && (
                <div className="space-y-1">
                  <p className="font-medium">Implantación</p>
                  <p>Lidocaína: {procedure.anestImpLidocaina}</p>
                  {procedure.anestImpAdrenalina && <p>Adrenalina: {procedure.anestImpAdrenalina} ml</p>}
                  {procedure.anestImpBicarbonatoDeSodio && <p>Bicarbonato: {procedure.anestImpBicarbonatoDeSodio} ml</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProcedureForm({ patientId, onSuccess }: { patientId: string; onSuccess: () => void }) {
  const createMutation = useCreateProcedure();
  const { data: doctors = [] } = useDoctors();
  const { data: hairTypes = [] } = useHairTypes();

  const [form, setForm] = useState({
    procedureDate: new Date().toISOString().split('T')[0],
    descripcion: '',
    punchSize: '', implantador: '',
    cb1: '', cb2: '', cb3: '', cb4: '', totalFoliculos: '',
    doctorIds: [] as string[],
    hairTypeIds: [] as string[],
    // Anesthesia extraction
    anestExtLidocaina: '', anestExtAdrenalina: '', anestExtBicarbonatoDeSodio: '',
    anestExtSolucionFisiologica: '', anestExtAnestesiaInfiltrada: '', anestExtBetametasona: '',
    // Anesthesia implantation
    anestImpLidocaina: '', anestImpAdrenalina: '', anestImpBicarbonatoDeSodio: '',
    anestImpSolucionFisiologica: '', anestImpAnestesiaInfiltrada: '', anestImpBetametasona: '',
  });

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleArray = (key: 'doctorIds' | 'hairTypeIds', id: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((v) => v !== id)
        : [...prev[key], id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const num = (v: string) => v ? Number(v) : undefined;
    const str = (v: string) => v || undefined;

    const payload: any = {
      patientId,
      procedureDate: form.procedureDate,
      descripcion: str(form.descripcion),
      punchSize: num(form.punchSize),
      implantador: str(form.implantador),
      cb1: num(form.cb1), cb2: num(form.cb2), cb3: num(form.cb3), cb4: num(form.cb4),
      totalFoliculos: num(form.totalFoliculos),
      doctorIds: form.doctorIds.length > 0 ? form.doctorIds : undefined,
      hairTypeIds: form.hairTypeIds.length > 0 ? form.hairTypeIds : undefined,
      // Anesthesia extraction
      anestExtLidocaina: str(form.anestExtLidocaina),
      anestExtAdrenalina: num(form.anestExtAdrenalina),
      anestExtBicarbonatoDeSodio: num(form.anestExtBicarbonatoDeSodio),
      anestExtSolucionFisiologica: num(form.anestExtSolucionFisiologica),
      anestExtAnestesiaInfiltrada: str(form.anestExtAnestesiaInfiltrada),
      anestExtBetametasona: str(form.anestExtBetametasona),
      // Anesthesia implantation
      anestImpLidocaina: str(form.anestImpLidocaina),
      anestImpAdrenalina: num(form.anestImpAdrenalina),
      anestImpBicarbonatoDeSodio: num(form.anestImpBicarbonatoDeSodio),
      anestImpSolucionFisiologica: num(form.anestImpSolucionFisiologica),
      anestImpAnestesiaInfiltrada: str(form.anestImpAnestesiaInfiltrada),
      anestImpBetametasona: str(form.anestImpBetametasona),
    };

    // Clean undefined values
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    await createMutation.mutateAsync(payload);
    onSuccess();
  };

  const AnesthesiaSection = ({ prefix, title }: { prefix: 'anestExt' | 'anestImp'; title: string }) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1"><Label>Lidocaína</Label><Input value={form[`${prefix}Lidocaina` as keyof typeof form] as string} onChange={(e) => set(`${prefix}Lidocaina`, e.target.value)} placeholder="Ej: 2%" /></div>
          <div className="space-y-1"><Label>Adrenalina (ml)</Label><Input type="number" step="0.01" value={form[`${prefix}Adrenalina` as keyof typeof form] as string} onChange={(e) => set(`${prefix}Adrenalina`, e.target.value)} /></div>
          <div className="space-y-1"><Label>Bicarbonato de Sodio (ml)</Label><Input type="number" step="0.01" value={form[`${prefix}BicarbonatoDeSodio` as keyof typeof form] as string} onChange={(e) => set(`${prefix}BicarbonatoDeSodio`, e.target.value)} /></div>
          <div className="space-y-1"><Label>Sol. Fisiológica (ml)</Label><Input type="number" step="0.01" value={form[`${prefix}SolucionFisiologica` as keyof typeof form] as string} onChange={(e) => set(`${prefix}SolucionFisiologica`, e.target.value)} /></div>
          <div className="space-y-1"><Label>Anest. Infiltrada</Label><Input value={form[`${prefix}AnestesiaInfiltrada` as keyof typeof form] as string} onChange={(e) => set(`${prefix}AnestesiaInfiltrada`, e.target.value)} /></div>
          <div className="space-y-1"><Label>Betametasona</Label><Input value={form[`${prefix}Betametasona` as keyof typeof form] as string} onChange={(e) => set(`${prefix}Betametasona`, e.target.value)} /></div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Datos del Procedimiento</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Fecha *</Label>
            <Input type="date" value={form.procedureDate} onChange={(e) => set('procedureDate', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Punch (mm)</Label>
            <Input type="number" step="0.1" value={form.punchSize} onChange={(e) => set('punchSize', e.target.value)} placeholder="0.8" />
          </div>
          <div className="space-y-2">
            <Label>Implantador</Label>
            <Input value={form.implantador} onChange={(e) => set('implantador', e.target.value)} placeholder="Choi" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Doctores</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {doctors.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleArray('doctorIds', d.id)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  form.doctorIds.includes(d.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-muted'
                }`}
              >
                Dr. {d.nombre} {d.apellido}
              </button>
            ))}
            {doctors.length === 0 && <p className="text-sm text-muted-foreground">No hay doctores registrados</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conteo de Folículos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1"><Label>CB1 (x1)</Label><Input type="number" min="0" value={form.cb1} onChange={(e) => set('cb1', e.target.value)} /></div>
            <div className="space-y-1"><Label>CB2 (x2)</Label><Input type="number" min="0" value={form.cb2} onChange={(e) => set('cb2', e.target.value)} /></div>
            <div className="space-y-1"><Label>CB3 (x3)</Label><Input type="number" min="0" value={form.cb3} onChange={(e) => set('cb3', e.target.value)} /></div>
            <div className="space-y-1"><Label>CB4 (x4)</Label><Input type="number" min="0" value={form.cb4} onChange={(e) => set('cb4', e.target.value)} /></div>
            <div className="space-y-1"><Label>Total</Label><Input type="number" min="0" value={form.totalFoliculos} onChange={(e) => set('totalFoliculos', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tipos de Cabello</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {hairTypes.map((ht) => (
              <button
                key={ht.id}
                type="button"
                onClick={() => toggleArray('hairTypeIds', ht.id)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  form.hairTypeIds.includes(ht.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-muted'
                }`}
              >
                {ht.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnesthesiaSection prefix="anestExt" title="Anestesia - Extracción" />
      <AnesthesiaSection prefix="anestImp" title="Anestesia - Implantación" />

      <Card>
        <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={3} placeholder="Descripción del procedimiento..." />
        </CardContent>
      </Card>

      {createMutation.isError && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear procedimiento'}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Guardando...' : 'Guardar Procedimiento'}
        </Button>
      </div>
    </form>
  );
}

export default function PatientProceduresPage({ params }: { params: { id: string } }) {
  const { data: procedures, isLoading } = useProceduresByPatient(params.id);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/patients/${params.id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Procedimientos</h2>
            <p className="text-muted-foreground">
              {procedures ? `${procedures.length} procedimiento(s) registrado(s)` : 'Cargando...'}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Nuevo Procedimiento
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      ) : showForm ? (
        <ProcedureForm patientId={params.id} onSuccess={() => setShowForm(false)} />
      ) : procedures && procedures.length > 0 ? (
        <div className="space-y-4">
          {procedures.map((p) => <ProcedureCard key={p.id} procedure={p} />)}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Scissors className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay procedimientos registrados</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />Crear Procedimiento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
