'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Calendar,
  Pill,
  Package,
  BarChart3,
  Bell,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Pacientes', href: '/dashboard/patients', icon: Users },
  { name: 'Citas', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Prescripciones', href: '/dashboard/prescriptions', icon: Pill },
  { name: 'Inventario', href: '/dashboard/inventory', icon: Package },
  { name: 'Reportes', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Recordatorios', href: '/dashboard/reminders', icon: Bell },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
];

function NavItems({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <ul role="list" className="flex flex-1 flex-col gap-y-1">
      {navigation.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));

        return (
          <li key={item.name}>
            <Link
              href={item.href}
              onClick={onClick}
              className={cn(
                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">C</span>
          </div>
          <span className="text-xl font-bold">Capillaris</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <NavItems onClick={onClose} />
      </nav>
    </div>
  );
}

// Mobile sidebar with overlay
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Close on route change
  const pathname = usePathname();
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 lg:hidden"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col lg:hidden animate-in slide-in-from-left duration-200">
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}

// Desktop sidebar (unchanged behavior)
export function Sidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <SidebarContent />
    </aside>
  );
}
