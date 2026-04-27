'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  User,
  FileText,
  Pill,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { usePatients } from '@/hooks/use-patients';
import { useDoctors } from '@/hooks/use-clinical';
import { useMedicines } from '@/hooks/use-inventory';
import type {
  CreatePrescriptionData,
  CreatePrescriptionItemData,
} from '@/hooks/use-prescriptions';

const FREQUENCY_PRESETS = [
  'Cada 8 h',
  'Cada 12 h',
  'Cada 24 h',
  '1 vez al día',
  '2 veces al día',
  'PRN (al requerir)',
];
const DURATION_PRESETS = [7, 15, 30, 60, 90];

interface ItemForm extends CreatePrescriptionItemData {
  key: number;
}

let itemKeyCounter = 0;
function createEmptyItem(): ItemForm {
  return {
    key: ++itemKeyCounter,
    medicineName: '',
    dosage: '',
    frequency: '',
    durationDays: undefined,
    quantity: 1,
    instructions: '',
    requiresRefill: false,
    productId: undefined,
  };
}

function itemFromExisting(item: CreatePrescriptionItemData): ItemForm {
  return { key: ++itemKeyCounter, ...item };
}

function SectionHeader({
  icon: Icon,
  title,
  required,
  iconBg,
  iconColor,
  action,
}: {
  icon: typeof User;
  title: string;
  required?: boolean;
  iconBg: string;
  iconColor: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          {required && <span className="ml-1 text-destructive">*</span>}
        </h3>
      </div>
      {action}
    </div>
  );
}

interface PresetsInputProps {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  placeholder?: string;
  type?: 'text' | 'number';
  min?: number;
}

function PresetsInput({
  value,
  onChange,
  presets,
  placeholder,
  type = 'text',
  min,
}: PresetsInputProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Input
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 pr-8"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Sugerencias"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto max-w-[260px] p-2">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sugerencias
          </div>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  value === p
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface PrescriptionFormValues {
  patientId: string;
  patientLabel?: string;
  doctorId: string;
  prescriptionDate: string;
  notas?: string;
  status?: string;
  items: CreatePrescriptionItemData[];
}

interface PrescriptionFormProps {
  defaultValues?: Partial<PrescriptionFormValues>;
  /** Lock patient field (eg. when editing or coming from patient page) */
  lockPatient?: boolean;
  onSubmit: (data: CreatePrescriptionData) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function PrescriptionForm({
  defaultValues,
  lockPatient,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Crear prescripción',
}: PrescriptionFormProps) {
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(
    defaultValues?.patientId ?? '',
  );
  const [selectedPatientName, setSelectedPatientName] = useState(
    defaultValues?.patientLabel ?? '',
  );
  const [doctorId, setDoctorId] = useState(defaultValues?.doctorId ?? '');
  const [prescriptionDate, setPrescriptionDate] = useState(
    defaultValues?.prescriptionDate ?? new Date().toISOString().split('T')[0],
  );
  const [notas, setNotas] = useState(defaultValues?.notas ?? '');
  const [items, setItems] = useState<ItemForm[]>(
    defaultValues?.items?.length
      ? defaultValues.items.map(itemFromExisting)
      : [createEmptyItem()],
  );
  const [error, setError] = useState('');

  // Only fetch patients list when not locked (no need to search if patient comes from URL)
  const { data: patientsData } = usePatients({
    query: !lockPatient && patientSearch.length >= 2 ? patientSearch : undefined,
    pageSize: 8,
  });
  const { data: doctors } = useDoctors();
  const { data: medicines = [] } = useMedicines();

  const medicineOptions: ComboboxOption[] = useMemo(
    () =>
      medicines.map((m) => ({
        id: m.id,
        label: m.name,
        sublabel: [m.content && m.unit ? `${m.content} ${m.unit}` : null, m.category?.name]
          .filter(Boolean)
          .join(' · ') || undefined,
      })),
    [medicines],
  );

  const patients = patientsData?.data || [];
  const showPatientResults = patientSearch.length >= 2 && !selectedPatientId;
  const showPatientCard = !lockPatient;

  const updateItem = (
    key: number,
    patch: Partial<CreatePrescriptionItemData>,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPatientId || !doctorId || !prescriptionDate) {
      setError('Completa paciente, doctor y fecha.');
      return;
    }
    const validItems = items.filter((i) => i.medicineName.trim());
    if (validItems.length === 0) {
      setError('Agrega al menos un medicamento.');
      return;
    }

    const toISO = (d: string) =>
      d.includes('T') ? d : `${d}T00:00:00.000Z`;

    try {
      await onSubmit({
        patientId: selectedPatientId,
        doctorId,
        prescriptionDate: toISO(prescriptionDate),
        notas: notas.trim() || undefined,
        status: defaultValues?.status ?? 'active',
        items: validItems.map(({ key, ...rest }) => ({
          ...rest,
          medicineName: rest.medicineName.trim(),
          dosage: rest.dosage?.trim() || undefined,
          frequency: rest.frequency?.trim() || undefined,
          durationDays: rest.durationDays || undefined,
          instructions: rest.instructions?.trim() || undefined,
          productId: rest.productId || undefined,
        })),
      });
    } catch (err: any) {
      setError(err?.message || 'Error al guardar');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Patient (only if not locked) */}
      {showPatientCard && (
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <SectionHeader
              icon={User}
              title="Paciente"
              required
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            {selectedPatientId ? (
              <div className="flex items-center justify-between rounded-lg border bg-accent/30 p-3">
                <span className="text-sm font-medium">
                  {selectedPatientName || 'Paciente seleccionado'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSelectedPatientId('');
                    setSelectedPatientName('');
                    setPatientSearch('');
                  }}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente por nombre…"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="h-11 pl-9"
                />
                {showPatientResults && (
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-popover shadow-xl">
                    {patients.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        No se encontraron pacientes
                      </div>
                    ) : (
                      patients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full px-3 py-2.5 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-accent"
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setSelectedPatientName(`${p.nombre} ${p.apellido}`);
                            setPatientSearch('');
                          }}
                        >
                          <span className="font-medium">
                            {p.nombre} {p.apellido}
                          </span>
                          {p.celular && (
                            <span className="ml-2 text-muted-foreground">{p.celular}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Doctor + Date + Notes */}
      <Card className="shadow-sm">
        <CardContent className="pt-5">
          <SectionHeader
            icon={FileText}
            title="Detalles"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Doctor <span className="text-destructive">*</span>
                </Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Seleccionar doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(doctors || []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        Dr. {d.nombre} {d.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Fecha <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={prescriptionDate}
                  onChange={setPrescriptionDate}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas adicionales para el paciente o la farmacia…"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medicaments */}
      <Card className="shadow-sm">
        <CardContent className="pt-5">
          <SectionHeader
            icon={Pill}
            title="Medicamentos"
            required
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setItems((prev) => [...prev, createEmptyItem()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
              </Button>
            }
          />

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.key}
                className="space-y-3 rounded-lg border bg-accent/20 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Medicamento {idx + 1}
                    {item.productId && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] normal-case text-emerald-700">
                        del catálogo
                      </span>
                    )}
                  </span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() =>
                        setItems((prev) => prev.filter((i) => i.key !== item.key))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Combobox
                    value={item.medicineName}
                    onValueChange={(v) => {
                      const patch: Partial<CreatePrescriptionItemData> = {
                        medicineName: v,
                      };
                      if (
                        item.productId &&
                        medicines.find((m) => m.id === item.productId)?.name !== v
                      ) {
                        patch.productId = undefined;
                      }
                      updateItem(item.key, patch);
                    }}
                    options={medicineOptions}
                    selectedId={item.productId}
                    onOptionSelect={(opt) => {
                      updateItem(item.key, {
                        medicineName: opt.label,
                        productId: opt.id,
                      });
                    }}
                    placeholder="Click para ver catálogo o escribir libremente…"
                    inputClassName="h-10"
                    minChars={0}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dosis</Label>
                    <Input
                      placeholder="Ej. 1 mg"
                      value={item.dosage || ''}
                      onChange={(e) => updateItem(item.key, { dosage: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Frecuencia</Label>
                    <PresetsInput
                      value={item.frequency || ''}
                      onChange={(v) => updateItem(item.key, { frequency: v })}
                      presets={FREQUENCY_PRESETS}
                      placeholder="Ej. Cada 12 h"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Duración (días)</Label>
                    <PresetsInput
                      type="number"
                      min={1}
                      value={item.durationDays?.toString() ?? ''}
                      onChange={(v) =>
                        updateItem(item.key, {
                          durationDays: v ? parseInt(v) : undefined,
                        })
                      }
                      presets={DURATION_PRESETS.map(String)}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Instrucciones</Label>
                    <Input
                      placeholder="Ej. Aplicar en zona afectada después del baño"
                      value={item.instructions || ''}
                      onChange={(e) =>
                        updateItem(item.key, { instructions: e.target.value })
                      }
                      className="h-10"
                    />
                  </div>
                  <label className="flex h-10 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-background px-3 text-xs text-muted-foreground transition-colors hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={item.requiresRefill || false}
                      onChange={(e) =>
                        updateItem(item.key, { requiresRefill: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    Recargas
                  </label>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 pt-1">
        <Button
          type="submit"
          className="h-11 px-8 font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando…' : submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onCancel}
          >
            <X className="mr-1 h-4 w-4" />
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
