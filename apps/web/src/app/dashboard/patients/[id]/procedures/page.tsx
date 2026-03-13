'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Scissors, Syringe, Users, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
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

function SectionHeader({ icon: Icon, title, iconBg, iconColor }: { icon: typeof Scissors; title: string; iconBg: string; iconColor: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{title}</h3>
    </div>
  );
}

function ProcedureCard({ procedure }: { procedure: ProcedureReport }) {
  const total = procedure.totalFoliculos ||
    ((procedure.cb1 || 0) + (procedure.cb2 || 0) * 2 + (procedure.cb3 || 0) * 3 + (procedure.cb4 || 0) * 4);

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <Scissors className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                Procedimiento - {format(new Date(procedure.procedureDate), 'dd MMM yyyy', { locale: es })}
              </h3>
              {procedure.doctors && procedure.doctors.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {procedure.doctors.map((d) => `Dr. ${d.doctor.nombre} ${d.doctor.apellido}`).join(', ')}
                </p>
              )}
            </div>
          </div>
          {total > 0 && (
            <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
              {total.toLocaleString()} folículos
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {procedure.punchSize && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Punch</p>
                <p className="text-sm font-semibold">{procedure.punchSize} mm</p>
              </div>
            )}
            {procedure.implantador && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Implantador</p>
                <p className="text-sm font-semibold">{procedure.implantador}</p>
              </div>
            )}
            {procedure.cb1 != null && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">CB1</p>
                <p className="text-sm font-semibold">{procedure.cb1}</p>
              </div>
            )}
            {procedure.cb2 != null && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">CB2</p>
                <p className="text-sm font-semibold">{procedure.cb2}</p>
              </div>
            )}
            {procedure.cb3 != null && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">CB3</p>
                <p className="text-sm font-semibold">{procedure.cb3}</p>
              </div>
            )}
            {procedure.cb4 != null && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">CB4</p>
                <p className="text-sm font-semibold">{procedure.cb4}</p>
              </div>
            )}
          </div>

          {procedure.hairTypes && procedure.hairTypes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tipos de cabello</p>
              <div className="flex flex-wrap gap-1.5">
                {procedure.hairTypes.map((ht) => (
                  <span key={ht.hairType.id || ht.hairType.name} className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border-amber-200">
                    {ht.hairType.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {procedure.descripcion && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Descripción</p>
              <p className="text-sm whitespace-pre-wrap">{procedure.descripcion}</p>
            </div>
          )}

          {(procedure.anestExtLidocaina || procedure.anestImpLidocaina) && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Anestesia</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {procedure.anestExtLidocaina && (
                  <div className="rounded-lg border p-3 bg-accent/20">
                    <p className="text-xs font-semibold mb-2">Extracción</p>
                    <div className="space-y-1 text-xs">
                      <p>Lidocaína: {procedure.anestExtLidocaina}</p>
                      {procedure.anestExtAdrenalina && <p>Adrenalina: {procedure.anestExtAdrenalina} ml</p>}
                      {procedure.anestExtBicarbonatoDeSodio && <p>Bicarbonato: {procedure.anestExtBicarbonatoDeSodio} ml</p>}
                    </div>
                  </div>
                )}
                {procedure.anestImpLidocaina && (
                  <div className="rounded-lg border p-3 bg-accent/20">
                    <p className="text-xs font-semibold mb-2">Implantación</p>
                    <div className="space-y-1 text-xs">
                      <p>Lidocaína: {procedure.anestImpLidocaina}</p>
                      {procedure.anestImpAdrenalina && <p>Adrenalina: {procedure.anestImpAdrenalina} ml</p>}
                      {procedure.anestImpBicarbonatoDeSodio && <p>Bicarbonato: {procedure.anestImpBicarbonatoDeSodio} ml</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
    anestExtLidocaina: '', anestExtAdrenalina: '', anestExtBicarbonatoDeSodio: '',
    anestExtSolucionFisiologica: '', anestExtAnestesiaInfiltrada: '', anestExtBetametasona: '',
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
      // Error captured in createMutation.error
    }
  };

  const AnesthesiaSection = ({ prefix, title, iconBg, iconColor }: { prefix: 'anestExt' | 'anestImp'; title: string; iconBg: string; iconColor: string }) => (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <SectionHeader icon={Syringe} title={title} iconBg={iconBg} iconColor={iconColor} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <div className="space-y-1.5"><Label>Lidocaína</Label><Input value={form[`${prefix}Lidocaina` as keyof typeof form] as string} onChange={(e) => set(`${prefix}Lidocaina`, e.target.value)} placeholder="Ej: 2%" className="h-11" /></div>
          <div className="space-y-1.5"><Label>Adrenalina (ml)</Label><Input type="number" step="0.01" value={form[`${prefix}Adrenalina` as keyof typeof form] as string} onChange={(e) => set(`${prefix}Adrenalina`, e.target.value)} className="h-11" /></div>
          <div className="space-y-1.5"><Label>Bicarbonato de Sodio (ml)</Label><Input type="number" step="0.01" value={form[`${prefix}BicarbonatoDeSodio` as keyof typeof form] as string} onChange={(e) => set(`${prefix}BicarbonatoDeSodio`, e.target.value)} className="h-11" /></div>
          <div className="space-y-1.5"><Label>Sol. Fisiológica (ml)</Label><Input type="number" step="0.01" value={form[`${prefix}SolucionFisiologica` as keyof typeof form] as string} onChange={(e) => set(`${prefix}SolucionFisiologica`, e.target.value)} className="h-11" /></div>
          <div className="space-y-1.5"><Label>Anest. Infiltrada</Label><Input value={form[`${prefix}AnestesiaInfiltrada` as keyof typeof form] as string} onChange={(e) => set(`${prefix}AnestesiaInfiltrada`, e.target.value)} className="h-11" /></div>
          <div className="space-y-1.5"><Label>Betametasona</Label><Input value={form[`${prefix}Betametasona` as keyof typeof form] as string} onChange={(e) => set(`${prefix}Betametasona`, e.target.value)} className="h-11" /></div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Scissors} title="Datos del Procedimiento" iconBg="bg-violet-50" iconColor="text-violet-600" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label>Fecha <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.procedureDate} onChange={(e) => set('procedureDate', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Punch (mm)</Label>
              <Input type="number" step="0.1" value={form.punchSize} onChange={(e) => set('punchSize', e.target.value)} placeholder="0.8" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Implantador</Label>
              <Input value={form.implantador} onChange={(e) => set('implantador', e.target.value)} placeholder="Choi" className="h-11" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Users} title="Doctores" iconBg="bg-blue-50" iconColor="text-blue-600" />
          <div className="flex flex-wrap gap-2">
            {doctors.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleArray('doctorIds', d.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors font-medium ${
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

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Hash} title="Conteo de Folículos" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-4">
            <div className="space-y-1.5"><Label>CB1 (x1)</Label><Input type="number" min="0" value={form.cb1} onChange={(e) => set('cb1', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>CB2 (x2)</Label><Input type="number" min="0" value={form.cb2} onChange={(e) => set('cb2', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>CB3 (x3)</Label><Input type="number" min="0" value={form.cb3} onChange={(e) => set('cb3', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>CB4 (x4)</Label><Input type="number" min="0" value={form.cb4} onChange={(e) => set('cb4', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Total</Label><Input type="number" min="0" value={form.totalFoliculos} onChange={(e) => set('totalFoliculos', e.target.value)} className="h-11" /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Scissors} title="Tipos de Cabello" iconBg="bg-amber-50" iconColor="text-amber-600" />
          <div className="flex flex-wrap gap-2">
            {hairTypes.map((ht) => (
              <button
                key={ht.id}
                type="button"
                onClick={() => toggleArray('hairTypeIds', ht.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors font-medium ${
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

      <AnesthesiaSection prefix="anestExt" title="Anestesia - Extracción" iconBg="bg-red-50" iconColor="text-red-600" />
      <AnesthesiaSection prefix="anestImp" title="Anestesia - Implantación" iconBg="bg-orange-50" iconColor="text-orange-600" />

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Scissors} title="Descripción" iconBg="bg-violet-50" iconColor="text-violet-600" />
          <Textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={3} placeholder="Descripción del procedimiento..." className="resize-none" />
        </CardContent>
      </Card>

      {createMutation.isError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear procedimiento'}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" className="h-11" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" className="h-11 px-8 font-medium" disabled={createMutation.isPending}>
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
            <Link href={`/dashboard/patients/${params.id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Procedimientos</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {procedures ? `${procedures.length} procedimiento(s) registrado(s)` : 'Cargando...'}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button className="h-10 font-medium shadow-sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Nuevo Procedimiento
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      ) : showForm ? (
        <ProcedureForm patientId={params.id} onSuccess={() => setShowForm(false)} />
      ) : procedures && procedures.length > 0 ? (
        <div className="space-y-4">
          {procedures.map((p) => <ProcedureCard key={p.id} procedure={p} />)}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Scissors className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No hay procedimientos registrados</p>
            <Button className="h-10 font-medium mt-2" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />Crear Procedimiento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
