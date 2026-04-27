'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Users,
  Activity,
  CalendarRange,
  TrendingUp,
  Scissors,
  Target,
  UserPlus,
  Calendar,
  AlertTriangle,
  Pill,
  Stethoscope,
  Sparkles,
  Boxes,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Segmented } from '@/components/clinic/segmented';
import { KpiCard } from '@/components/reports/kpi-card';
import { ChartCard } from '@/components/reports/chart-card';
import {
  usePatientsReport,
  useProceduresReport,
  useAppointmentsReport,
  usePrescriptionsReport,
  useInventoryReport,
  useSourcesReport,
  useClinicalReport,
} from '@/hooks/use-dashboard';

type Preset = 'month' | '30d' | 'quarter' | 'year' | 'custom';

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function startOfQuarter() {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  d.setMonth(q * 3, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}
function startOfYear() {
  const d = new Date();
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}
function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function formatRange(start: string, end: string) {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} → ${e.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

const PATIENT_TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  registered: 'Registrado',
  evaluation: 'Evaluación',
  active: 'Activo',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

const CHANNEL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  web: 'Sitio web',
  google: 'Google',
  referido: 'Referido',
  otro: 'Otro',
  sin_canal: 'Sin canal',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
  rescheduled: 'Reprogramada',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#6b7280',
  confirmed: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
  no_show: '#f59e0b',
  rescheduled: '#a855f7',
};

const PIE_PALETTE = ['#2C7E69', '#7A6B9F', '#4A6B8F', '#B8763A', '#B84545', '#10b981', '#a855f7', '#6b7280'];

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('month');
  const [startDate, setStartDate] = useState(startOfMonth());
  const [endDate, setEndDate] = useState(todayISO());

  useEffect(() => {
    if (preset === 'custom') return;
    const today = todayISO();
    setEndDate(today);
    if (preset === 'month') setStartDate(startOfMonth());
    else if (preset === '30d') setStartDate(daysAgo(30));
    else if (preset === 'quarter') setStartDate(startOfQuarter());
    else if (preset === 'year') setStartDate(startOfYear());
  }, [preset]);

  const { data: patientsRpt } = usePatientsReport(startDate, endDate);
  const { data: proceduresRpt } = useProceduresReport(startDate, endDate);
  const { data: appointmentsRpt } = useAppointmentsReport(startDate, endDate);
  const { data: prescriptionsRpt } = usePrescriptionsReport(startDate, endDate);
  const { data: inventoryRpt } = useInventoryReport(startDate, endDate);
  const { data: sourcesRpt } = useSourcesReport(startDate, endDate);
  const { data: clinicalRpt } = useClinicalReport(startDate, endDate);

  // Pie data: patient types
  const patientTypeData = useMemo(
    () =>
      (patientsRpt?.byType ?? []).map((t) => ({
        name: PATIENT_TYPE_LABELS[t.type] ?? t.type,
        value: t.count,
      })),
    [patientsRpt],
  );

  // Bar data: appointments by status
  const appointmentsBarData = useMemo(() => {
    const bs = appointmentsRpt?.byStatus ?? {};
    return Object.entries(bs)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({
        name: STATUS_LABELS[status] ?? status,
        value: value as number,
        color: STATUS_COLORS[status] ?? '#6b7280',
      }));
  }, [appointmentsRpt]);

  // Pie data: channels
  const channelsData = useMemo(
    () =>
      (sourcesRpt?.byChannel ?? []).map((c) => ({
        name: CHANNEL_LABELS[c.channel] ?? c.channel,
        value: c.count,
      })),
    [sourcesRpt],
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reportes</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Indicadores operativos, marketing y clínicos
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Periodo</Label>
          <Segmented
            value={preset}
            onChange={(v) => setPreset(v as Preset)}
            options={[
              { value: 'month', label: 'Este mes' },
              { value: '30d', label: '30 días' },
              { value: 'quarter', label: 'Trimestre' },
              { value: 'year', label: 'Este año' },
              { value: 'custom', label: 'Personalizado' },
            ]}
          />
        </div>
        {preset === 'custom' && (
          <>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Desde</Label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                className="h-10 w-[200px]"
                toDate={endDate ? new Date(endDate) : undefined}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Hasta</Label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                className="h-10 w-[200px]"
                fromDate={startDate ? new Date(startDate) : undefined}
              />
            </div>
          </>
        )}
        <div className="ml-auto self-center text-xs text-muted-foreground">
          {formatRange(startDate, endDate)}
        </div>
      </div>

      {/* ============================================================ */}
      {/* OPERATIVO */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Operación"
          title="Citas, prescripciones e inventario"
          icon={Activity}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Citas en el periodo"
            value={appointmentsRpt?.total ?? '—'}
            delta={appointmentsRpt?.totalDelta ?? null}
            icon={Calendar}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <KpiCard
            label="No-show rate"
            value={appointmentsRpt ? `${appointmentsRpt.noShowRate}%` : '—'}
            deltaPolarity="negative"
            hint={
              appointmentsRpt
                ? `${appointmentsRpt.byStatus.no_show ?? 0} de ${appointmentsRpt.byStatus.no_show + appointmentsRpt.byStatus.completed + appointmentsRpt.byStatus.cancelled} resueltas`
                : undefined
            }
            icon={AlertTriangle}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <KpiCard
            label="Prescripciones emitidas"
            value={prescriptionsRpt?.total ?? '—'}
            delta={prescriptionsRpt?.totalDelta ?? null}
            hint={
              prescriptionsRpt
                ? `${prescriptionsRpt.totalActive} activas en sistema`
                : undefined
            }
            icon={Pill}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
          <KpiCard
            label="Productos con stock bajo"
            value={inventoryRpt?.lowStockCount ?? '—'}
            deltaPolarity="negative"
            hint={
              inventoryRpt
                ? `${inventoryRpt.totalProducts} productos activos`
                : undefined
            }
            icon={Boxes}
            iconColor="text-red-600"
            iconBg="bg-red-50"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Citas por estado"
            subtitle="Resultado de las citas en el periodo"
          >
            {appointmentsBarData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={appointmentsBarData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v}`, 'Citas']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {appointmentsBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Top productos por movimientos"
            subtitle="Productos con más entradas/salidas en el periodo"
          >
            {!inventoryRpt || inventoryRpt.topMovedProducts.length === 0 ? (
              <EmptyChart text="Sin movimientos en el periodo" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={inventoryRpt.topMovedProducts.map((p) => ({
                    name: p.name.length > 22 ? p.name.slice(0, 20) + '…' : p.name,
                    value: p.movements,
                  }))}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v}`, 'Movimientos']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--brand-primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      {/* ============================================================ */}
      {/* MARKETING */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Marketing"
          title="Captación y conversión de pacientes"
          icon={TrendingUp}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Nuevos pacientes"
            value={patientsRpt?.newPatients ?? '—'}
            delta={patientsRpt?.newPatientsDelta ?? null}
            hint="vs periodo anterior"
            icon={UserPlus}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <KpiCard
            label="Conversión Lead → Activo"
            value={sourcesRpt ? `${sourcesRpt.conversionRate}%` : '—'}
            hint={
              sourcesRpt
                ? `${sourcesRpt.totalActive} de ${sourcesRpt.totalLeads + sourcesRpt.totalActive} convirtieron`
                : undefined
            }
            icon={Target}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
          <KpiCard
            label="Pacientes acumulados"
            value={patientsRpt?.totalPatients ?? '—'}
            hint="Total histórico"
            icon={Users}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <KpiCard
            label="Canal principal"
            value={
              sourcesRpt?.byChannel?.[0]
                ? CHANNEL_LABELS[sourcesRpt.byChannel[0].channel] ??
                  sourcesRpt.byChannel[0].channel
                : '—'
            }
            hint={
              sourcesRpt?.byChannel?.[0]
                ? `${sourcesRpt.byChannel[0].count} pacientes`
                : undefined
            }
            icon={Sparkles}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <ChartCard
            title="Nuevos pacientes por mes"
            subtitle="Últimos 6 meses (independiente del filtro)"
          >
            {!patientsRpt || patientsRpt.monthlySeries.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={patientsRpt.monthlySeries}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v}`, 'Pacientes']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--brand-primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Canal de origen"
            subtitle="De dónde llegan los pacientes"
          >
            {channelsData.length === 0 ? (
              <EmptyChart text="Sin pacientes en el periodo" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={channelsData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {channelsData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_PALETTE[idx % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <PieLegend
              data={channelsData.map((d, i) => ({
                ...d,
                color: PIE_PALETTE[i % PIE_PALETTE.length],
              }))}
            />
          </ChartCard>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CLÍNICO */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Clínico"
          title="Procedimientos, consultas y patología"
          icon={Stethoscope}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Procedimientos"
            value={proceduresRpt?.totalProcedures ?? '—'}
            delta={proceduresRpt?.proceduresDelta ?? null}
            icon={Scissors}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <KpiCard
            label="Folículos promedio"
            value={
              proceduresRpt?.averageFollicles
                ? Math.round(proceduresRpt.averageFollicles).toLocaleString('es-MX')
                : '—'
            }
            hint="Por procedimiento"
            icon={Activity}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
          <KpiCard
            label="Folículos totales"
            value={
              proceduresRpt?.totalFollicles
                ? proceduresRpt.totalFollicles.toLocaleString('es-MX')
                : '—'
            }
            hint="Acumulado en el periodo"
            icon={CalendarRange}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <KpiCard
            label="Consultas médicas"
            value={clinicalRpt?.consultations ?? '—'}
            delta={clinicalRpt?.consultationsDelta ?? null}
            icon={Stethoscope}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title="Distribución de variantes"
            subtitle="Diagnósticos en consultas del periodo"
          >
            {!clinicalRpt || clinicalRpt.variantsDistribution.length === 0 ? (
              <EmptyChart text="Sin consultas en el periodo" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={clinicalRpt.variantsDistribution.map((v) => ({
                      name: v.name,
                      value: v.count,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {clinicalRpt.variantsDistribution.map((_, idx) => (
                      <Cell key={idx} fill={PIE_PALETTE[idx % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {clinicalRpt && (
              <PieLegend
                data={clinicalRpt.variantsDistribution.map((d, i) => ({
                  name: d.name,
                  value: d.count,
                  color: PIE_PALETTE[i % PIE_PALETTE.length],
                }))}
              />
            )}
          </ChartCard>

          <ChartCard
            title="Procedimientos por doctor"
            subtitle="En el periodo seleccionado"
            className="lg:col-span-2"
          >
            {!proceduresRpt || proceduresRpt.byDoctor.length === 0 ? (
              <EmptyChart text="Sin procedimientos en el periodo" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={proceduresRpt.byDoctor.map((d) => ({
                    name: `Dr. ${d.name.split(' ')[0]}`,
                    value: d.count,
                  }))}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v}`, 'Procedimientos']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--brand-primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Zonas dadoras evaluadas"
            subtitle="Top 8 zonas más identificadas en consultas"
          >
            {!clinicalRpt || clinicalRpt.topDonorZones.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, clinicalRpt.topDonorZones.length * 28)}>
                <BarChart
                  data={clinicalRpt.topDonorZones}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={130}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--accent-info))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Tipos de paciente (acumulado)"
            subtitle="Distribución global del CRM"
          >
            {patientTypeData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={patientTypeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {patientTypeData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_PALETTE[idx % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <PieLegend
              data={patientTypeData.map((d, i) => ({
                ...d,
                color: PIE_PALETTE[i % PIE_PALETTE.length],
              }))}
            />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  fontSize: 12,
  padding: '6px 10px',
};

function SectionHeader({
  eyebrow,
  title,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {eyebrow}
        </div>
        <h3 className="mt-0.5 flex items-center gap-2 text-base font-semibold tracking-tight">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
      </div>
    </div>
  );
}

function EmptyChart({ text = 'Sin datos en el periodo' }: { text?: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function PieLegend({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  if (data.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-[11px]">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: d.color }}
          />
          <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
          <span className="font-medium tabular-nums">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
