'use client';

import { useState } from 'react';
import { Users, Activity } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePatientsReport, useProceduresReport } from '@/hooks/use-dashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#2563eb', '#16a34a', '#eab308', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

const TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  registered: 'Registrado',
  evaluation: 'Evaluación',
  active: 'Activo',
  inactive: 'Inactivo',
  archived: 'Archivado',
  '': 'Sin tipo',
};

function getDefaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = now.toISOString().split('T')[0];
  return { start, end };
}

export default function ReportsPage() {
  const defaults = getDefaultRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const { data: patientsReport, isLoading: loadingPatients } = usePatientsReport(startDate, endDate);
  const { data: proceduresReport, isLoading: loadingProcedures } = useProceduresReport(startDate, endDate);

  // Prepare chart data
  const pieData = (patientsReport?.byType || []).map((t) => ({
    name: TYPE_LABELS[t.type] || t.type || 'Sin tipo',
    value: t.count,
  }));

  const barData = [
    {
      name: 'Procedimientos',
      total: proceduresReport?.totalProcedures ?? 0,
    },
    {
      name: 'Promedio Folículos',
      total: proceduresReport?.averageFollicles ? Math.round(proceduresReport.averageFollicles) : 0,
    },
    {
      name: 'Total Folículos',
      total: proceduresReport?.totalFollicles ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
        <p className="text-muted-foreground">Reportes y análisis del sistema</p>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients Report */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPatients ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : patientsReport ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de pacientes</p>
                  <p className="text-3xl font-bold">{patientsReport.totalPatients.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nuevos en el periodo</p>
                  <p className="text-3xl font-bold">{patientsReport.newPatients.toLocaleString()}</p>
                </div>
              </div>

              {/* Pie Chart - Patients by Type */}
              {pieData.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Distribución por tipo</p>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {pieData.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      {/* Procedures Report */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Procedimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProcedures ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : proceduresReport ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total procedimientos</p>
                  <p className="text-3xl font-bold">{proceduresReport.totalProcedures.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Promedio folículos</p>
                  <p className="text-3xl font-bold">
                    {proceduresReport.averageFollicles
                      ? Math.round(proceduresReport.averageFollicles).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total folículos</p>
                  <p className="text-3xl font-bold">
                    {proceduresReport.totalFollicles?.toLocaleString() ?? '—'}
                  </p>
                </div>
              </div>

              {/* Bar Chart - Procedures metrics */}
              {proceduresReport.totalProcedures > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Métricas de procedimientos</p>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
