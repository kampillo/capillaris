'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PatientForm } from '@/components/patients/patient-form';
import type { PatientFormValues } from '@/components/patients/patient-form';
import { useCreatePatient } from '@/hooks/use-patients';
import { useRequireRole } from '@/hooks/use-has-role';

export default function NewPatientPage() {
  const router = useRouter();
  const createMutation = useCreatePatient();
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
      await createMutation.mutateAsync(cleaned as any);
      router.push('/dashboard/patients');
    } catch {
      // Error captured in createMutation.error and displayed below
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <Link
        href="/dashboard/patients"
        className="inline-flex w-fit items-center gap-1 text-xs text-text-secondary transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Volver a pacientes
      </Link>

      <div>
        <h2 className="cap-h2 mb-1">Nuevo paciente</h2>
        <p className="text-[13px] text-text-secondary">
          Registra un nuevo paciente en el sistema.
        </p>
      </div>

      {createMutation.isError && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear el paciente'}
        </div>
      )}

      <PatientForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/dashboard/patients')}
        isLoading={createMutation.isPending}
        submitLabel="Crear paciente"
      />
    </div>
  );
}
