 'use client';
import { useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(state => state.user);
  const scope = user ? `${user.id}:${[...(user.roles ?? [])].sort().join(',')}` : 'anonymous';
  // Switching accounts or roles uses a fresh cache before any protected page renders.
  const queryClient = useMemo(() => makeQueryClient(scope), [scope]);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
