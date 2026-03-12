'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Calendar, Pill, Activity } from 'lucide-react';
import { usePatientsReport, useProceduresReport } from '@/hooks/use-dashboard';
import { useAppointments } from '@/hooks/use-appointments';
import { usePrescriptions } from '@/hooks/use-prescriptions';

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

export default function DashboardPage() {
  const { start, end } = getMonthRange();

  const { data: patientsReport } = usePatientsReport();
  const { data: proceduresReport } = useProceduresReport(start, end);
  const { data: appointmentsData } = useAppointments(1, 100);
  const { data: prescriptionsData } = usePrescriptions(1, 1);

  // Count today's appointments
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = (appointmentsData?.data || []).filter(
    (a) => a.startDatetime.startsWith(today),
  ).length;

  const kpiCards = [
    {
      title: 'Total Pacientes',
      value: patientsReport?.totalPatients?.toLocaleString() ?? '—',
      description: `${patientsReport?.newPatients ?? 0} nuevos este mes`,
      icon: Users,
    },
    {
      title: 'Citas Hoy',
      value: appointmentsData ? String(todayAppointments) : '—',
      description: `${appointmentsData?.meta?.total ?? 0} citas totales`,
      icon: Calendar,
    },
    {
      title: 'Prescripciones',
      value: prescriptionsData?.meta?.total?.toLocaleString() ?? '—',
      description: 'Prescripciones registradas',
      icon: Pill,
    },
    {
      title: 'Procedimientos del Mes',
      value: proceduresReport?.totalProcedures?.toLocaleString() ?? '—',
      description: proceduresReport?.averageFollicles
        ? `Promedio: ${Math.round(proceduresReport.averageFollicles)} folículos`
        : 'Procedimientos realizados',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Resumen general del sistema
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
