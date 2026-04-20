'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowRight, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useGoogleCalendarStatus,
  useGoogleCalendarConnect,
  useGoogleCalendarDisconnect,
} from '@/hooks/use-google-calendar';

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
  const searchParams = useSearchParams();
  const googleConnected = searchParams.get('google') === 'connected';
  const { data: googleStatus, isLoading: statusLoading } = useGoogleCalendarStatus();
  const connectMutation = useGoogleCalendarConnect();
  const disconnectMutation = useGoogleCalendarDisconnect();

  useEffect(() => {
    if (googleConnected) {
      // Clean up the URL query param
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, [googleConnected]);

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

        {/* Google Calendar Integration */}
        <Card className="shadow-sm h-full">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Google Calendar</h3>
                {statusLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : googleStatus?.connected ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] px-1.5 py-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sincronizar citas con Google Calendar
              </p>
            </div>
            {statusLoading ? null : googleStatus?.connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="text-xs"
              >
                {disconnectMutation.isPending ? 'Desconectando...' : 'Desconectar'}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="text-xs"
              >
                {connectMutation.isPending ? 'Conectando...' : 'Conectar'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
