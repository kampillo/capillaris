'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, User, LogOut, Settings, Menu, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { usePendingReminders } from '@/hooks/use-reminders';
import { Avatar } from '@/components/clinic/avatar';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/dashboard/patients': 'Pacientes',
  '/dashboard/appointments': 'Agenda',
  '/dashboard/prescriptions': 'Prescripciones',
  '/dashboard/inventory': 'Inventario',
  '/dashboard/reports': 'Reportes',
  '/dashboard/reminders': 'Recordatorios',
  '/dashboard/settings': 'Configuración',
  '/dashboard/profile': 'Mi Perfil',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const sortedPaths = Object.keys(pageTitles).sort((a, b) => b.length - a.length);
  for (const path of sortedPaths) {
    if (pathname.startsWith(path)) return pageTitles[path];
  }
  return 'Inicio';
}

function getBreadcrumb(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 2) {
    const parentPath = '/' + parts.slice(0, 2).join('/');
    return pageTitles[parentPath] || null;
  }
  return null;
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = getPageTitle(pathname);
  const breadcrumb = getBreadcrumb(pathname);
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: pendingReminders } = usePendingReminders();

  const pendingCount = pendingReminders?.length ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border',
        'bg-background/85 backdrop-blur-md',
      )}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-7">
        <div className="flex min-w-0 items-center gap-2.5">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="flex rounded p-1.5 text-foreground lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex min-w-0 flex-col">
            {breadcrumb && breadcrumb !== title && (
              <div className="flex items-center gap-1.5 text-[11px] tracking-wide text-text-tertiary">
                <span>{breadcrumb}</span>
                <ChevronRight className="h-2.5 w-2.5" />
              </div>
            )}
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Notifications */}
          <Link
            href="/dashboard/reminders"
            aria-label="Recordatorios"
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-text-secondary transition',
              'hover:bg-surface-3 hover:text-foreground',
            )}
          >
            <Bell className="h-[17px] w-[17px]" />
            {pendingCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-semibold text-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center gap-2 rounded-full p-1 pr-1 transition-colors hover:bg-surface-2 sm:pr-3"
              onClick={() => setShowMenu(!showMenu)}
            >
              {user && (
                <Avatar
                  name={`${user.nombre} ${user.apellido}`}
                  size={32}
                />
              )}
              <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
                {user?.nombre}
              </span>
            </button>

            {showMenu && (
              <div className="animate-scale-in absolute right-0 z-50 mt-2 w-60 rounded-xl border border-border bg-popover p-1 shadow-lg">
                {user && (
                  <div className="mb-1 px-3 py-3">
                    <p className="text-sm font-semibold">
                      {user.nombre} {user.apellido}
                    </p>
                    <p className="text-xs text-text-secondary">{user.email}</p>
                  </div>
                )}
                <div className="border-t border-border pt-1">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-2"
                    onClick={() => setShowMenu(false)}
                  >
                    <User className="h-4 w-4 text-text-secondary" /> Mi Perfil
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-2"
                    onClick={() => setShowMenu(false)}
                  >
                    <Settings className="h-4 w-4 text-text-secondary" /> Configuración
                  </Link>
                </div>
                <div className="mt-1 border-t border-border pt-1">
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" /> Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
