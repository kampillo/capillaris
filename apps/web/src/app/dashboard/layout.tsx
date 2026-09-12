'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore, type AuthUser } from '@/store/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { isAuthenticated, hydrate, user, logout, refreshUser } = useAuthStore();
  const isNurse = !!user?.roles?.includes('nurse');
  const nursePage = /^\/dashboard\/nursing(?:\/[a-f0-9-]+)?$/.test(pathname);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = useQuery<AuthUser>({ queryKey: ['auth-profile', user?.id], queryFn: () => api.get('/auth/me'), enabled: ready && isAuthenticated, retry: false, refetchInterval: 30000, staleTime: 0 });
  const rolesMatch = !!profile.data && JSON.stringify(profile.data.roles) === JSON.stringify(user?.roles);

  useEffect(() => {
    if (profile.isFetchedAfterMount && profile.data && !rolesMatch) {
      queryClient.removeQueries({ predicate: query => query.queryKey[0] !== 'auth-profile' });
      refreshUser(profile.data);
    }
  }, [profile.isFetchedAfterMount, profile.data, rolesMatch, refreshUser, queryClient]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace('/login');
    }
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    if (ready && isAuthenticated && isNurse && !nursePage) router.replace('/dashboard/nursing');
  }, [ready, isAuthenticated, isNurse, nursePage, router]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary">Cargando...</p>
      </div>
    );
  }

  if (profile.isError) return <div role="alert" className="p-6">No pudimos verificar tus permisos. <button className="underline" onClick={() => profile.refetch()}>Reintentar</button></div>;
  if (!profile.isFetchedAfterMount || !rolesMatch) return <p className="p-6">Verificando acceso…</p>;

  if (isNurse) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <Link href="/dashboard/nursing" className="font-semibold">Capillaris · Mis pacientes</Link>
          <div className="flex items-center gap-4"><span>{user?.nombre} {user?.apellido} · Enfermería</span>
            <button className="min-h-11 underline" onClick={async () => {
              try { await api.post('/auth/logout', {}); } finally { queryClient.clear(); logout(); router.replace('/login'); }
            }}>Cerrar sesión</button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4 sm:p-6">{nursePage ? children : <p>Abriendo mis pacientes…</p>}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={closeMobile} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1480px] px-4 pb-12 pt-6 sm:px-6 lg:px-7 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
