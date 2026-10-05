'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireRole } from '@/hooks/use-has-role';
import { useDeliveryPrescriptions } from '@/hooks/use-deliveries';
import { DeliveryWorkspace } from '@/components/inventory/delivery-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QueryFeedback } from '@/components/clinic/form-layout';

export default function DeliveriesPage() {
  return <Suspense fallback={<p>Cargando entregas…</p>}><DeliveriesBody /></Suspense>;
}

function DeliveriesBody() {
  const authorized = useRequireRole('admin', 'receptionist', 'inventory_manager');
  const params = useSearchParams();
  const initialId = params.get('prescriptionId') ?? '';
  const validId = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(initialId) ? initialId : '';
  const [mode, setMode] = useState<'direct' | 'prescription'>(validId ? 'prescription' : 'direct');
  const [query, setQuery] = useState('');
  const [prescriptionId, setPrescriptionId] = useState(validId);
  const results = useDeliveryPrescriptions(query);
  if (!authorized) return null;
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold">Entregas</h1><p className="text-sm text-muted-foreground">Registra la salida física de productos y consulta sus pendientes.</p></div>
    <div className="flex flex-wrap gap-2"><Button variant={mode === 'direct' ? 'default' : 'outline'} onClick={() => setMode('direct')}>Sin receta</Button><Button variant={mode === 'prescription' ? 'default' : 'outline'} onClick={() => setMode('prescription')}>Desde receta</Button></div>
    {mode === 'prescription' && <div className="space-y-3">
      <Label htmlFor="delivery-patient-search">Buscar receta por nombre del paciente</Label><Input id="delivery-patient-search" value={query} onChange={e => setQuery(e.target.value)} maxLength={100} placeholder="Escribe al menos dos caracteres" className="h-11" />
      <QueryFeedback loading={query.trim().length >= 2 && results.isLoading} error={results.isError} label="recetas" onRetry={() => results.refetch()} />
      <div className="max-h-64 space-y-2 overflow-y-auto">{results.data?.map(row => <Button key={row.id} className="h-auto w-full justify-start whitespace-normal py-3 text-left" variant={prescriptionId === row.id ? 'default' : 'outline'} onClick={() => setPrescriptionId(row.id)}>{row.patient.nombre} {row.patient.apellido} · {row.prescriptionDate.slice(0, 10)} · {row.status}</Button>)}</div>
      {query.trim().length >= 2 && results.data?.length === 0 && <p className="text-sm text-muted-foreground">Sin recetas coincidentes.</p>}
      {results.data?.length === 30 && <p className="text-sm text-muted-foreground">Se muestran 30 resultados. Afina el nombre.</p>}
    </div>}
    {(mode === 'direct' || prescriptionId) && <DeliveryWorkspace prescriptionId={mode === 'prescription' ? prescriptionId : undefined} />}
  </div>;
}
