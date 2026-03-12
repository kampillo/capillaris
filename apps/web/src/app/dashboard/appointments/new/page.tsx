'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
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
import { useCreateAppointment } from '@/hooks/use-appointments';

export default function NewAppointmentPage() {
  const router = useRouter();
  const createMutation = useCreateAppointment();

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPatientId || !doctorId || !date || !startTime || !endTime) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    const startDatetime = `${date}T${startTime}:00`;
    const endDatetime = `${date}T${endTime}:00`;

    if (endDatetime <= startDatetime) {
      setError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    try {
      await createMutation.mutateAsync({
        patientId: selectedPatientId,
        doctorId,
        title: title || undefined,
        description: description || undefined,
        startDatetime,
        endDatetime,
      });
      router.push('/dashboard/appointments');
    } catch (err: any) {
      setError(err?.message || 'Error al crear la cita');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/appointments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nueva Cita</h2>
          <p className="text-muted-foreground">Programar una nueva cita</p>
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

          {/* Doctor & Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Cita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label>Título</Label>
                <Input
                  placeholder="Ej. Consulta inicial, Revisión post-operatoria"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Notas adicionales..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle>Fecha y Hora *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora inicio</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora fin</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Cita'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/appointments">Cancelar</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
