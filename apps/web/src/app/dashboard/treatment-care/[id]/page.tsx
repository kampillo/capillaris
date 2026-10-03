'use client';

import { useState } from 'react';
import Link from '@/components/patients/patient-context-link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRequireRole } from '@/hooks/use-has-role';
import { formatDateLong, todayInput } from '@/lib/dates';

type Person = { id: string; nombre: string; apellido: string };
type Option = { id: string; name: string; code?: string };
type Treatment = {
  id: string; fecha: string; sesionNumero: number | null; duracion: number | null;
  dilucion: string | null; descripcion: string | null; comentarios: string | null;
  realizadoPorId: string | null; realizadoPor: Person | null;
  capturedBy: Person | null; editedBy: Person | null;
  tipos: { treatmentType: Option }[]; zonas: { hairType: Option }[];
};
type Catalog = { types: Option[]; zones: Option[]; staff: Person[] };
type Detail = { patient: Person & { fechaNacimiento: string | null; edadApproximada: boolean }; treatments: Treatment[] };
const control = 'min-h-11 w-full rounded border bg-surface px-3 py-2 text-foreground';
const name = (person: Person | null) => person ? `${person.nombre} ${person.apellido}` : 'Sin registro';

function TreatmentEditor({ patientId, treatment, catalog, onDone }: { patientId: string; treatment?: Treatment; catalog: Catalog; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fecha: treatment?.fecha.slice(0, 10) ?? todayInput(),
    sesionNumero: String(treatment?.sesionNumero ?? ''), duracion: String(treatment?.duracion ?? ''),
    dilucion: treatment?.dilucion ?? '', descripcion: treatment?.descripcion ?? '', comentarios: treatment?.comentarios ?? '',
    realizadoPorId: treatment?.realizadoPorId ?? '',
    treatmentTypeIds: treatment?.tipos.map(t => t.treatmentType.id) ?? [],
    zonaIds: treatment?.zonas.map(z => z.hairType.id) ?? [],
  });
  const types = [...new Map([...catalog.types, ...(treatment?.tipos.map(t => t.treatmentType) ?? [])].map(t => [t.id, t])).values()];
  const staff = [...new Map([...catalog.staff, ...(treatment?.realizadoPor ? [treatment.realizadoPor] : [])].map(p => [p.id, p])).values()];
  const set = (key: string, value: string) => setForm(old => ({ ...old, [key]: value }));
  const toggle = (key: 'treatmentTypeIds' | 'zonaIds', id: string) => setForm(old => ({ ...old, [key]: old[key].includes(id) ? old[key].filter(v => v !== id) : [...old[key], id] }));
  const save = useMutation({ mutationFn: () => {
    const payload = { ...form, realizadoPorId: form.realizadoPorId || null,
      sesionNumero: form.sesionNumero ? Number(form.sesionNumero) : null,
      duracion: form.duracion ? Number(form.duracion) : null,
    };
    return treatment ? api.put(`/treatment-care/patients/${patientId}/treatments/${treatment.id}`, payload)
      : api.post(`/treatment-care/patients/${patientId}/treatments`, { ...payload, patientId });
  }, onSuccess: () => {
    for (const queryKey of [['treatment-care-detail'], ['treatments'], ['patient'], ['reports']]) qc.invalidateQueries({ queryKey });
    onDone();
  } });
  return <form className="space-y-5 rounded-xl border bg-surface p-5" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
    <h2 className="font-semibold">{treatment ? 'Editar aplicación / sesión' : 'Registrar aplicación / sesión'}</h2>
    <p className="text-sm text-text-secondary">Registra lo aplicado. Este formulario no indica ni prescribe un tratamiento.</p>
    <div className="grid gap-4 sm:grid-cols-3">
      <label>Fecha<input className={control} type="date" required value={form.fecha} onChange={e => set('fecha', e.target.value)} /></label>
      <label>Número de sesión<input className={control} type="number" min={1} step={1} value={form.sesionNumero} onChange={e => set('sesionNumero', e.target.value)} /></label>
      <label>Realizado por<select className={control} value={form.realizadoPorId} onChange={e => set('realizadoPorId', e.target.value)}><option value="">Sin registrar</option>{staff.map(p => <option key={p.id} value={p.id}>{name(p)}{!catalog.staff.some(s => s.id === p.id) ? ' (histórico)' : ''}</option>)}</select></label>
    </div>
    <fieldset><legend className="font-medium">Tratamientos aplicados</legend><div className="flex flex-wrap gap-3">{types.map(t => <label className="flex min-h-11 items-center gap-2" key={t.id}><input type="checkbox" checked={form.treatmentTypeIds.includes(t.id)} onChange={() => toggle('treatmentTypeIds', t.id)} />{t.name}{!catalog.types.some(active => active.id === t.id) ? ' (histórico)' : ''}</label>)}</div>
      {!types.length && <p role="alert">No hay tipos disponibles. Administración debe revisar el catálogo.</p>}
    </fieldset>
    <fieldset><legend className="font-medium">Zonas tratadas</legend><div className="flex flex-wrap gap-3">{catalog.zones.map(z => <label className="flex min-h-11 items-center gap-2" key={z.id}><input type="checkbox" checked={form.zonaIds.includes(z.id)} onChange={() => toggle('zonaIds', z.id)} />{z.name}</label>)}</div></fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <label>Duración (minutos, si corresponde)<input className={control} type="number" min={0} step={1} value={form.duracion} onChange={e => set('duracion', e.target.value)} /></label>
      <label>Dilución (si corresponde)<input className={control} maxLength={100} value={form.dilucion} onChange={e => set('dilucion', e.target.value)} /></label>
    </div>
    <label className="block">Descripción<textarea className={control} rows={3} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} /></label>
    <label className="block">Comentarios de la aplicación<textarea className={control} rows={3} value={form.comentarios} onChange={e => set('comentarios', e.target.value)} /></label>
    {save.isError && <p role="alert" className="text-destructive">{save.error.message}</p>}
    <div className="flex gap-3"><button disabled={save.isPending} className="min-h-11 rounded bg-brand px-4 text-white disabled:opacity-50">{save.isPending ? 'Guardando…' : 'Guardar tratamiento'}</button><button type="button" className="min-h-11 px-4 underline" disabled={save.isPending} onClick={onDone}>Cancelar</button></div>
  </form>;
}

export default function TreatmentCarePatientPage({ params }: { params: { id: string } }) {
  const authorized = useRequireRole('treatment_staff', 'admin', 'doctor');
  const user = useAuthStore(s => s.user);
  const restricted = !!user?.roles?.some(r => ['nurse', 'treatment_staff'].includes(r));
  const [editor, setEditor] = useState<Treatment | 'new' | null>(null);
  const detail = useQuery<Detail>({ queryKey: ['treatment-care-detail', user?.id, params.id], queryFn: () => api.get(`/treatment-care/patients/${params.id}`), enabled: authorized, retry: false });
  const catalog = useQuery<Catalog>({ queryKey: ['treatment-care-catalog', user?.id], queryFn: () => api.get('/treatment-care/catalog'), enabled: authorized, retry: false });
  if (!authorized) return null;
  if (detail.isError) return <p role="alert">{detail.error.message}. <button className="underline" onClick={() => detail.refetch()}>Reintentar</button></p>;
  if (!detail.data) return <p>Cargando historial de tratamientos…</p>;
  const { patient, treatments } = detail.data;
  return <div className="space-y-5">
    <Link className="underline" href={restricted ? '/dashboard/treatment-care' : `/dashboard/patients/${params.id}`}>← {restricted ? 'Buscar paciente' : 'Volver al expediente'}</Link>
    <div><h1 className="cap-h2">{name(patient)}</h1><p>Nacimiento: {patient.fechaNacimiento ? formatDateLong(patient.fechaNacimiento) : 'Sin registrar'}{patient.edadApproximada ? ' (aproximado)' : ''}</p></div>
    <div><h2 className="font-semibold">Historial de tratamientos</h2><p className="text-sm text-text-secondary">Medicina capilar y micropigmentación · {treatments.length} registro(s). Responsable de aplicación y autoría se registran por separado.</p></div>
    {editor ? catalog.data ? <TreatmentEditor key={editor === 'new' ? 'new' : editor.id} patientId={params.id} treatment={editor === 'new' ? undefined : editor} catalog={catalog.data} onDone={() => setEditor(null)} /> : <p role="alert">{catalog.isError ? 'No se pudo cargar el catálogo.' : 'Cargando catálogo…'} <button className="underline" onClick={() => catalog.refetch()}>Reintentar</button><button className="ml-3 underline" onClick={() => setEditor(null)}>Cancelar</button></p> : <button className="min-h-11 rounded bg-brand px-4 text-white" onClick={() => setEditor('new')}>Nuevo tratamiento / sesión</button>}
    {!editor && treatments.map(t => <article key={t.id} className="space-y-2 rounded-lg border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{formatDateLong(t.fecha)}{t.sesionNumero ? ` · Sesión ${t.sesionNumero}` : ''}</h3><button className="min-h-11 underline" onClick={() => setEditor(t)}>Editar tratamiento</button></div>
      <p>{t.tipos.map(item => item.treatmentType.name).join(' · ') || 'Sin tipo asignado'}</p>
      <p className="text-sm">Realizado por: {name(t.realizadoPor)}</p>
      {!!t.zonas.length && <p className="text-sm">Zonas: {t.zonas.map(z => z.hairType.name).join(' · ')}</p>}
      {t.duracion != null && <p className="text-sm">Duración: {t.duracion} minutos</p>}{t.dilucion && <p className="text-sm">Dilución: {t.dilucion}</p>}
      <p className="whitespace-pre-wrap">{t.descripcion}</p><p className="whitespace-pre-wrap text-sm">{t.comentarios}</p>
      <p className="text-xs text-text-secondary">Capturó: {name(t.capturedBy)} · Última edición: {name(t.editedBy)}</p>
    </article>)}
    {!editor && !treatments.length && <p>No hay tratamientos registrados.</p>}
  </div>;
}
