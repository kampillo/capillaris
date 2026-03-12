'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Calendar, FileText, Stethoscope, Scissors, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePatient } from '@/hooks/use-patients';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PATIENT_TYPE_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  lead: { label: 'Lead', variant: 'outline' },
  registered: { label: 'Registrado', variant: 'secondary' },
  evaluation: { label: 'Evaluación', variant: 'default' },
  active: { label: 'Activo', variant: 'default' },
  inactive: { label: 'Inactivo', variant: 'destructive' },
  archived: { label: 'Archivado', variant: 'secondary' },
};

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || '—'}</dd>
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

export default function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: patient, isLoading, error } = usePatient(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando paciente...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-destructive">Paciente no encontrado</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/patients')}>
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/patients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">
                {patient.nombre} {patient.apellido}
              </h2>
              {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
            </div>
            <p className="text-muted-foreground">
              Registrado el {formatDate(patient.createdAt)}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/patients/${patient.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
          <Link href={`/dashboard/patients/${patient.id}/history`}>
            <ClipboardList className="h-5 w-5" />
            <span className="text-xs">Historia Clínica</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
          <Link href={`/dashboard/patients/${patient.id}/consultations`}>
            <Stethoscope className="h-5 w-5" />
            <span className="text-xs">Consultas</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
          <Link href={`/dashboard/patients/${patient.id}/procedures`}>
            <Scissors className="h-5 w-5" />
            <span className="text-xs">Procedimientos</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
          <Link href={`/dashboard/patients/${patient.id}/prescriptions`}>
            <FileText className="h-5 w-5" />
            <span className="text-xs">Prescripciones</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent>
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

          <Card>
            <CardHeader>
              <CardTitle>Dirección</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="Dirección" value={patient.direccion} />
                <InfoItem label="Ciudad" value={patient.ciudad} />
                <InfoItem label="Estado" value={patient.estado} />
                <InfoItem label="País" value={patient.pais} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clasificación</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="Canal de Origen" value={patient.origenCanal} />
                <InfoItem label="Referido Por" value={patient.referidoPor} />
                <div>
                  <dt className="text-sm text-muted-foreground">Consentimiento Datos</dt>
                  <dd className="text-sm font-medium">
                    {patient.consentDataProcessing ? 'Sí' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Consentimiento Marketing</dt>
                  <dd className="text-sm font-medium">
                    {patient.consentMarketing ? 'Sí' : 'No'}
                  </dd>
                </div>
              </dl>
              {patient.notasInternas && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Notas Internas</dt>
                    <dd className="text-sm whitespace-pre-wrap">{patient.notasInternas}</dd>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Últimas Citas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin citas registradas</p>
              ) : (
                <ul className="space-y-3">
                  {patient.appointments.map((apt: any) => (
                    <li key={apt.id} className="text-sm">
                      <p className="font-medium">{apt.motivo || 'Cita'}</p>
                      <p className="text-muted-foreground">
                        {formatDate(apt.startDatetime)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Prescripciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin prescripciones</p>
              ) : (
                <ul className="space-y-3">
                  {patient.prescriptions.map((rx: any) => (
                    <li key={rx.id} className="text-sm">
                      <p className="font-medium">
                        <Badge variant="outline" className="mr-2">{rx.status}</Badge>
                        Prescripción
                      </p>
                      <p className="text-muted-foreground">
                        {formatDate(rx.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.medicalConsultations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin consultas</p>
              ) : (
                <ul className="space-y-3">
                  {patient.medicalConsultations.map((c: any) => (
                    <li key={c.id} className="text-sm">
                      <p className="font-medium">Consulta médica</p>
                      <p className="text-muted-foreground">
                        {formatDate(c.consultationDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Procedimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.procedureReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin procedimientos</p>
              ) : (
                <ul className="space-y-3">
                  {patient.procedureReports.map((p: any) => (
                    <li key={p.id} className="text-sm">
                      <p className="font-medium">{p.procedureType || 'Procedimiento'}</p>
                      <p className="text-muted-foreground">
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
