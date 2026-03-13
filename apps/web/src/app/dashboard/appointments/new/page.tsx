'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, CalendarDays, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
          <Link href="/dashboard/appointments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nueva Cita</h2>
          <p className="text-sm text-muted-foreground">Programar una nueva cita</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 max-w-2xl">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Patient Search */}
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Paciente <span className="text-destructive">*</span></h3>
              </div>
              {selectedPatientId ? (
                <div className="flex items-center justify-between rounded-lg border p-3 bg-accent/30">
                  <span className="text-sm font-medium">{selectedPatientName}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={handleClearPatient}>
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
                    className="pl-9 h-11"
                  />
                  {showPatientResults && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border bg-popover shadow-xl max-h-60 overflow-y-auto">
                      {patients.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          No se encontraron pacientes
                        </div>
                      ) : (
                        patients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
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
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Detalles de la Cita</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Doctor <span className="text-destructive">*</span></Label>
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
                  <Label>Título</Label>
                  <Input
                    placeholder="Ej. Consulta inicial, Revisión post-operatoria"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Descripción</Label>
                  <Textarea
                    placeholder="Notas adicionales..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                  <Clock className="h-4 w-4 text-violet-600" />
                </div>
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Fecha y Hora <span className="text-destructive">*</span></h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Hora inicio</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hora fin</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="h-11 px-8 font-medium" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Cita'}
            </Button>
            <Button type="button" variant="outline" className="h-11" asChild>
              <Link href="/dashboard/appointments">Cancelar</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
