'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePatients } from '@/hooks/use-patients';
import { useDoctors } from '@/hooks/use-clinical';
import {
  useCreatePrescription,
  type CreatePrescriptionItemData,
} from '@/hooks/use-prescriptions';

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
  };
}

export default function NewPrescriptionPage() {
  const router = useRouter();
  const createMutation = useCreatePrescription();

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<ItemForm[]>([createEmptyItem()]);
  const [error, setError] = useState('');

  const { data: patientsData } = usePatients({
    query: patientSearch.length >= 2 ? patientSearch : undefined,
    pageSize: 8,
  });
  const { data: doctors } = useDoctors();

  const patients = patientsData?.data || [];
  const showPatientResults = patientSearch.length >= 2 && !selectedPatientId;

  const handleSelectPatient = (id: string, nombre: string, apellido: string) => {
    setSelectedPatientId(id);
    setSelectedPatientName(`${nombre} ${apellido}`);
    setPatientSearch('');
  };

  const handleClearPatient = () => {
    setSelectedPatientId('');
    setSelectedPatientName('');
    setPatientSearch('');
  };

  const updateItem = (key: number, field: keyof CreatePrescriptionItemData, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const removeItem = (key: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPatientId || !doctorId || !prescriptionDate) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    const validItems = items.filter((i) => i.medicineName.trim());
    if (validItems.length === 0) {
      setError('Agrega al menos un medicamento');
      return;
    }

    try {
      await createMutation.mutateAsync({
        patientId: selectedPatientId,
        doctorId,
        prescriptionDate,
        notas: notas || undefined,
        status: 'active',
        items: validItems.map(({ key, ...rest }) => ({
          ...rest,
          medicineName: rest.medicineName.trim(),
          dosage: rest.dosage || undefined,
          frequency: rest.frequency || undefined,
          durationDays: rest.durationDays || undefined,
          instructions: rest.instructions || undefined,
        })),
      });
      router.push('/dashboard/prescriptions');
    } catch (err: any) {
      setError(err?.message || 'Error al crear la prescripción');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/prescriptions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nueva Prescripción</h2>
          <p className="text-muted-foreground">Crear una nueva prescripción médica</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 max-w-2xl">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Patient Search */}
          <Card>
            <CardHeader>
              <CardTitle>Paciente *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedPatientId ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="font-medium">{selectedPatientName}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={handleClearPatient}>
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar paciente por nombre..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9"
                  />
                  {showPatientResults && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
                      {patients.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          No se encontraron pacientes
                        </div>
                      ) : (
                        patients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                            onClick={() => handleSelectPatient(p.id, p.nombre, p.apellido)}
                          >
                            <span className="font-medium">{p.nombre} {p.apellido}</span>
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

          {/* Doctor & Date */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Doctor *</Label>
                  <Select value={doctorId} onValueChange={setDoctorId}>
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={prescriptionDate}
                    onChange={(e) => setPrescriptionDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  placeholder="Notas adicionales..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Medication Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Medicamentos *</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-4 w-4" /> Agregar
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {items.map((item, idx) => (
                <div key={item.key} className="space-y-3 border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Medicamento {idx + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeItem(item.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del medicamento *</Label>
                    <Input
                      placeholder="Ej. Minoxidil 5%, Finasteride 1mg"
                      value={item.medicineName}
                      onChange={(e) => updateItem(item.key, 'medicineName', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Dosis</Label>
                      <Input
                        placeholder="Ej. 1mg"
                        value={item.dosage || ''}
                        onChange={(e) => updateItem(item.key, 'dosage', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frecuencia</Label>
                      <Input
                        placeholder="Ej. Cada 12h"
                        value={item.frequency || ''}
                        onChange={(e) => updateItem(item.key, 'frequency', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Días</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="30"
                        value={item.durationDays ?? ''}
                        onChange={(e) =>
                          updateItem(item.key, 'durationDays', e.target.value ? parseInt(e.target.value) : undefined)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Instrucciones</Label>
                    <Input
                      placeholder="Ej. Aplicar en zona afectada"
                      value={item.instructions || ''}
                      onChange={(e) => updateItem(item.key, 'instructions', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Prescripción'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/prescriptions">Cancelar</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
