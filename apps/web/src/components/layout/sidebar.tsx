'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Pacientes', href: '/dashboard/patients', icon: Users },
  { name: 'Citas', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Prescripciones', href: '/dashboard/prescriptions', icon: Pill },
];

const manageNav = [
  { name: 'Inventario', href: '/dashboard/inventory', icon: Package },
  { name: 'Reportes', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Recordatorios', href: '/dashboard/reminders', icon: Bell },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
];

function NavItem({ item, onClick }: { item: typeof mainNav[0]; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(item.href));

  return (
    <li>
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))] shadow-md shadow-blue-500/20'
            : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-white',
        )}
      >
        <item.icon
          className={cn(
            'h-[18px] w-[18px] shrink-0 transition-colors',
            isActive ? 'text-white' : 'text-[hsl(var(--sidebar-foreground))] group-hover:text-white',
          )}
        />
        {item.name}
      </Link>
    </li>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user
    ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()
    : '';

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--sidebar))]">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--sidebar-active))] shadow-lg shadow-blue-500/30">
            <span className="text-base font-bold text-white">C</span>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Capillaris</span>
        </Link>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden text-[hsl(var(--sidebar-foreground))] hover:text-white hover:bg-[hsl(var(--sidebar-hover))]"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 px-3 py-4 overflow-y-auto">
        {/* Main */}
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--sidebar-foreground))]/50">
            Principal
          </p>
          <ul className="space-y-1">
            {mainNav.map((item) => (
              <NavItem key={item.href} item={item} onClick={onClose} />
            ))}
          </ul>
        </div>

        {/* Manage */}
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--sidebar-foreground))]/50">
            Gestión
          </p>
          <ul className="space-y-1">
            {manageNav.map((item) => (
              <NavItem key={item.href} item={item} onClick={onClose} />
            ))}
          </ul>
        </div>
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {user.nombre} {user.apellido}
              </p>
              <p className="truncate text-xs text-[hsl(var(--sidebar-foreground))]/70">
                {user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-md p-1.5 text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-white transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile sidebar with overlay
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col lg:hidden animate-in slide-in-from-left duration-200">
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}

// Desktop sidebar
export function Sidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[272px] lg:flex-col">
      <SidebarContent />
    </aside>
  );
}
