import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse } from './use-patients';

export interface Delivery {
  id: string; kind: 'delivery' | 'reversal'; source: 'prescription' | 'direct'; prescriptionId: string | null;
  reversalOfId: string | null; reversal: { id: string; createdAt: string } | null;
  reason: string | null; physicalStockConfirmed: boolean; createdAt: string; createdBy: string;
  lines: { id: string; productId: string; prescriptionItemId: string | null; quantity: number;
    stockMovementId: string; productName: string; productSku: string | null; presentation: string | null; stockUnit: string }[];
}
export interface Fulfillment {
  id: string; status: string; expiresAt: string | null;
  patient: { id: string; nombre: string; apellido: string };
  items: { id: string; medicineName: string; target: number | null; delivered: number; pending: number | null;
    hasDelivery: boolean; state: 'unknown' | 'pending' | 'partial' | 'delivered'; blockedReason: string | null;
    product: { id: string; name: string; sku: string | null; stockUnit: string | null; presentation: string | null; stock: number } | null }[];
}
export interface DeliveryRequest {
  source: 'direct' | 'prescription'; prescriptionId?: string;
  lines: { productId?: string; prescriptionItemId?: string; quantity: number }[];
}
export function useFulfillment(id?: string) {
  return useQuery<Fulfillment>({ queryKey: ['fulfillment', id], queryFn: () => api.get(`/prescriptions/${id}/fulfillment`), enabled: !!id });
}
export function useDeliveries(page = 1, prescriptionId?: string) {
  return useQuery<PaginatedResponse<Delivery>>({ queryKey: ['deliveries', page, prescriptionId], queryFn: () => api.get('/deliveries', { params: { page: String(page), ...(prescriptionId && { prescriptionId }) } }) });
}
export function useDeliveryPrescriptions(query: string) {
  return useQuery<{ id: string; prescriptionDate: string; status: string; patient: Fulfillment['patient'] }[]>({
    queryKey: ['delivery-prescriptions', query], queryFn: () => api.get('/deliveries/prescriptions', { params: { query } }), enabled: query.trim().length >= 2,
  });
}
export function useRefreshDeliveries() {
  const client = useQueryClient();
  return () => {
    for (const key of ['deliveries', 'fulfillment', 'inventory', 'product', 'products', 'prescription', 'prescriptions']) client.invalidateQueries({ queryKey: [key] });
  };
}
