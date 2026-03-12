'use client';

import Link from 'next/link';
import { Users, Settings2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

const settingsLinks = [
  {
    title: 'Gestión de Usuarios',
    description: 'Administrar usuarios, roles y permisos del sistema',
    href: '/dashboard/settings/users',
    icon: Users,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">Configuración general del sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
