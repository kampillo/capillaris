import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface PatientsReport {
  totalPatients: number;
  newPatients: number;
  byType: { type: string; count: number }[];
}

interface ProceduresReport {
  totalProcedures: number;
  averageFollicles: number | null;
  totalFollicles: number | null;
}

export function usePatientsReport(startDate?: string, endDate?: string) {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  return useQuery<PatientsReport>({
    queryKey: ['reports', 'patients', startDate, endDate],
    queryFn: () => api.get('/reports/patients', { params }),
    staleTime: 60 * 1000,
  });
}

export function useProceduresReport(startDate?: string, endDate?: string) {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  return useQuery<ProceduresReport>({
    queryKey: ['reports', 'procedures', startDate, endDate],
    queryFn: () => api.get('/reports/procedures', { params }),
    staleTime: 60 * 1000,
  });
}
