'use client';

import Link from 'next/link';
import { ArrowLeft, Plus, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  active: { label: 'Activa', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completada', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  cancelled: { label: 'Cancelada', className: 'bg-red-50 text-red-600 border-red-200' },
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

  const prescriptions = (data?.data || []).filter(
    (rx) => rx.patientId === params.id,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
            <Link href={`/dashboard/patients/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Prescripciones</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {patient ? `${patient.nombre} ${patient.apellido}` : 'Cargando...'}
            </p>
          </div>
        </div>
        <Button className="h-10 font-medium shadow-sm" asChild>
          <Link href={`/dashboard/patients/${params.id}/prescriptions/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Prescripción
          </Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando prescripciones...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Pill className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No hay prescripciones para este paciente</p>
              <Button className="h-10 font-medium mt-2" asChild>
                <Link href={`/dashboard/patients/${params.id}/prescriptions/new`}>
                  Crear prescripción
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Doctor</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Medicamentos</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Notas</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((rx) => {
                  const badge = STATUS_BADGES[rx.status] || STATUS_BADGES.draft;
                  return (
                    <TableRow key={rx.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="text-sm">{formatDate(rx.prescriptionDate)}</TableCell>
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
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {rx.notas || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                          <Link href={`/dashboard/prescriptions/${rx.id}`}>Ver</Link>
                        </Button>
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
