import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles'),
    staleTime: 5 * 60 * 1000,
  });
}
