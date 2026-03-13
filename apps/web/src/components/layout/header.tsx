'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, User, LogOut, Settings, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { usePendingReminders } from '@/hooks/use-reminders';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/patients': 'Pacientes',
  '/dashboard/appointments': 'Citas',
  '/dashboard/prescriptions': 'Prescripciones',
  '/dashboard/inventory': 'Inventario',
  '/dashboard/reports': 'Reportes',
  '/dashboard/reminders': 'Recordatorios',
  '/dashboard/settings': 'Configuración',
  '/dashboard/profile': 'Mi Perfil',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const sortedPaths = Object.keys(pageTitles).sort(
    (a, b) => b.length - a.length,
  );
  for (const path of sortedPaths) {
    if (pathname.startsWith(path)) return pageTitles[path];
  }
  return 'Dashboard';
}

function getBreadcrumb(pathname: string): string | null {
  // Show parent section for sub-pages
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

  const initials = user
    ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()
    : '';

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Hamburger for mobile */}
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden -ml-1"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-1.5">
            {breadcrumb && (
              <>
                <span className="text-sm text-muted-foreground">{breadcrumb}</span>
                <span className="text-muted-foreground/40">/</span>
              </>
            )}
            <h1 className="text-sm font-semibold sm:text-base">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative rounded-full" asChild>
            <Link href="/dashboard/reminders">
              <Bell className="h-[18px] w-[18px]" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
          </Button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center gap-2 rounded-full p-1 pr-1 sm:pr-3 hover:bg-accent transition-colors"
              onClick={() => setShowMenu(!showMenu)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                <span className="text-[11px] font-bold text-white">{initials}</span>
              </div>
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                {user?.nombre}
              </span>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border bg-popover p-1 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                {user && (
                  <div className="px-3 py-3 mb-1">
                    <p className="text-sm font-semibold">{user.nombre} {user.apellido}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                )}
                <div className="border-t pt-1">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <User className="h-4 w-4 text-muted-foreground" /> Mi Perfil
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" /> Configuración
                  </Link>
                </div>
                <div className="border-t mt-1 pt-1">
                  <button
                    className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
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
