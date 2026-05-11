'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrescriptionForm } from '@/components/prescriptions/prescription-form';
import { usePatient } from '@/hooks/use-patients';
import { useCreatePrescription } from '@/hooks/use-prescriptions';
import { useRequireRole } from '@/hooks/use-has-role';

export default function NewPatientPrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = (params?.id as string) || '';

  const { data: patient } = usePatient(patientId);
  const createMutation = useCreatePrescription();
  const authorized = useRequireRole('admin', 'doctor');
  if (!authorized) return null;

  const back = `/dashboard/patients/${patientId}/prescriptions`;
  const patientLabel = patient
    ? `${patient.nombre} ${patient.apellido}`
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
          <Link href={back}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nueva prescripción</h2>
          <p className="text-sm text-muted-foreground">
            {patientLabel ?? 'Paciente'}
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <PrescriptionForm
          isSubmitting={createMutation.isPending}
          submitLabel="Crear prescripción"
          lockPatient
          defaultValues={{ patientId, patientLabel }}
          onCancel={() => router.push(back)}
          onSubmit={async (data) => {
            await createMutation.mutateAsync(data);
            router.push(back);
          }}
        />
      </div>
    </div>
  );
}
