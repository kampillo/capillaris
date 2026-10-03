'use client';

import { useRouter } from 'next/navigation';
import Link, { usePatientContextHref } from '@/components/patients/patient-context-link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientForm } from '@/components/patients/patient-form';
import type { PatientFormValues } from '@/components/patients/patient-form';
import { usePatient, useUpdatePatient } from '@/hooks/use-patients';
import { useRequireRole } from '@/hooks/use-has-role';
import { toDateInput, toDateOnlyPayload } from '@/lib/dates';

export default function EditPatientPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const patientHref = usePatientContextHref(`/dashboard/patients/${params.id}`);
  const backToList = usePatientContextHref('/dashboard/patients');
  const { data: patient, isLoading, error } = usePatient(params.id);
  const updateMutation = useUpdatePatient();
  const authorized = useRequireRole('admin', 'doctor', 'receptionist');
  if (!authorized) return null;

  const handleSubmit = async (data: PatientFormValues) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined).map(([key, value]) => [key, value === '' && !['nombre', 'apellido', 'tipoPaciente', 'pais'].includes(key) ? null : value]),
    );

    if (typeof cleaned.fechaNacimiento === 'string') {
      const fecha = toDateOnlyPayload(cleaned.fechaNacimiento);
      if (fecha) cleaned.fechaNacimiento = fecha;
      else delete cleaned.fechaNacimiento;
    }

    try {
      await updateMutation.mutateAsync({
        id: params.id,
        data: cleaned as any,
      });
      router.push(patientHref);
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
          onClick={() => router.push(backToList)}
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
    fechaNacimiento: toDateInput(patient.fechaNacimiento),
    edadApproximada: patient.edadApproximada ?? false,
    driveFolderUrl: patient.driveFolderUrl ?? '',
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
        onCancel={() => router.push(patientHref)}
        isLoading={updateMutation.isPending}
        submitLabel="Actualizar paciente"
      />
    </div>
  );
}
