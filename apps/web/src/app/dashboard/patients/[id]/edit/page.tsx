'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientForm } from '@/components/patients/patient-form';
import type { PatientFormValues } from '@/components/patients/patient-form';
import { usePatient, useUpdatePatient } from '@/hooks/use-patients';

export default function EditPatientPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: patient, isLoading, error } = usePatient(params.id);
  const updateMutation = useUpdatePatient();

  const handleSubmit = async (data: PatientFormValues) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '' && v !== undefined),
    );

    if (cleaned.fechaNacimiento && typeof cleaned.fechaNacimiento === 'string' && !cleaned.fechaNacimiento.includes('T')) {
      cleaned.fechaNacimiento = `${cleaned.fechaNacimiento}T00:00:00.000Z`;
    }

    try {
      await updateMutation.mutateAsync({
        id: params.id,
        data: cleaned as any,
      });
      router.push(`/dashboard/patients/${params.id}`);
    } catch {
      // Error is captured in updateMutation.error
    }
  };

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

  const defaultValues: Partial<PatientFormValues> = {
    nombre: patient.nombre,
    apellido: patient.apellido,
    email: patient.email || '',
    celular: patient.celular || '',
    direccion: patient.direccion || '',
    fechaNacimiento: patient.fechaNacimiento
      ? patient.fechaNacimiento.split('T')[0]
      : '',
    edadApproximada: patient.edadApproximada || false,
    genero: patient.genero || '',
    estadoCivil: patient.estadoCivil || '',
    ocupacion: patient.ocupacion || '',
    tipoPaciente: patient.tipoPaciente || '',
    origenCanal: patient.origenCanal || '',
    referidoPor: patient.referidoPor || '',
    ciudad: patient.ciudad || '',
    estado: patient.estado || '',
    pais: patient.pais || '',
    consentDataProcessing: patient.consentDataProcessing || false,
    consentMarketing: patient.consentMarketing || false,
    notasInternas: patient.notasInternas || '',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
          <Link href={`/dashboard/patients/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Editar Paciente</h2>
          <p className="text-sm text-muted-foreground">
            {patient.nombre} {patient.apellido}
          </p>
        </div>
      </div>

      {updateMutation.isError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {updateMutation.error?.message || 'Error al actualizar el paciente'}
        </div>
      )}

      <PatientForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
        submitLabel="Actualizar Paciente"
      />
    </div>
  );
}
