import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse } from './use-patients';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  title?: string;
  description?: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes?: number;
  status: string;
  cancellationReason?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; nombre: string; apellido: string; celular?: string };
  doctor?: { id: string; nombre: string; apellido: string };
}

export interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  title?: string;
  description?: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes?: number;
  status?: string;
}

export type UpdateAppointmentData = Partial<CreateAppointmentData>;

export function useAppointments(page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<Appointment>>({
    queryKey: ['appointments', page, pageSize],
    queryFn: () =>
      api.get('/appointments', {
        params: { page: String(page), pageSize: String(pageSize) },
      }),
  });
}

export function useAppointment(id: string) {
  return useQuery<Appointment>({
    queryKey: ['appointment', id],
    queryFn: () => api.get(`/appointments/${id}`),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointmentData) =>
      api.post<Appointment>('/appointments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentData }) =>
      api.put<Appointment>(`/appointments/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.id] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
