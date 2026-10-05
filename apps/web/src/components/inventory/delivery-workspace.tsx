'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { readDeliveryCommand, type DeliveryCommand } from '@/lib/delivery-command';
import { useAuthStore } from '@/store/auth';
import { useHasRole } from '@/hooks/use-has-role';
import { useDeliveries, useFulfillment, useRefreshDeliveries, type Delivery, type DeliveryRequest } from '@/hooks/use-deliveries';
import { useProducts, type Product } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QueryFeedback } from '@/components/clinic/form-layout';

export function DeliveryWorkspace({ prescriptionId }: { prescriptionId?: string }) {
  const canConfirm = useHasRole('admin', 'receptionist', 'inventory_manager');
  const canReverse = useHasRole('admin');
  const actor = useAuthStore(state => state.user?.id);
  const storageKey = actor ? `capillaris-delivery-pending:${actor}` : null;
  const fulfillment = useFulfillment(prescriptionId);
  const [search, setSearch] = useState('');
  const products = useProducts(1, 30, { search, isActive: true });
  const [selected, setSelected] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const history = useDeliveries(page, prescriptionId);
  const refresh = useRefreshDeliveries();
  const [pending, setPending] = useState<DeliveryCommand | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Delivery | null>(null);
  const [reverseRow, setReverseRow] = useState<Delivery | null>(null);
  const [reason, setReason] = useState('');
  const [physical, setPhysical] = useState(false);

  useEffect(() => {
    try { setPending(storageKey ? readDeliveryCommand(sessionStorage.getItem(storageKey)) : null); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo recuperar la operación pendiente'); }
  }, [storageKey]);
  useEffect(() => { setQuantities({}); setPage(1); }, [prescriptionId]);

  async function execute(next?: Omit<Extract<DeliveryCommand, { operation: 'confirm' }>, 'key'> | Omit<Extract<DeliveryCommand, { operation: 'reverse' }>, 'key'>) {
    if (saving.current || !storageKey) return;
    saving.current = true; setBusy(true); setError(''); setReceipt(null);
    try {
      const stored = readDeliveryCommand(sessionStorage.getItem(storageKey));
      if (stored && next) throw Error('Reintenta primero la operación pendiente para conocer su resultado');
      const command: DeliveryCommand = stored ?? (next ? { ...next, key: crypto.randomUUID() } : (() => { throw Error('No hay operación pendiente'); })());
      // Persist before the request, so navigation/reload after a timeout keeps the same key.
      sessionStorage.setItem(storageKey, JSON.stringify(command)); setPending(command);
      const signal = AbortSignal.timeout(35000);
      const result = command.operation === 'confirm'
        ? await api.post<Delivery>('/deliveries', command.body, { headers: { 'Idempotency-Key': command.key }, signal })
        : await api.post<Delivery>(`/deliveries/${command.id}/reversal`, command.body, { headers: { 'Idempotency-Key': command.key }, signal });
      sessionStorage.removeItem(storageKey); setPending(null); setReceipt(result);
      setSelected([]); setQuantities({}); setReverseRow(null); setReason(''); setPhysical(false); refresh();
    } catch (err) {
      // Network/5xx has an uncertain result; freeze the draft and reuse its key.
      if (err instanceof ApiError && err.status < 500 && ![401, 403, 408, 429].includes(err.status)) {
        sessionStorage.removeItem(storageKey); setPending(null); refresh();
      }
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el resultado');
    } finally { saving.current = false; setBusy(false); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (pending || busy) return;
    const lines: DeliveryRequest['lines'] = prescriptionId
      ? (fulfillment.data?.items ?? []).filter(item => !item.blockedReason && quantities[item.id]).map(item => ({ prescriptionItemId: item.id, quantity: Number(quantities[item.id]) }))
      : selected.map(product => ({ productId: product.id, quantity: Number(quantities[product.id]) }));
    if (!lines.length || lines.some(line => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 2147483647)) { setError('Elige al menos un producto y cantidades enteras positivas'); return; }
    await execute({ operation: 'confirm', body: { source: prescriptionId ? 'prescription' : 'direct', ...(prescriptionId && { prescriptionId }), lines } });
  }

  return <div className="min-w-0 space-y-5">
    {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    {pending && <div role="status" className="space-y-2 rounded-md border border-amber-300 p-3 text-sm">
      <p>Hay una operación pendiente de confirmar. Reintenta para conocer su resultado antes de registrar otra entrega.</p>
      <Button disabled={busy} onClick={() => execute()}>{busy ? 'Comprobando…' : 'Reintentar operación pendiente'}</Button>
    </div>}
    {receipt && <div role="status" className="rounded-md border border-emerald-300 p-3 text-sm">
      <p className="font-semibold">{receipt.kind === 'reversal' ? 'Reverso registrado y existencias reincorporadas' : 'Entrega confirmada'}</p>
      <ul>{receipt.lines.map(line => <li key={line.id}>{line.productName} · {line.quantity} {line.stockUnit}</li>)}</ul>
    </div>}
    <Card><CardHeader><CardTitle>{prescriptionId ? 'Entrega de receta' : 'Entrega directa'}</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Envases completos. Las existencias se descuentan al confirmar la entrega.</p>
      {prescriptionId && <QueryFeedback loading={fulfillment.isLoading} error={fulfillment.isError} label="cumplimiento de receta" onRetry={() => fulfillment.refetch()} />}
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy || !!pending || !canConfirm} className="min-w-0 space-y-4">
          {prescriptionId ? <>
            {fulfillment.data && <p className="font-medium">{fulfillment.data.patient.nombre} {fulfillment.data.patient.apellido}</p>}
            {fulfillment.data?.items.map(item => <div key={item.id} className="min-w-0 space-y-2 rounded-md border p-3">
              <p className="break-words font-medium">{item.medicineName}</p>
              <p className="break-words text-sm">{item.product ? [item.product.name, item.product.sku, item.product.presentation, item.product.stockUnit].filter(Boolean).join(' · ') : 'Sin producto vinculado'}</p>
              <p className="text-sm">Autorizado: {item.target ?? 'Sin validar'} · Entregado: {item.state === 'unknown' ? 'Sin detalle verificable' : item.delivered} · Pendiente: {item.pending ?? 'Sin validar'} · Stock: {item.product?.stock ?? '—'}</p>
              {item.blockedReason ? <p className="text-sm text-muted-foreground">{item.blockedReason}</p> : <div className="space-y-1.5">
                <Label htmlFor={`deliver-${item.id}`}>Entregar ahora ({item.product?.stockUnit})</Label>
                <Input id={`deliver-${item.id}`} type="number" min={1} max={Math.min(item.pending ?? 0, item.product?.stock ?? 0)} step={1}
                  disabled={(item.product?.stock ?? 0) < 1}
                  value={quantities[item.id] ?? ''} onChange={e => setQuantities(q => ({ ...q, [item.id]: e.target.value }))} placeholder="Sin entrega en esta ocasión" className="h-11" />
              </div>}
            </div>)}
          </> : <>
            <Label htmlFor="delivery-product-search">Buscar producto por nombre o SKU</Label>
            <Input id="delivery-product-search" value={search} onChange={e => setSearch(e.target.value)} maxLength={100} className="h-11" />
            <QueryFeedback loading={products.isLoading} error={products.isError} label="productos" onRetry={() => products.refetch()} />
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {products.data?.data.map(product => <div key={product.id} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                <div className="min-w-0 break-words"><p className="font-medium">{product.name} · {product.sku ?? 'Sin SKU'}</p><p>{product.content != null && product.unit ? `${product.content} ${product.unit} · ` : ''}{product.stockUnit ?? 'Unidad física sin validar'} · Stock {product.stockBalance?.currentQuantity ?? 0}</p>
                  {product.requiresPrescription && <p>Requiere receta vinculada</p>}</div>
                <Button type="button" variant="outline" disabled={product.requiresPrescription || !product.stockUnit || selected.length >= 50 || selected.some(p => p.id === product.id)} onClick={() => { setSelected(items => [...items, product]); setQuantities(q => ({ ...q, [product.id]: '1' })); }}>Agregar</Button>
              </div>)}
              {products.data?.meta.total === 0 && <p className="text-sm text-muted-foreground">Sin productos coincidentes.</p>}
              {(products.data?.meta.total ?? 0) > 30 && <p className="text-sm text-muted-foreground">Se muestran 30 resultados. Afina la búsqueda por nombre o SKU.</p>}
            </div>
            {selected.map(product => <div key={product.id} className="space-y-1.5 rounded-md border p-3">
              <Label htmlFor={`deliver-${product.id}`}>{product.name} · {product.sku ?? 'Sin SKU'} · cantidad de {product.stockUnit}</Label>
              <div className="flex gap-2"><Input id={`deliver-${product.id}`} type="number" required min={1} max={2147483647} step={1} value={quantities[product.id] ?? ''} onChange={e => setQuantities(q => ({ ...q, [product.id]: e.target.value }))} className="h-11" />
                <Button type="button" variant="outline" onClick={() => setSelected(items => items.filter(p => p.id !== product.id))}>Quitar</Button></div>
            </div>)}
          </>}
          {canConfirm && <Button type="submit" disabled={busy || !!pending || (prescriptionId ? !fulfillment.data : !selected.length)}>{busy ? 'Confirmando…' : 'Confirmar entrega'}</Button>}
        </fieldset>
      </form>
    </CardContent></Card>
    {canConfirm && <Card><CardHeader><CardTitle>Historial de entregas</CardTitle></CardHeader><CardContent className="space-y-3">
      <QueryFeedback loading={history.isLoading} error={history.isError} label="entregas" onRetry={() => history.refetch()} />
      {history.data?.data.map(row => <div key={row.id} className="space-y-2 rounded-md border p-3 text-sm">
        <p className="font-semibold">{row.kind === 'reversal' ? 'Reverso' : row.reversal ? 'Entrega revertida' : 'Entrega'} · {new Date(row.createdAt).toLocaleString('es-MX')}</p>
        {row.lines.map(line => <p key={line.id} className="break-words">{line.productName} · {line.productSku} · {line.presentation} · {line.quantity} {line.stockUnit}</p>)}
        {row.reason && <p className="break-words">Motivo: {row.reason}</p>}
        {canReverse && row.kind === 'delivery' && !row.reversal && <Button variant="outline" disabled={busy || !!pending} onClick={() => { setReverseRow(row); setReason(''); setPhysical(false); }}>Revertir entrega completa</Button>}
      </div>)}
      {history.data?.meta.total === 0 && <p className="text-sm text-muted-foreground">Sin entregas registradas.</p>}
      <div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button><Button variant="outline" disabled={page >= (history.data?.meta.totalPages ?? 0)} onClick={() => setPage(p => p + 1)}>Siguiente</Button></div>
    </CardContent></Card>}
    <Dialog open={!!reverseRow} onOpenChange={open => { if (!open && !busy && !pending) setReverseRow(null); }}>
      <DialogContent className="max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Revertir entrega completa</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (!reverseRow || !physical || pending) return; await execute({ operation: 'reverse', id: reverseRow.id, body: { reason: reason.trim(), physicalStockConfirmed: true } }); }}>
          {reverseRow?.lines.map(line => <p key={line.id} className="text-sm">{line.productName} · {line.quantity} {line.stockUnit}</p>)}
          <fieldset disabled={busy || !!pending} className="space-y-3"><Label htmlFor="delivery-reversal-reason">Motivo</Label><Input id="delivery-reversal-reason" value={reason} onChange={e => setReason(e.target.value)} required maxLength={500} className="h-11" />
            <label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" checked={physical} onChange={e => setPhysical(e.target.checked)} required />Confirmo que todos los envases están físicamente disponibles para reincorporarlos al stock.</label>
            <p className="text-sm text-muted-foreground">El original se conserva. Una cancelación administrativa sin disponibilidad física no puede reponer existencias.</p>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setReverseRow(null)}>Cancelar</Button><Button type="submit" disabled={!physical || !reason.trim()}>{busy ? 'Revirtiendo…' : 'Confirmar reverso'}</Button></div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
