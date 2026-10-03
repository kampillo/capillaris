'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRequireRole } from '@/hooks/use-has-role';
import { formatDateLong } from '@/lib/dates';

export function WorkspacePatients({ area }: { area: 'nursing' | 'treatment-care' }) {
  const authorized = useRequireRole(area === 'nursing' ? 'nurse' : 'treatment_staff', 'admin', 'doctor');
  const userId = useAuthStore(s => s.user?.id);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const surgery = area === 'nursing';
  const patients = useQuery<{ id: string; nombre: string; apellido: string; fechaNacimiento: string | null; edadApproximada: boolean }[]>({
    queryKey: [`${area}-patients`, userId, query], enabled: authorized && query.length >= 2,
    queryFn: () => api.get(`/${area}/patients`, { params: { query } }), retry: false,
  });
  if (!authorized) return null;
  return <div className="space-y-5">
    <div><h1 className="cap-h2">{surgery ? 'Enfermería quirúrgica' : 'Tratamientos'}</h1>
      <p className="text-text-secondary">Busca al paciente por nombre y apellido. {surgery ? 'Puedes consultar y completar sus procedimientos sin asignación previa.' : 'Acceso al historial y captura de tratamientos.'} No incluye el expediente completo.</p></div>
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setQuery(input.trim()); }}>
      <input className="min-w-0 flex-1 rounded border bg-surface p-3" aria-label="Buscar paciente por nombre o apellido" minLength={2} maxLength={100} required value={input} onChange={e => setInput(e.target.value)} placeholder="Nombre y apellido" />
      <button className="rounded bg-brand px-4 text-white">Buscar</button>
    </form>
    {query.length < 2 ? <p>Escribe al menos dos caracteres para buscar.</p> : patients.isPending ? <p>Cargando pacientes…</p> : patients.isError ? <p role="alert">No se pudieron cargar los pacientes. <button className="underline" onClick={() => patients.refetch()}>Reintentar</button></p> : <>
      {patients.data.length === 0 ? <p>No hay pacientes con esta búsqueda.</p> : <ul className="space-y-2">{patients.data.map(p => <li key={p.id}>
        <Link className="block rounded-lg border bg-surface p-4 hover:bg-surface-2" href={`/dashboard/${area}/${p.id}`}>
          <span className="font-medium">{p.nombre} {p.apellido}</span>
          <span className="block text-sm text-text-secondary">Nacimiento: {p.fechaNacimiento ? formatDateLong(p.fechaNacimiento) : 'Sin registrar'}{p.edadApproximada ? ' (aproximado)' : ''}</span>
          <span className="text-sm underline">{surgery ? 'Ver procedimientos' : 'Ver tratamientos'} →</span>
        </Link>
      </li>)}</ul>}
      {patients.data.length === 100 && <p>Se muestran los primeros 100 pacientes. Refina la búsqueda.</p>}
    </>}
  </div>;
}
