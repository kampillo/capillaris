'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Edit,
  Calendar,
  FileText,
  Stethoscope,
  Scissors,
  ClipboardList,
  MapPin,
  Phone,
  Mail,
  Images,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePatient } from '@/hooks/use-patients';
import { useConsultationsByPatient } from '@/hooks/use-clinical';
import { Avatar } from '@/components/clinic/avatar';
import { ScalpMap } from '@/components/clinic/scalp-map';
import { variantsToSeverity } from '@/components/clinic/scalp-zones';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PATIENT_TYPE: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  lead: {
    label: 'Lead',
    color: 'hsl(var(--accent-lilac))',
    bg: 'hsl(var(--accent-lilac-soft))',
    border: 'hsl(var(--accent-lilac) / 0.25)',
  },
  registered: {
    label: 'Registrado',
    color: 'hsl(var(--accent-info))',
    bg: 'hsl(var(--accent-info-soft))',
    border: 'hsl(var(--accent-info) / 0.25)',
  },
  evaluation: {
    label: 'Evaluación',
    color: 'hsl(var(--accent-amber))',
    bg: 'hsl(var(--accent-amber-soft))',
    border: 'hsl(var(--accent-amber) / 0.25)',
  },
  active: {
    label: 'Activo',
    color: 'hsl(var(--brand-primary))',
    bg: 'hsl(var(--brand-primary-soft))',
    border: 'hsl(var(--brand-primary) / 0.25)',
  },
  inactive: {
    label: 'Inactivo',
    color: 'hsl(var(--text-secondary))',
    bg: 'hsl(var(--surface-2))',
    border: 'hsl(var(--border))',
  },
  archived: {
    label: 'Archivado',
    color: 'hsl(var(--text-tertiary))',
    bg: 'hsl(var(--surface-2))',
    border: 'hsl(var(--border))',
  },
};

const QUICK_ACTIONS = [
  { icon: ClipboardList, label: 'Historia clínica', path: 'history' },
  { icon: Stethoscope, label: 'Consultas', path: 'consultations' },
  { icon: Scissors, label: 'Procedimientos', path: 'procedures' },
  { icon: FileText, label: 'Prescripciones', path: 'prescriptions' },
  { icon: Images, label: 'Antes / Después', path: 'images' },
];

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <dt className="cap-eyebrow">{label}</dt>
      <dd className="text-sm text-foreground">{value || '—'}</dd>
    </div>
  );
}

function formatDate(date?: string | null) {
  if (!date) return null;
  try {
    return format(new Date(date), "dd 'de' MMM yyyy", { locale: es });
  } catch {
    return date;
  }
}

function capitalize(s?: string | null) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: patient, isLoading, error } = usePatient(params.id);
  const { data: consultations } = useConsultationsByPatient(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-text-secondary">Cargando paciente...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-destructive">Paciente no encontrado</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/patients')}
        >
          Volver a pacientes
        </Button>
      </div>
    );
  }

  const type = PATIENT_TYPE[patient.tipoPaciente || 'lead'];

  const metaParts: string[] = [];
  if (patient.fechaNacimiento) {
    const age =
      new Date().getFullYear() - new Date(patient.fechaNacimiento).getFullYear();
    metaParts.push(`${age} años`);
  }
  if (patient.genero) metaParts.push(capitalize(patient.genero));

  const stats = [
    { label: 'Citas', value: patient.appointments?.length ?? 0 },
    { label: 'Consultas', value: patient.medicalConsultations?.length ?? 0 },
    { label: 'Procedimientos', value: patient.procedureReports?.length ?? 0 },
    { label: 'Prescripciones', value: patient.prescriptions?.length ?? 0 },
  ];

  // Mapa capilar — derivado de la última consulta (si existe)
  const latestConsultation = consultations?.[0];
  const donorZoneNames =
    latestConsultation?.donorZones?.map((dz) => dz.donorZone.name) ?? [];
  const variantNames =
    latestConsultation?.variants?.map((v) => v.variant.name) ?? [];
  const severity = variantsToSeverity(variantNames);
  const hasClinicalData = donorZoneNames.length > 0 || severity > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <Link
        href="/dashboard/patients"
        className="inline-flex w-fit items-center gap-1 text-xs text-text-secondary transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Volver a pacientes
      </Link>

      {/* Patient header card */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        <div className="flex flex-wrap items-start gap-5 p-6">
          <Avatar name={`${patient.nombre} ${patient.apellido}`} size={72} />
          <div className="min-w-[240px] flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
              <h2 className="cap-h2">
                {patient.nombre} {patient.apellido}
              </h2>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{
                  background: type.bg,
                  color: type.color,
                  borderColor: type.border,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: type.color }}
                />
                {type.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-text-secondary">
              {metaParts.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
              {patient.ciudad && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {patient.ciudad}
                </span>
              )}
              {patient.celular && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {patient.celular}
                </span>
              )}
              {patient.email && (
                <span className="inline-flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3" /> {patient.email}
                </span>
              )}
            </div>
            {patient.createdAt && (
              <p className="mt-1 text-[11px] text-text-tertiary">
                Registrado el {formatDate(patient.createdAt)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={`/dashboard/patients/${patient.id}/edit`}>
                <Edit className="h-3.5 w-3.5" /> Editar
              </Link>
            </Button>
            <Button size="sm" className="gap-1.5" asChild>
              <Link href="/dashboard/appointments/new">
                <Calendar className="h-3.5 w-3.5" /> Agendar cita
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="border-r border-border px-5 py-4 last:border-r-0 sm:[&:nth-child(2)]:border-r-0 sm:[&:nth-child(3)]:border-r-0 sm:[&:not(:last-child)]:border-r"
            >
              <div className="cap-eyebrow mb-1">{s.label}</div>
              <div className="cap-mono text-xl font-medium">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.path}
            href={`/dashboard/patients/${patient.id}/${a.path}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-xs transition-all hover:border-brand-soft hover:bg-brand-softer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white">
              <a.icon className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-foreground">
              {a.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main info */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
            <h3 className="cap-eyebrow mb-4">Información personal</h3>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoItem label="Nombre" value={patient.nombre} />
              <InfoItem label="Apellido" value={patient.apellido} />
              <InfoItem label="Email" value={patient.email} />
              <InfoItem label="Celular" value={patient.celular} />
              <InfoItem
                label="Fecha de nacimiento"
                value={formatDate(patient.fechaNacimiento)}
              />
              <InfoItem label="Género" value={capitalize(patient.genero)} />
              <InfoItem
                label="Estado civil"
                value={capitalize(patient.estadoCivil)}
              />
              <InfoItem label="Ocupación" value={patient.ocupacion} />
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
            <h3 className="cap-eyebrow mb-4">Dirección</h3>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoItem label="Dirección" value={patient.direccion} />
              <InfoItem label="Ciudad" value={patient.ciudad} />
              <InfoItem label="Estado" value={patient.estado} />
              <InfoItem label="País" value={patient.pais} />
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
            <h3 className="cap-eyebrow mb-4">Clasificación</h3>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoItem
                label="Canal de origen"
                value={capitalize(patient.origenCanal)}
              />
              <InfoItem label="Referido por" value={patient.referidoPor} />
              <InfoItem
                label="Consent. datos"
                value={patient.consentDataProcessing ? 'Sí' : 'No'}
              />
              <InfoItem
                label="Consent. marketing"
                value={patient.consentMarketing ? 'Sí' : 'No'}
              />
            </dl>
            {patient.notasInternas && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1.5">
                  <dt className="cap-eyebrow">Notas internas</dt>
                  <dd className="whitespace-pre-wrap text-sm text-foreground">
                    {patient.notasInternas}
                  </dd>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Mapa capilar</h3>
              {latestConsultation && (
                <span className="cap-eyebrow">
                  {format(
                    new Date(latestConsultation.consultationDate),
                    'dd MMM yy',
                    { locale: es },
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="w-full max-w-[220px]">
                <ScalpMap
                  severity={severity}
                  highlightedZoneNames={donorZoneNames}
                />
              </div>
            </div>
            {hasClinicalData ? (
              <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                {donorZoneNames.length > 0 && (
                  <div>
                    <div className="cap-eyebrow mb-1.5">Zonas donantes</div>
                    <div className="flex flex-wrap gap-1">
                      {donorZoneNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand-dark"
                        >
                          <span className="h-1 w-1 rounded-full bg-brand" />
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {variantNames.length > 0 && (
                  <div>
                    <div className="cap-eyebrow mb-1.5">Variantes</div>
                    <div className="flex flex-wrap gap-1">
                      {variantNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center rounded-full border border-lilac/25 bg-lilac-soft px-2 py-0.5 text-[10px] font-medium text-lilac"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-1 text-center text-[11px] text-text-tertiary">
                Sin consultas registradas
              </p>
            )}
          </section>
          <SidebarCard
            icon={Calendar}
            title="Últimas citas"
            items={(patient.appointments as any[] ?? []).slice(0, 4).map((apt: any) => ({
              id: apt.id,
              title: apt.title || 'Cita',
              date: formatDate(apt.startDatetime),
            }))}
            emptyText="Sin citas registradas"
          />
          <SidebarCard
            icon={Stethoscope}
            title="Consultas"
            items={(patient.medicalConsultations as any[] ?? []).slice(0, 4).map((c: any) => ({
              id: c.id,
              title: 'Consulta médica',
              date: formatDate(c.consultationDate),
            }))}
            emptyText="Sin consultas"
          />
          <SidebarCard
            icon={Scissors}
            title="Procedimientos"
            items={(patient.procedureReports as any[] ?? []).slice(0, 4).map((p: any) => ({
              id: p.id,
              title: p.procedureType || 'Procedimiento',
              date: formatDate(p.procedureDate),
            }))}
            emptyText="Sin procedimientos"
          />
          <SidebarCard
            icon={FileText}
            title="Prescripciones"
            items={(patient.prescriptions as any[] ?? []).slice(0, 4).map((rx: any) => ({
              id: rx.id,
              title: `Prescripción · ${rx.status}`,
              date: formatDate(rx.createdAt),
            }))}
            emptyText="Sin prescripciones"
          />
        </div>
      </div>
    </div>
  );
}

function SidebarCard({
  icon: Icon,
  title,
  items,
  emptyText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: Array<{ id: string; title: string; date?: string | null }>;
  emptyText: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-text-tertiary" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {items.length > 0 && (
          <span className="ml-auto text-[11px] text-text-tertiary">
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-xs text-text-tertiary">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border p-2.5 transition-colors hover:bg-surface-2"
            >
              <p className="text-sm font-medium">{item.title}</p>
              {item.date && (
                <p className="cap-mono text-[11px] text-text-tertiary">
                  {item.date}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
