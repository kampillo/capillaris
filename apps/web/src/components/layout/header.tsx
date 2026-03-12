'use client';

import { usePathname } from 'next/navigation';
import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/patients': 'Pacientes',
  '/dashboard/appointments': 'Citas',
  '/dashboard/prescriptions': 'Prescripciones',
  '/dashboard/inventory': 'Inventario',
  '/dashboard/reports': 'Reportes',
  '/dashboard/reminders': 'Recordatorios',
  '/dashboard/settings': 'Configuración',
};

function getPageTitle(pathname: string): string {
  // Check for exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];

  // Check for partial matches (longest match wins)
  const sortedPaths = Object.keys(pageTitles).sort(
    (a, b) => b.length - a.length,
  );
  for (const path of sortedPaths) {
    if (pathname.startsWith(path)) return pageTitles[path];
  }

  return 'Dashboard';
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <h1 className="text-lg font-semibold">{title}</h1>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notificaciones</span>
          </Button>

          {/* User avatar / dropdown placeholder */}
          <Button variant="ghost" size="icon" className="rounded-full">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="sr-only">Menu de usuario</span>
          </Button>
        </div>
      </div>
      <Separator />
    </header>
  );
}
