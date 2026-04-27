import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse } from './use-patients';

export interface PrescriptionItem {
  id: string;
  productId?: string;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  quantity: number;
  instructions?: string;
  requiresRefill: boolean;
  dispensed: boolean;
  product?: {
    id: string;
    name: string;
    unit?: string;
    content?: number;
  };
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  prescriptionDate: string;
  notas?: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; nombre: string; apellido: string; celular?: string };
  doctor?: { id: string; nombre: string; apellido: string };
  items: PrescriptionItem[];
}

export interface CreatePrescriptionItemData {
  productId?: string;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  quantity?: number;
  instructions?: string;
  requiresRefill?: boolean;
}

export interface CreatePrescriptionData {
  patientId: string;
  doctorId: string;
  prescriptionDate: string;
  notas?: string;
  status?: string;
  expiresAt?: string;
  items?: CreatePrescriptionItemData[];
}

export type UpdatePrescriptionData = Partial<CreatePrescriptionData>;

export function usePrescriptions(page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<Prescription>>({
    queryKey: ['prescriptions', page, pageSize],
    queryFn: () =>
      api.get('/prescriptions', {
        params: { page: String(page), pageSize: String(pageSize) },
      }),
  });
}

export function usePrescription(id: string) {
  return useQuery<Prescription>({
    queryKey: ['prescription', id],
    queryFn: () => api.get(`/prescriptions/${id}`),
    enabled: !!id,
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePrescriptionData) =>
      api.post<Prescription>('/prescriptions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}

export function useUpdatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePrescriptionData }) =>
      api.put<Prescription>(`/prescriptions/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription', variables.id] });
    },
  });
}

export function useDeletePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/prescriptions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}
