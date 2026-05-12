import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  } | null;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface AuditLogFilters {
  userId?: string;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
  });
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery<AuditLogListResponse>({
    queryKey: ['audit-logs', filters],
    queryFn: () => api.get(`/audit-logs${buildQuery(filters)}`),
  });
}

export interface AuditFacets {
  actions: string[];
  entityTypes: string[];
}

export function useAuditFacets() {
  return useQuery<AuditFacets>({
    queryKey: ['audit-logs', 'facets'],
    queryFn: () => api.get('/audit-logs/facets'),
    staleTime: 5 * 60 * 1000,
  });
}
