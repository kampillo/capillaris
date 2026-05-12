'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  Calendar,
  Package,
  BarChart3,
  Bell,
  Settings,
  Search,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { usePendingReminders } from '@/hooks/use-reminders';
import { api } from '@/lib/api';
import { Avatar } from '@/components/clinic/avatar';
import { CapillarisLogo } from './capillaris-logo';
import type { RoleName } from '@/lib/roles';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: RoleName[];
};

type NavGroup = {
  section: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard', label: 'Inicio', icon: Home },
      { href: '/dashboard/patients', label: 'Pacientes', icon: Users },
      { href: '/dashboard/appointments', label: 'Agenda', icon: Calendar },
    ],
  },
  {
    section: 'Gestión',
    items: [
      { href: '/dashboard/inventory', label: 'Inventario', icon: Package },
      {
        href: '/dashboard/reports',
        label: 'Reportes',
        icon: BarChart3,
        roles: ['admin', 'doctor', 'inventory_manager'],
      },
    ],
  },
  {
    section: 'Sistema',
    items: [
      {
        href: '/dashboard/reminders',
        label: 'Recordatorios',
        icon: Bell,
        roles: ['admin', 'doctor', 'receptionist'],
      },
      {
        href: '/dashboard/settings',
        label: 'Configuración',
        icon: Settings,
        roles: ['admin'],
      },
    ],
  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { data: pendingReminders } = usePendingReminders();
  const pendingCount = pendingReminders?.length ?? 0;

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const handleLogout = async () => {
    try {
      // Audit the logout server-side before clearing the token locally.
      await api.post('/auth/logout', {});
    } catch {
      // Network/expired token — proceed with local logout anyway.
    }
    logout();
    router.push('/login');
  };

  return (
    <div
      className="flex h-full w-full flex-col bg-sidebar text-sidebar-fg"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 0%, hsl(var(--sidebar-active-border) / 0.12) 0%, transparent 50%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Link href="/dashboard" onClick={onClose}>
          <CapillarisLogo />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-sidebar-fg transition hover:bg-white/5 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search shortcut */}
      <SidebarSearch onNavigate={onClose} />

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-3 pt-1">
        {NAV.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.roles || item.roles.some((r) => user?.roles?.includes(r)),
          );
          if (visibleItems.length === 0) return null;
          return (
          <div key={group.section} className="mb-4">
            <div className="px-3.5 pb-2 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-fg-muted">
              {group.section}
            </div>
            {visibleItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const showDot = item.href === '/dashboard/reminders' && pendingCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'mb-0.5 flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm transition-all',
                    active
                      ? 'border-sidebar-active bg-white/[0.08] pl-2.5 font-medium text-white'
                      : 'border-transparent text-sidebar-fg hover:bg-white/[0.04] hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {showDot && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-semibold tabular-nums text-white">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
            <Avatar name={`${user.nombre} ${user.apellido}`} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-white">
                {user.nombre} {user.apellido}
              </div>
              <div className="truncate text-[11px] text-sidebar-fg-muted">
                {user.email}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded p-1.5 text-sidebar-fg transition hover:bg-white/5"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    const target = q
      ? `/dashboard/patients?query=${encodeURIComponent(q)}`
      : '/dashboard/patients';
    router.push(target);
    setValue('');
    onNavigate?.();
  };

  return (
    <form onSubmit={handleSubmit} className="px-3.5 pb-3">
      <div className="flex w-full items-center gap-2.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-sidebar-fg transition focus-within:bg-white/10 hover:bg-white/10">
        <Search className="h-3.5 w-3.5 shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar paciente…"
          className="flex-1 bg-transparent text-sm text-sidebar-fg outline-none placeholder:text-sidebar-fg-muted"
        />
      </div>
    </form>
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
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
        onClick={onClose}
      />
      <aside className="animate-slide-in fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col lg:hidden">
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}

// Desktop sidebar
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col lg:flex print:hidden">
      <SidebarContent />
    </aside>
  );
}
