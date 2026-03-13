'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Calendar, FileText, Stethoscope, Scissors, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePatient } from '@/hooks/use-patients';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PATIENT_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  lead: { label: 'Lead', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  registered: { label: 'Registrado', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  evaluation: { label: 'Evaluación', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  active: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactivo', className: 'bg-red-50 text-red-600 border-red-200' },
  archived: { label: 'Archivado', className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  );
}

function formatDate(date?: string | null) {
  if (!date) return null;
  try {
    return format(new Date(date), 'dd MMM yyyy', { locale: es });
  } catch {
    return date;
  }
}

const quickActions = [
  { icon: ClipboardList, label: 'Historia Clínica', path: 'history', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: Stethoscope, label: 'Consultas', path: 'consultations', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: Scissors, label: 'Procedimientos', path: 'procedures', color: 'text-violet-600', bg: 'bg-violet-50' },
  { icon: FileText, label: 'Prescripciones', path: 'prescriptions', color: 'text-amber-600', bg: 'bg-amber-50' },
];

export default function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: patient, isLoading, error } = usePatient(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Cargando paciente...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-sm text-destructive">Paciente no encontrado</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/patients')}>
          Volver a Pacientes
        </Button>
      </div>
    );
  }

  const badge = PATIENT_TYPE_BADGES[patient.tipoPaciente || 'lead'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
            <Link href="/dashboard/patients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {patient.nombre} {patient.apellido}
              </h2>
              {badge && (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Registrado el {formatDate(patient.createdAt)}
            </p>
          </div>
        </div>
        <Button className="h-10 shadow-sm" asChild>
          <Link href={`/dashboard/patients/${patient.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link key={action.path} href={`/dashboard/patients/${patient.id}/${action.path}`}>
            <Card className="hover:shadow-md transition-all cursor-pointer group shadow-sm">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className={`rounded-xl p-2.5 ${action.bg} group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <span className="text-xs font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Información Personal</h3>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="Nombre" value={patient.nombre} />
                <InfoItem label="Apellido" value={patient.apellido} />
                <InfoItem label="Email" value={patient.email} />
                <InfoItem label="Celular" value={patient.celular} />
                <InfoItem label="Fecha de Nacimiento" value={formatDate(patient.fechaNacimiento)} />
                <InfoItem label="Género" value={patient.genero} />
                <InfoItem label="Estado Civil" value={patient.estadoCivil} />
                <InfoItem label="Ocupación" value={patient.ocupacion} />
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Dirección</h3>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="Dirección" value={patient.direccion} />
                <InfoItem label="Ciudad" value={patient.ciudad} />
                <InfoItem label="Estado" value={patient.estado} />
                <InfoItem label="País" value={patient.pais} />
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Clasificación</h3>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="Canal de Origen" value={patient.origenCanal} />
                <InfoItem label="Referido Por" value={patient.referidoPor} />
                <InfoItem label="Consentimiento Datos" value={patient.consentDataProcessing ? 'Sí' : 'No'} />
                <InfoItem label="Consentimiento Marketing" value={patient.consentMarketing ? 'Sí' : 'No'} />
              </dl>
              {patient.notasInternas && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notas Internas</dt>
                    <dd className="text-sm whitespace-pre-wrap">{patient.notasInternas}</dd>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Recent Activity */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Últimas Citas</h3>
              </div>
              {patient.appointments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Sin citas registradas</p>
              ) : (
                <ul className="space-y-2.5">
                  {patient.appointments.map((apt: any) => (
                    <li key={apt.id} className="rounded-lg border p-2.5">
                      <p className="text-sm font-medium">{apt.motivo || 'Cita'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(apt.startDatetime)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Prescripciones</h3>
              </div>
              {patient.prescriptions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Sin prescripciones</p>
              ) : (
                <ul className="space-y-2.5">
                  {patient.prescriptions.map((rx: any) => (
                    <li key={rx.id} className="rounded-lg border p-2.5">
                      <p className="text-sm font-medium">
                        <Badge variant="outline" className="mr-2 text-[10px]">{rx.status}</Badge>
                        Prescripción
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(rx.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Consultas</h3>
              </div>
              {patient.medicalConsultations.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Sin consultas</p>
              ) : (
                <ul className="space-y-2.5">
                  {patient.medicalConsultations.map((c: any) => (
                    <li key={c.id} className="rounded-lg border p-2.5">
                      <p className="text-sm font-medium">Consulta médica</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(c.consultationDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Procedimientos</h3>
              </div>
              {patient.procedureReports.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Sin procedimientos</p>
              ) : (
                <ul className="space-y-2.5">
                  {patient.procedureReports.map((p: any) => (
                    <li key={p.id} className="rounded-lg border p-2.5">
                      <p className="text-sm font-medium">{p.procedureType || 'Procedimiento'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.procedureDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
