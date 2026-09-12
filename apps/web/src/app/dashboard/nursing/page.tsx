'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRequireRole } from '@/hooks/use-has-role';

export default function NursingPatientsPage() {
  const authorized = useRequireRole('nurse');
  const userId = useAuthStore(s => s.user?.id);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const patients = useQuery<{ id: string; nombre: string; apellido: string }[]>({
    queryKey: ['nursing-patients', userId, query], enabled: authorized,
    queryFn: () => api.get('/nursing/patients', { params: { query } }),
    refetchInterval: 30000, retry: false,
  });
  if (!authorized) return null;
  return <div className="space-y-5">
    <div><h1 className="cap-h2">Mis pacientes</h1><p className="text-text-secondary">Solo pacientes asignados. Acceso a sus procedimientos, sin agenda ni datos administrativos.</p></div>
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setQuery(input.trim()); }}>
      <input className="min-w-0 flex-1 rounded border p-3" aria-label="Buscar entre mis pacientes" value={input} onChange={e => setInput(e.target.value)} placeholder="Nombre o apellido" />
      <button className="rounded bg-brand px-4 text-white">Buscar</button>
    </form>
    {patients.isPending ? <p>Cargando pacientes…</p> : patients.isError ? <p role="alert">No se pudieron cargar tus asignaciones. <button className="underline" onClick={() => patients.refetch()}>Reintentar</button></p> : <>
      {patients.data.length === 0 ? <p>No tienes pacientes asignados con esta búsqueda.</p> : <ul className="space-y-2">{patients.data.map(p => <li key={p.id}><Link className="block rounded-lg border bg-surface p-4 hover:bg-surface-2" href={`/dashboard/nursing/${p.id}`}>{p.nombre} {p.apellido}<span className="ml-3 text-sm text-text-secondary">Ver procedimientos →</span></Link></li>)}</ul>}
      {patients.data.length === 100 && <p>Se muestran los primeros 100 pacientes. Refina la búsqueda.</p>}
    </>}
  </div>;
}
