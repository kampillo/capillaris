'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Pill, Activity, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { usePatientsReport, useProceduresReport } from '@/hooks/use-dashboard';
import { useAppointments } from '@/hooks/use-appointments';
import { usePrescriptions } from '@/hooks/use-prescriptions';
import { useAuthStore } from '@/store/auth';

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateStr = d.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Hoy';
  if (dateStr === tomorrowStr) return 'Mañana';
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function DashboardPage() {
  const { start, end } = getMonthRange();
  const { user } = useAuthStore();

  const { data: patientsReport } = usePatientsReport();
  const { data: proceduresReport } = useProceduresReport(start, end);
  const { data: appointmentsData } = useAppointments(1, 100);
  const { data: prescriptionsData } = usePrescriptions(1, 1);

  const today = new Date().toISOString().split('T')[0];
  const allAppointments = appointmentsData?.data || [];
  const todayAppointments = allAppointments.filter(
    (a) => a.startDatetime.startsWith(today),
  );
  const upcomingAppointments = allAppointments
    .filter((a) => a.startDatetime >= new Date().toISOString() && a.status !== 'cancelled' && a.status !== 'completed')
    .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime))
    .slice(0, 5);

  const kpiCards = [
    {
      title: 'Total Pacientes',
      value: patientsReport?.totalPatients?.toLocaleString() ?? '—',
      change: patientsReport?.newPatients ? `+${patientsReport.newPatients} este mes` : undefined,
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      href: '/dashboard/patients',
    },
    {
      title: 'Citas Hoy',
      value: appointmentsData ? String(todayAppointments.length) : '—',
      change: `${appointmentsData?.meta?.total ?? 0} totales`,
      icon: Calendar,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      href: '/dashboard/appointments',
    },
    {
      title: 'Prescripciones',
      value: prescriptionsData?.meta?.total?.toLocaleString() ?? '—',
      change: 'Registradas',
      icon: Pill,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      href: '/dashboard/prescriptions',
    },
    {
      title: 'Procedimientos',
      value: proceduresReport?.totalProcedures?.toLocaleString() ?? '—',
      change: proceduresReport?.averageFollicles
        ? `Prom. ${Math.round(proceduresReport.averageFollicles)} folículos`
        : 'Este mes',
      icon: Activity,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      href: '/dashboard/reports',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {getGreeting()}, {user?.nombre || 'Doctor'}
        </h2>
        <p className="mt-1 text-muted-foreground">
          Aquí tienes el resumen de hoy, {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                    {card.change && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {card.change}
                      </p>
                    )}
                  </div>
                  <div className={`rounded-xl p-2.5 ${card.iconBg} group-hover:scale-110 transition-transform`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Upcoming Appointments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Próximas Citas</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/dashboard/appointments">
                Ver todas <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay citas próximas
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appt) => {
                  const statusClass = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;
                  return (
                    <div
                      key={appt.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                    >
                      <div className={`rounded-lg border px-2 py-1 text-center ${statusClass}`}>
                        <p className="text-[10px] font-medium leading-tight">
                          {formatRelativeDate(appt.startDatetime)}
                        </p>
                        <p className="text-sm font-bold">{formatTime(appt.startDatetime)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {appt.patient ? `${appt.patient.nombre} ${appt.patient.apellido}` : 'Sin paciente'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {appt.doctor ? `Dr. ${appt.doctor.nombre} ${appt.doctor.apellido}` : ''}
                          {appt.title ? ` — ${appt.title}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Resumen del Mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Pacientes nuevos</p>
                  <p className="text-xs text-muted-foreground">Este mes</p>
                </div>
              </div>
              <span className="text-xl font-bold text-blue-700">
                {patientsReport?.newPatients ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">Citas de hoy</p>
                  <p className="text-xs text-muted-foreground">
                    {todayAppointments.filter(a => a.status === 'confirmed').length} confirmadas
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-emerald-700">
                {todayAppointments.length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-violet-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-violet-600" />
                <div>
                  <p className="text-sm font-medium">Procedimientos</p>
                  <p className="text-xs text-muted-foreground">Este mes</p>
                </div>
              </div>
              <span className="text-xl font-bold text-violet-700">
                {proceduresReport?.totalProcedures ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Pill className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">Prescripciones</p>
                  <p className="text-xs text-muted-foreground">Total registradas</p>
                </div>
              </div>
              <span className="text-xl font-bold text-amber-700">
                {prescriptionsData?.meta?.total ?? '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
