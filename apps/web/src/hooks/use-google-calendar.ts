import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface GoogleStatus {
  connected: boolean;
}

interface GoogleAuthUrl {
  url: string;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  source: 'google';
  htmlLink: string | null;
}

export function useGoogleCalendarStatus() {
  return useQuery<GoogleStatus>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get('/google/status'),
  });
}

export function useGoogleCalendarConnect() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await api.get<GoogleAuthUrl>('/google/auth');
      window.location.href = url;
    },
  });
}

export function useGoogleCalendarEvents(timeMin: string, timeMax: string, enabled = true) {
  return useQuery<GoogleCalendarEvent[]>({
    queryKey: ['google-calendar-events', timeMin, timeMax],
    queryFn: () =>
      api.get('/google/events', {
        params: { timeMin, timeMax },
      }),
    enabled,
    staleTime: 60_000,
  });
}

export function useGoogleCalendarDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/google/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
    },
  });
}
