import type { DeliveryRequest } from '@/hooks/use-deliveries';

export type DeliveryCommand = { key: string } & (
  { operation: 'confirm'; body: DeliveryRequest } |
  { operation: 'reverse'; id: string; body: { reason: string; physicalStockConfirmed: true } }
);
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function readDeliveryCommand(value: string | null): DeliveryCommand | null {
  if (!value) return null;
  let row;
  try { row = JSON.parse(value); }
  catch { throw Error('No se puede recuperar el intento pendiente. Conserva esta pestaña y solicita revisión de su resultado.'); }
  if (!row || !uuid(row.key) || !row.body) throw Error('No se puede recuperar el intento pendiente. Conserva esta pestaña y solicita revisión de su resultado.');
  if (row.operation === 'reverse' && uuid(row.id) && typeof row.body.reason === 'string' && row.body.reason.trim() && row.body.reason.length <= 500 && row.body.physicalStockConfirmed === true) return row;
  if (row.operation === 'confirm' && ['direct', 'prescription'].includes(row.body.source) && Array.isArray(row.body.lines) && row.body.lines.length > 0 && row.body.lines.length <= 50 &&
    (row.body.source === 'direct' ? !row.body.prescriptionId : uuid(row.body.prescriptionId)) && row.body.lines.every((line: DeliveryRequest['lines'][number]) =>
      line && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 2147483647 && (row.body.source === 'direct' ? uuid(line.productId) && !line.prescriptionItemId : uuid(line.prescriptionItemId) && !line.productId))) return row;
  throw Error('No se puede recuperar el intento pendiente. Conserva esta pestaña y solicita revisión de su resultado.');
}
