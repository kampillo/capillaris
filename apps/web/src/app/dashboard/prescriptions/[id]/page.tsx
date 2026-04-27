'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  Pill,
  RotateCw,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CapillarisLogo } from '@/components/layout/capillaris-logo';
import { PrescriptionForm } from '@/components/prescriptions/prescription-form';
import {
  usePrescription,
  useUpdatePrescription,
  useDeletePrescription,
} from '@/hooks/use-prescriptions';

const STATUS_META: Record<
  string,
  { label: string; chip: string; dot: string; print?: string }
> = {
  draft: {
    label: 'Borrador',
    chip: 'border-slate-200 bg-slate-50 text-slate-700',
    dot: 'bg-slate-400',
  },
  active: {
    label: 'Activa',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  completed: {
    label: 'Completada',
    chip: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
  cancelled: {
    label: 'Cancelada',
    chip: 'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
};

const STATUS_OPTIONS: { value: string; label: string; icon: typeof CheckCircle2 }[] = [
  { value: 'active', label: 'Marcar activa', icon: RotateCw },
  { value: 'completed', label: 'Marcar completada', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Cancelar prescripción', icon: XCircle },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function PrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const { data: rx, isLoading, error } = usePrescription(id);
  const updateMutation = useUpdatePrescription();
  const deleteMutation = useDeletePrescription();

  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Cargando prescripción…</p>
      </div>
    );
  }
  if (error || !rx) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-sm text-destructive">No se pudo cargar la prescripción</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/patients">Volver a pacientes</Link>
        </Button>
      </div>
    );
  }

  const patientPrescriptionsPath = `/dashboard/patients/${rx.patientId}/prescriptions`;
  const status = STATUS_META[rx.status] || STATUS_META.draft;
  const patientLabel = rx.patient
    ? `${rx.patient.nombre} ${rx.patient.apellido}`
    : 'Paciente';
  const doctorLabel = rx.doctor
    ? `Dr. ${rx.doctor.nombre} ${rx.doctor.apellido}`
    : '—';

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(rx.id);
    router.push(patientPrescriptionsPath);
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusOpen(false);
    if (newStatus === rx.status) return;
    await updateMutation.mutateAsync({ id: rx.id, data: { status: newStatus } });
  };

  return (
    <>
      {/* Top bar (hidden on print) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
            <Link href={patientPrescriptionsPath}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Prescripción
            </h2>
            <p className="text-sm text-muted-foreground">
              {patientLabel} · {formatDate(rx.prescriptionDate)}
            </p>
          </div>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="max-w-3xl print:hidden">
          <PrescriptionForm
            isSubmitting={updateMutation.isPending}
            submitLabel="Guardar cambios"
            lockPatient
            onCancel={() => setEditing(false)}
            defaultValues={{
              patientId: rx.patientId,
              patientLabel,
              doctorId: rx.doctorId,
              prescriptionDate: rx.prescriptionDate.split('T')[0],
              notas: rx.notas,
              status: rx.status,
              items: rx.items.map((i) => ({
                productId: i.productId,
                medicineName: i.medicineName,
                dosage: i.dosage,
                frequency: i.frequency,
                durationDays: i.durationDays,
                quantity: i.quantity,
                instructions: i.instructions,
                requiresRefill: i.requiresRefill,
              })),
            }}
            onSubmit={async (data) => {
              await updateMutation.mutateAsync({ id: rx.id, data });
              setEditing(false);
            }}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px] print:block">
          {/* Document */}
          <Card className="overflow-hidden border-border bg-white shadow-sm print:border-0 print:shadow-none">
            {/* Document header */}
            <div className="border-b bg-gradient-to-br from-brand-softer to-transparent px-8 py-6 print:bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CapillarisLogo />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
                      status.chip,
                      'print:hidden',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                    {status.label}
                  </span>
                  <div className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">
                    Receta médica
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    Folio: {rx.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="space-y-7 px-8 py-7">
              {/* Patient + Doctor + Date row */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Field label="Paciente">
                  {rx.patient ? (
                    <Link
                      href={`/dashboard/patients/${rx.patient.id}`}
                      className="text-foreground hover:text-primary print:text-foreground print:hover:no-underline"
                    >
                      {patientLabel}
                    </Link>
                  ) : (
                    patientLabel
                  )}
                </Field>
                <Field label="Médico tratante">{doctorLabel}</Field>
                <Field label="Fecha emisión">{formatDate(rx.prescriptionDate)}</Field>
              </div>

              <hr className="border-border" />

              {/* Medications */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Indicación terapéutica · {rx.items.length}{' '}
                    {rx.items.length === 1 ? 'medicamento' : 'medicamentos'}
                  </h3>
                </div>

                {rx.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin medicamentos.</p>
                ) : (
                  <ol className="space-y-5">
                    {rx.items.map((item, idx) => (
                      <li
                        key={item.id}
                        className="grid grid-cols-[28px_1fr] gap-4 border-l-2 border-transparent pl-0 print:break-inside-avoid"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700 print:bg-transparent print:border print:border-foreground/40 print:text-foreground">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-base font-semibold leading-snug">
                              {item.medicineName}
                            </span>
                            {item.productId && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 print:hidden">
                                del catálogo
                              </span>
                            )}
                            {item.requiresRefill && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 print:hidden">
                                requiere recargas
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground print:text-foreground/70">
                            {[
                              item.dosage,
                              item.frequency,
                              item.durationDays && `${item.durationDays} días`,
                              item.quantity > 1 && `cantidad ${item.quantity}`,
                            ]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </div>
                          {item.instructions && (
                            <p className="mt-1.5 text-sm italic text-foreground/80">
                              {item.instructions}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Notes */}
              {rx.notas && (
                <>
                  <hr className="border-border" />
                  <div>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Notas
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-foreground/85">
                      {rx.notas}
                    </p>
                  </div>
                </>
              )}

              {/* Signature footer (print only mostly) */}
              <div className="mt-12 pt-8">
                <div className="ml-auto w-64 text-center">
                  <div className="border-t border-foreground/40 pt-2 text-xs text-muted-foreground">
                    {doctorLabel}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar (hidden on print) */}
          <aside className="space-y-4 print:hidden">
            <Card className="shadow-sm">
              <CardContent className="space-y-3 pt-5">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado
                </h3>
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                        status.chip,
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                        {status.label}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-1">
                    {STATUS_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isCurrent = opt.value === rx.status;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isCurrent || updateMutation.isPending}
                          onClick={() => handleStatusChange(opt.value)}
                          className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {opt.label}
                          {isCurrent && (
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              actual
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="space-y-2 pt-5 text-xs">
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Información
                </h3>
                <MetaRow label="Folio">
                  <code className="font-mono">{rx.id.slice(0, 8).toUpperCase()}</code>
                </MetaRow>
                <MetaRow label="Creada">{formatDateShort(rx.createdAt)}</MetaRow>
                {rx.updatedAt !== rx.createdAt && (
                  <MetaRow label="Editada">{formatDateShort(rx.updatedAt)}</MetaRow>
                )}
                {rx.expiresAt && (
                  <MetaRow label="Expira">{formatDateShort(rx.expiresAt)}</MetaRow>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="space-y-2 pt-5">
                <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Acciones
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar prescripción
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar prescripción</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar la prescripción de{' '}
              <strong>{patientLabel}</strong> del{' '}
              {formatDate(rx.prescriptionDate)}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium leading-snug text-foreground">
        {children}
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}
