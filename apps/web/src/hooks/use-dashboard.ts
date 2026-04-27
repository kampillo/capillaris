import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface PatientsReport {
  totalPatients: number;
  newPatients: number;
  previousNewPatients: number | null;
  newPatientsDelta: number | null;
  byType: { type: string; count: number }[];
  monthlySeries: { month: string; count: number }[];
}

interface ProceduresReport {
  totalProcedures: number;
  previousTotal: number | null;
  proceduresDelta: number | null;
  averageFollicles: number | null;
  totalFollicles: number | null;
  byDoctor: { name: string; count: number }[];
}

interface AppointmentsReport {
  total: number;
  previousTotal: number | null;
  totalDelta: number | null;
  byStatus: Record<string, number>;
  noShowRate: number;
  completedRate: number;
  cancelledRate: number;
}

interface PrescriptionsReport {
  total: number;
  previousTotal: number | null;
  totalDelta: number | null;
  byStatus: Record<string, number>;
  totalActive: number;
}

interface InventoryReport {
  lowStockCount: number;
  totalProducts: number;
  topMovedProducts: { productId: string; name: string; movements: number; units: number }[];
}

interface SourcesReport {
  byChannel: { channel: string; count: number }[];
  conversionRate: number;
  totalLeads: number;
  totalActive: number;
}

interface ClinicalReport {
  consultations: number;
  previousConsultations: number | null;
  consultationsDelta: number | null;
  variantsDistribution: { name: string; count: number }[];
  topDonorZones: { name: string; count: number }[];
}

function buildParams(startDate?: string, endDate?: string) {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return params;
}

const STALE = 60 * 1000;

export function usePatientsReport(startDate?: string, endDate?: string) {
  return useQuery<PatientsReport>({
    queryKey: ['reports', 'patients', startDate, endDate],
    queryFn: () => api.get('/reports/patients', { params: buildParams(startDate, endDate) }),
    staleTime: STALE,
  });
}

export function useProceduresReport(startDate?: string, endDate?: string) {
  return useQuery<ProceduresReport>({
    queryKey: ['reports', 'procedures', startDate, endDate],
    queryFn: () => api.get('/reports/procedures', { params: buildParams(startDate, endDate) }),
    staleTime: STALE,
  });
}

export function useAppointmentsReport(startDate?: string, endDate?: string) {
  return useQuery<AppointmentsReport>({
    queryKey: ['reports', 'appointments', startDate, endDate],
    queryFn: () => api.get('/reports/appointments', { params: buildParams(startDate, endDate) }),
    staleTime: STALE,
  });
}

export function usePrescriptionsReport(startDate?: string, endDate?: string) {
  return useQuery<PrescriptionsReport>({
    queryKey: ['reports', 'prescriptions', startDate, endDate],
    queryFn: () => api.get('/reports/prescriptions', { params: buildParams(startDate, endDate) }),
    staleTime: STALE,
  });
}

export function useInventoryReport(startDate?: string, endDate?: string) {
  return useQuery<InventoryReport>({
    queryKey: ['reports', 'inventory', startDate, endDate],
    queryFn: () => api.get('/reports/inventory', { params: buildParams(startDate, endDate) }),
    staleTime: STALE,
  });
}

export function useSourcesReport(startDate?: string, endDate?: string) {
  return useQuery<SourcesReport>({
    queryKey: ['reports', 'sources', startDate, endDate],
    queryFn: () => api.get('/reports/sources', { params: buildParams(startDate, endDate) }),
    staleTime: STALE,
  });
}

export function useClinicalReport(startDate?: string, endDate?: string) {
  return useQuery<ClinicalReport>({
    queryKey: ['reports', 'clinical', startDate, endDate],
    queryFn: () => api.get('/reports/clinical', { params: buildParams(startDate, endDate) }),
    staleTime: STALE,
  });
}
