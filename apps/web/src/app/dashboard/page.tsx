import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Calendar, Pill, Activity } from 'lucide-react';

const kpiCards = [
  {
    title: 'Total Pacientes',
    value: '—',
    description: 'Pacientes registrados',
    icon: Users,
  },
  {
    title: 'Citas Hoy',
    value: '—',
    description: 'Citas programadas para hoy',
    icon: Calendar,
  },
  {
    title: 'Prescripciones',
    value: '—',
    description: 'Prescripciones activas',
    icon: Pill,
  },
  {
    title: 'Consultas del Mes',
    value: '—',
    description: 'Consultas realizadas este mes',
    icon: Activity,
  },
];

export default function DashboardPage() {
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

      {/* TODO: Add recent activity, upcoming appointments, etc. */}
    </div>
  );
}
