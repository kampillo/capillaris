'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRequireRole } from '@/hooks/use-has-role';
import { formatDateLong, todayInput } from '@/lib/dates';
import type { ProcedureReport } from '@/hooks/use-clinical';

type Person = { id: string; nombre: string; apellido: string };
type Report = ProcedureReport & { nurses: { nurse: Person }[]; capturedBy?: Person; editedBy?: Person; updatedBy?: string; updatedAt?: string };
type Detail = { patient: Person & { fechaNacimiento?: string; edadApproximada: boolean }; procedures: Report[]; nurses: Person[] };
type Catalog = { doctors: Person[]; hairTypes: { id: string; name: string }[]; operatingRooms: { id: string; name: string }[] };
const fields: { key: string; label: string; type: 'text' | 'number' | 'time' | 'datetime-local'; step?: string }[] = [
  { key: 'horaInicio', label: 'Inicio', type: 'time' },
  { key: 'horaComidaInicio', label: 'Inicio de comida', type: 'time' },
  { key: 'horaComidaFin', label: 'Fin de comida', type: 'time' },
  { key: 'horaImplantacionInicio', label: 'Inicio de implantación', type: 'time' },
  { key: 'horaFin', label: 'Fin', type: 'time' },
  { key: 'punchSize', label: 'Punch (mm)', type: 'number', step: '0.1' },
  { key: 'implantador', label: 'Implantador', type: 'text' },
  ...[1, 2, 3, 4].map(n => ({ key: `cb${n}`, label: `CB${n} (${n} pelo${n === 1 ? '' : 's'})`, type: 'number' as const })),
  { key: 'totalFoliculos', label: 'Total de folículos', type: 'number' },
  ...(['Ext', 'Imp'] as const).flatMap(phase => [
    ...(['Inicial', 'Final'] as const).map(boundary => ({ key: `anest${phase}Fecha${boundary}`, label: `${boundary === 'Inicial' ? 'Inicio' : 'Fin'} de anestesia - ${phase === 'Ext' ? 'extracción' : 'implantación'}`, type: 'datetime-local' as const })),
    { key: `anest${phase}Lidocaina`, label: `Lidocaína - ${phase === 'Ext' ? 'extracción' : 'implantación'}`, type: 'text' as const },
    ...['Adrenalina', 'BicarbonatoDeSodio', 'SolucionFisiologica'].map(name => ({ key: `anest${phase}${name}`, label: `${name === 'BicarbonatoDeSodio' ? 'Bicarbonato de sodio' : name === 'SolucionFisiologica' ? 'Solución fisiológica' : name} (mL) - ${phase === 'Ext' ? 'extracción' : 'implantación'}`, type: 'number' as const, step: '0.01' })),
    { key: `anest${phase}AnestesiaInfiltrada`, label: `Anestesia infiltrada - ${phase === 'Ext' ? 'extracción' : 'implantación'}`, type: 'text' as const },
    { key: `anest${phase}Betametasona`, label: `Betametasona - ${phase === 'Ext' ? 'extracción' : 'implantación'}`, type: 'text' as const },
  ]),
];
const control = 'min-h-11 w-full rounded border bg-surface px-3 py-2 text-foreground';

function ProcedureEditor({ patientId, report, catalog, onDone }: { patientId: string; report?: Report; catalog: Catalog; onDone: () => void }) {
  const qc = useQueryClient();
  const original = report as unknown as Record<string, unknown> | undefined;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries([
    ['procedureDate', report?.procedureDate?.slice(0, 10) ?? todayInput()], ['descripcion', report?.descripcion ?? ''], ['operatingRoomId', report?.operatingRoomId ?? ''],
    ...fields.map(f => {
      const value = original?.[f.key];
      if (f.type === 'datetime-local' && value) {
        const date = new Date(String(value));
        return [f.key, new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)];
      }
      return [f.key, String(value ?? '')];
    }),
  ]));
  const [doctorIds, setDoctorIds] = useState(report?.doctors?.map(d => d.doctor.id) ?? []);
  const [hairTypeIds, setHairTypeIds] = useState(report?.hairTypes?.map(h => h.hairType.id) ?? []);
  const save = useMutation({ mutationFn: () => {
    const payload: Record<string, unknown> = { procedureDate: values.procedureDate, descripcion: values.descripcion, doctorIds, hairTypeIds };
    if (!report) payload.patientId = patientId;
    if (values.operatingRoomId) payload.operatingRoomId = values.operatingRoomId;
    else if (report?.operatingRoomId) payload.operatingRoomId = null;
    for (const field of fields) {
      if (values[field.key] !== '') payload[field.key] = field.type === 'number' ? Number(values[field.key]) : field.type === 'datetime-local' ? new Date(values[field.key]).toISOString() : values[field.key];
      else if (report && original?.[field.key] != null) payload[field.key] = null;
    }
    return report ? api.put(`/nursing/patients/${patientId}/procedures/${report.id}`, payload) : api.post(`/nursing/patients/${patientId}/procedures`, payload);
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['nursing-detail'] }); qc.invalidateQueries({ queryKey: ['procedures'] }); qc.invalidateQueries({ queryKey: ['patient'] }); qc.invalidateQueries({ queryKey: ['reports'] }); onDone(); } });
  const set = (key: string, value: string) => setValues(old => ({ ...old, [key]: value }));
  return <form className="rounded-xl border bg-surface p-5 space-y-5" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
    <h2 className="font-semibold">{report ? 'Editar reporte diario' : 'Nuevo reporte diario'}</h2>
    <label className="block">Fecha del procedimiento<input className={control} type="date" required disabled={!!report?.sessionGroupId} value={values.procedureDate} onChange={e => set('procedureDate', e.target.value)} /></label>
    {report?.sessionGroupId && <p className="text-sm">La fecha está vinculada a una sesión. Un médico o administrador debe separar los días para cambiarla.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <label key={field.key} className="block text-sm">{field.label}<input className={control} type={field.type} min={field.type === 'number' ? 0 : undefined} step={field.step ?? (field.type === 'number' ? '1' : undefined)} value={values[field.key]} onChange={e => set(field.key, e.target.value)} /></label>)}</div>
    <label className="block">Quirófano<select className={control} value={values.operatingRoomId} onChange={e => set('operatingRoomId', e.target.value)}><option value="">Sin selección</option>{catalog.operatingRooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
    <fieldset><legend className="font-medium">Médicos responsables</legend><div className="flex flex-wrap gap-3">{catalog.doctors.map(d => <label className="flex min-h-11 items-center gap-2" key={d.id}><input type="checkbox" checked={doctorIds.includes(d.id)} onChange={e => setDoctorIds(old => e.target.checked ? [...old, d.id] : old.filter(id => id !== d.id))} />{d.nombre} {d.apellido}</label>)}</div></fieldset>
    <fieldset><legend className="font-medium">Zonas / tipos del catálogo</legend><div className="flex flex-wrap gap-3">{catalog.hairTypes.map(h => <label className="flex min-h-11 items-center gap-2" key={h.id}><input type="checkbox" checked={hairTypeIds.includes(h.id)} onChange={e => setHairTypeIds(old => e.target.checked ? [...old, h.id] : old.filter(id => id !== h.id))} />{h.name}</label>)}</div></fieldset>
    <label className="block">Descripción<textarea rows={4} className={control} value={values.descripcion} onChange={e => set('descripcion', e.target.value)} /></label>
    {save.isError && <p role="alert" className="text-destructive">{save.error.message}</p>}
    <div className="flex gap-3"><button disabled={save.isPending} className="min-h-11 rounded bg-brand px-4 text-white disabled:opacity-50">{save.isPending ? 'Guardando…' : 'Guardar reporte'}</button><button type="button" className="min-h-11 px-4 underline" onClick={onDone}>Cancelar</button></div>
  </form>;
}

function Participants({ report, nurses }: { report: Report; nurses: Person[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const options = [...new Map([...nurses, ...report.nurses.map(n => n.nurse)].map(n => [n.id, n])).values()];
  const save = useMutation({ mutationFn: () => api.put(`/nursing/procedures/${report.id}/participants`, { nurseIds: selected }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['nursing-detail'] }); qc.invalidateQueries({ queryKey: ['reports'] }); setEditing(false); } });
  return <div className="mt-3 border-t pt-3"><p className="font-medium">Enfermería participante</p>
    <p className="text-sm">{report.nurses.map(n => `${n.nurse.nombre} ${n.nurse.apellido}`).join(' · ') || 'Sin participantes registrados'}</p>
    {editing ? <div className="space-y-2">{options.map(n => <label className="flex min-h-11 items-center gap-2" key={n.id}><input type="checkbox" checked={selected.includes(n.id)} onChange={e => setSelected(old => e.target.checked ? [...old, n.id] : old.filter(id => id !== n.id))} />{n.nombre} {n.apellido}</label>)}<button className="min-h-11 px-3 underline" disabled={save.isPending} onClick={() => save.mutate()}>Guardar participantes</button><button className="min-h-11 px-3" onClick={() => setEditing(false)}>Cancelar</button></div> : <button className="min-h-11 underline" onClick={() => { setSelected(report.nurses.map(n => n.nurse.id)); setEditing(true); }}>Registrar participantes</button>}
    {save.isError && <p role="alert" className="text-destructive">{save.error.message}</p>}
  </div>;
}

export default function NursingPatientPage({ params }: { params: { id: string } }) {
  const authorized = useRequireRole('nurse', 'admin', 'doctor');
  const user = useAuthStore(s => s.user);
  const isNurse = !!user?.roles?.includes('nurse');
  const [editor, setEditor] = useState<Report | 'new' | null>(null);
  const detail = useQuery<Detail>({ queryKey: ['nursing-detail', user?.id, params.id], queryFn: () => api.get(`/nursing/patients/${params.id}`), enabled: authorized, retry: false, refetchInterval: 30000 });
  const catalog = useQuery<Catalog>({ queryKey: ['nursing-catalog', user?.id], queryFn: () => api.get('/nursing/catalog'), enabled: authorized });
  if (!authorized) return null;
  if (detail.isError) return <p role="alert">{detail.error.message}. <Link className="underline" href={isNurse ? '/dashboard/nursing' : '/dashboard/patients'}>Volver</Link></p>;
  if (!detail.data) return <p>Cargando paciente asignado…</p>;
  const { patient, procedures, nurses } = detail.data;
  const count = new Set(procedures.map(p => p.sessionGroupId ?? p.id)).size;
  return <div className="space-y-5">
    <Link className="underline" href={isNurse ? '/dashboard/nursing' : `/dashboard/patients/${params.id}`}>← {isNurse ? 'Mis pacientes' : 'Volver al expediente'}</Link>
    <div><h1 className="cap-h2">{patient.nombre} {patient.apellido}</h1><p className="text-sm text-text-secondary">Nacimiento: {patient.fechaNacimiento ? formatDateLong(patient.fechaNacimiento) : 'No registrado'}{patient.edadApproximada ? ' (aproximado)' : ''}</p><p>{count} procedimiento(s) · {procedures.length} reporte(s) diario(s)</p></div>
    <p className="text-sm">La participación clínica se registra por separado de quién captura o edita el reporte. No se asigna automáticamente.</p>
    {editor ? catalog.data ? <ProcedureEditor key={editor === 'new' ? 'new' : editor.id} patientId={params.id} report={editor === 'new' ? undefined : editor} catalog={catalog.data} onDone={() => setEditor(null)} /> : <p role="alert">{catalog.isError ? 'No se pudo cargar el catálogo. Recarga antes de editar.' : 'Cargando catálogo…'}</p> : <button className="min-h-11 rounded bg-brand px-4 text-white" onClick={() => setEditor('new')}>Nuevo procedimiento</button>}
    {!editor && procedures.map(report => <article key={report.id} className="rounded-lg border bg-surface p-5">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">{formatDateLong(report.procedureDate)}{report.sessionDay ? ` · Día ${report.sessionDay}` : ''}</h2><button className="min-h-11 px-3 underline" onClick={() => setEditor(report)}>Editar reporte</button></div>
      <p>Folículos: {report.totalFoliculos ?? 'Sin registrar'}</p><p className="whitespace-pre-wrap">{report.descripcion}</p>
      <p className="mt-2 text-sm">Médicos: {report.doctors?.map(d => `${d.doctor.nombre} ${d.doctor.apellido}`).join(' · ') || 'Sin registrar'}</p>
      <Participants report={report} nurses={nurses} />
      <p className="mt-3 text-xs text-text-secondary">Capturó: {report.capturedBy ? `${report.capturedBy.nombre} ${report.capturedBy.apellido}` : 'Sin registro histórico'}{report.editedBy ? ` · Última edición: ${report.editedBy.nombre} ${report.editedBy.apellido}` : ''}</p>
    </article>)}
    {!procedures.length && !editor && <p>No hay procedimientos registrados.</p>}
  </div>;
}
