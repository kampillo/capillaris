'use client';

import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

const settingsLinks = [
  {
    title: 'Gestión de Usuarios',
    description: 'Administrar usuarios, roles y permisos del sistema',
    href: '/dashboard/settings/users',
    icon: Users,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configuración general del sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md transition-all cursor-pointer group shadow-sm h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconBg} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
