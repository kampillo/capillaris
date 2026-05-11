'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientForm } from '@/components/patients/patient-form';
import type { PatientFormValues } from '@/components/patients/patient-form';
import { usePatient, useUpdatePatient } from '@/hooks/use-patients';
import { useRequireRole } from '@/hooks/use-has-role';

export default function EditPatientPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: patient, isLoading, error } = usePatient(params.id);
  const updateMutation = useUpdatePatient();
  const authorized = useRequireRole('admin', 'doctor', 'receptionist');
  if (!authorized) return null;

  const handleSubmit = async (data: PatientFormValues) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '' && v !== undefined),
    );

    if (
      cleaned.fechaNacimiento &&
      typeof cleaned.fechaNacimiento === 'string' &&
      !cleaned.fechaNacimiento.includes('T')
    ) {
      cleaned.fechaNacimiento = `${cleaned.fechaNacimiento}T00:00:00.000Z`;
    }

    try {
      await updateMutation.mutateAsync({
        id: params.id,
        data: cleaned as any,
      });
      router.push(`/dashboard/patients/${params.id}`);
    } catch {
      // captured in updateMutation.error
    }
  };

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
    <div className="flex flex-col gap-5">
      <Link
        href={`/dashboard/patients/${params.id}`}
        className="inline-flex w-fit items-center gap-1 text-xs text-text-secondary transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Volver al paciente
      </Link>

      <div>
        <h2 className="cap-h2 mb-1">Editar paciente</h2>
        <p className="text-[13px] text-text-secondary">
          {patient.nombre} {patient.apellido}
        </p>
      </div>

      {updateMutation.isError && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {updateMutation.error?.message || 'Error al actualizar el paciente'}
        </div>
      )}

      <PatientForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/dashboard/patients/${params.id}`)}
        isLoading={updateMutation.isPending}
        submitLabel="Actualizar paciente"
      />
    </div>
  );
}
