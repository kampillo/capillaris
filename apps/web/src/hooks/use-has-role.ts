import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import type { RoleName } from '@/lib/roles';

export function useHasRole(...allowed: RoleName[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user?.roles?.length) return false;
  return user.roles.some((r) => allowed.includes(r as RoleName));
}

export function useUserRoles(): string[] {
  return useAuthStore((s) => s.user?.roles ?? []);
}

/**
 * Page-level guard: redirects to /dashboard if the current user lacks any of
 * the allowed roles. Returns true while authorized so the page can render.
 */
export function useRequireRole(...allowed: RoleName[]): boolean {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authorized = !!user?.roles?.some((r) => allowed.includes(r as RoleName));

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!authorized) router.replace('/dashboard');
  }, [isAuthenticated, authorized, router]);

  return authorized;
}
