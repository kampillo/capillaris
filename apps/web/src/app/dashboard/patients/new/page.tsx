'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientForm } from '@/components/patients/patient-form';
import type { PatientFormValues } from '@/components/patients/patient-form';
import { useCreatePatient } from '@/hooks/use-patients';

export default function NewPatientPage() {
  const router = useRouter();
  const createMutation = useCreatePatient();

  const handleSubmit = async (data: PatientFormValues) => {
    // Clean empty strings to undefined
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '' && v !== undefined),
    );

    await createMutation.mutateAsync(cleaned as any);
    router.push('/dashboard/patients');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/patients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nuevo Paciente</h2>
          <p className="text-muted-foreground">
            Registrar un nuevo paciente en el sistema
          </p>
        </div>
      </div>

      {createMutation.isError && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {createMutation.error?.message || 'Error al crear el paciente'}
        </div>
      )}

      <PatientForm
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
        submitLabel="Crear Paciente"
      />
    </div>
  );
}
