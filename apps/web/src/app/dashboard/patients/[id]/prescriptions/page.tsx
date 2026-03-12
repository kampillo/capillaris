'use client';

import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePatient } from '@/hooks/use-patients';
import { usePrescriptions } from '@/hooks/use-prescriptions';

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  active: { label: 'Activa', variant: 'default' },
  completed: { label: 'Completada', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PatientPrescriptionsPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: patient } = usePatient(params.id);
  const { data, isLoading } = usePrescriptions(1, 100);

  // Filter prescriptions for this patient
  const prescriptions = (data?.data || []).filter(
    (rx) => rx.patientId === params.id,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/patients/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Prescripciones</h2>
            <p className="text-muted-foreground">
              {patient ? `${patient.nombre} ${patient.apellido}` : 'Cargando...'}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/prescriptions/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Prescripción
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando prescripciones...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-muted-foreground">No hay prescripciones para este paciente</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/prescriptions/new">Crear prescripción</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Medicamentos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((rx) => {
                  const badge = STATUS_BADGES[rx.status] || STATUS_BADGES.draft;
                  return (
                    <TableRow key={rx.id}>
                      <TableCell>{formatDate(rx.prescriptionDate)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {rx.doctor ? `Dr. ${rx.doctor.nombre} ${rx.doctor.apellido}` : '—'}
                      </TableCell>
                      <TableCell>
                        {rx.items?.length ? (
                          <ul className="text-sm space-y-1">
                            {rx.items.map((item) => (
                              <li key={item.id}>
                                <span className="font-medium">{item.medicineName}</span>
                                {item.dosage && (
                                  <span className="text-muted-foreground"> — {item.dosage}</span>
                                )}
                                {item.frequency && (
                                  <span className="text-muted-foreground">, {item.frequency}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {rx.notas || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
