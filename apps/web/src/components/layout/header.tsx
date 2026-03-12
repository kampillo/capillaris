'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, User, LogOut, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/auth';

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

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = getPageTitle(pathname);
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-40 bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {/* Hamburger for mobile */}
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          )}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/dashboard/reminders">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notificaciones</span>
            </Link>
          </Button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setShowMenu(!showMenu)}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                {initials ? (
                  <span className="text-xs font-bold text-primary">{initials}</span>
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
            </Button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow-lg z-50">
                {user && (
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium">{user.nombre} {user.apellido}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                )}
                <div className="py-1">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => setShowMenu(false)}
                  >
                    <User className="h-4 w-4" /> Mi Perfil
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => setShowMenu(false)}
                  >
                    <Settings className="h-4 w-4" /> Configuración
                  </Link>
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-accent"
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
      <Separator />
    </header>
  );
}
