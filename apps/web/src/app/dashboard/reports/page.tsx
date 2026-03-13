'use client';

import { useState } from 'react';
import { Users, Activity, CalendarRange } from 'lucide-react';
import {
  Card,
  CardContent,
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

  const pieData = (patientsReport?.byType || []).map((t) => ({
    name: TYPE_LABELS[t.type] || t.type || 'Sin tipo',
    value: t.count,
  }));

  const barData = [
    { name: 'Procedimientos', total: proceduresReport?.totalProcedures ?? 0 },
    { name: 'Prom. Folículos', total: proceduresReport?.averageFollicles ? Math.round(proceduresReport.averageFollicles) : 0 },
    { name: 'Total Folículos', total: proceduresReport?.totalFollicles ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reportes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Reportes y análisis del sistema</p>
      </div>

      {/* Date Range */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <CalendarRange className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-[160px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-[160px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patients Report */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Pacientes</h3>
            </div>
            {loadingPatients ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
            ) : patientsReport ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total pacientes</p>
                    <p className="text-2xl font-bold text-blue-700">{patientsReport.totalPatients.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Nuevos en periodo</p>
                    <p className="text-2xl font-bold text-emerald-700">{patientsReport.newPatients.toLocaleString()}</p>
                  </div>
                </div>

                {pieData.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Distribución por tipo</p>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
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
              <p className="text-sm text-muted-foreground py-8 text-center">Sin datos</p>
            )}
          </CardContent>
        </Card>

        {/* Procedures Report */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                <Activity className="h-4 w-4 text-violet-600" />
              </div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Procedimientos</h3>
            </div>
            {loadingProcedures ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
            ) : proceduresReport ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-violet-50 p-3">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase">Total</p>
                    <p className="text-xl font-bold text-violet-700">{proceduresReport.totalProcedures.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase">Prom. Folículos</p>
                    <p className="text-xl font-bold text-amber-700">
                      {proceduresReport.averageFollicles
                        ? Math.round(proceduresReport.averageFollicles).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase">Total Folículos</p>
                    <p className="text-xl font-bold text-emerald-700">
                      {proceduresReport.totalFollicles?.toLocaleString() ?? '—'}
                    </p>
                  </div>
                </div>

                {proceduresReport.totalProcedures > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Métricas</p>
                    <div className="h-[230px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
