import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse } from './use-patients';

export interface Reminder {
  id: string;
  patientId: string;
  reminderType: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  scheduledFor: string;
  channel: string;
  status: string;
  sentAt?: string;
  errorMessage?: string;
  messageTemplate?: string;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; nombre: string; apellido: string; celular?: string };
}

export interface CreateReminderData {
  patientId: string;
  reminderType: string;
  scheduledFor: string;
  channel?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  messageTemplate?: string;
  messageVariables?: Record<string, unknown>;
}

export function useReminders(page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<Reminder>>({
    queryKey: ['reminders', page, pageSize],
    queryFn: () =>
      api.get('/reminders', {
        params: { page: String(page), pageSize: String(pageSize) },
      }),
  });
}

export function usePendingReminders() {
  return useQuery<Reminder[]>({
    queryKey: ['reminders', 'pending'],
    queryFn: () => api.get('/reminders/pending'),
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReminderData) =>
      api.post<Reminder>('/reminders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; sentAt?: string; errorMessage?: string } }) =>
      api.put<Reminder>(`/reminders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useCancelReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}
