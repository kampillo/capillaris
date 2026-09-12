'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Person = { id: string; nombre: string; apellido: string };
export function NursingAssignments({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [nurseId, setNurseId] = useState('');
  const staff = useQuery<Person[]>({ queryKey: ['nursing-staff'], queryFn: () => api.get('/nursing/staff') });
  const assignments = useQuery<{ nurseId: string; nurse: Person }[]>({ queryKey: ['nursing-assignments', patientId], queryFn: () => api.get(`/nursing/patients/${patientId}/assignments`) });
  const save = useMutation({
    mutationFn: ({ id, revoke }: { id: string; revoke?: boolean }) => api.post(`/nursing/patients/${patientId}/assignments${revoke ? '/revoke' : ''}`, { nurseId: id }),
    onSuccess: () => { setNurseId(''); qc.invalidateQueries({ queryKey: ['nursing-assignments', patientId] }); qc.invalidateQueries({ queryKey: ['nursing-detail'] }); },
  });
  return <section className="rounded-lg border bg-surface p-5 space-y-3">
    <h3 className="font-semibold">Enfermería asignada</h3>
    <p className="text-sm text-text-secondary">La asignación permite consultar y trabajar en procedimientos. No significa participación clínica automática.</p>
    {(staff.isError || assignments.isError) ? <p role="alert">No se pudieron cargar las asignaciones.</p> : <>
      <ul className="space-y-2">{assignments.data?.map(a => <li key={a.nurseId} className="flex flex-wrap items-center justify-between gap-2"><span>{a.nurse.nombre} {a.nurse.apellido}</span><button className="min-h-11 px-2 underline" disabled={save.isPending} onClick={() => { if (window.confirm('¿Retirar el acceso de esta persona al paciente? Su participación histórica se conserva.')) save.mutate({ id: a.nurseId, revoke: true }); }}>Retirar acceso</button></li>)}</ul>
      <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); if (nurseId) save.mutate({ id: nurseId }); }}>
        <select aria-label="Cuenta de enfermería" className="min-h-11 min-w-0 rounded border px-3" value={nurseId} onChange={e => setNurseId(e.target.value)}><option value="">Selecciona una cuenta</option>{staff.data?.filter(n => !assignments.data?.some(a => a.nurseId === n.id)).map(n => <option key={n.id} value={n.id}>{n.nombre} {n.apellido}</option>)}</select>
        <button className="min-h-11 rounded bg-brand px-4 text-white disabled:opacity-50" disabled={!nurseId || save.isPending}>Asignar</button>
      </form>
      {staff.data?.length === 0 && <p className="text-sm">No hay cuentas activas con rol Enfermería. Administración puede crearlas en Configuración.</p>}
    </>}
    {save.isError && <p role="alert" className="text-destructive">{save.error.message}</p>}
    <Link className="inline-block min-h-11 py-3 text-sm underline" href={`/dashboard/nursing/${patientId}`}>Procedimientos y participación de enfermería →</Link>
  </section>;
}
