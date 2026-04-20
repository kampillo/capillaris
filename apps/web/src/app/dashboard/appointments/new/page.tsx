'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Search, User, CalendarDays, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar } from '@/components/clinic/avatar';
import { usePatients } from '@/hooks/use-patients';
import { useDoctors } from '@/hooks/use-clinical';
import { useCreateAppointment } from '@/hooks/use-appointments';

const SUGGESTED_SLOTS = [
  '09:00',
  '10:00',
  '11:15',
  '12:30',
  '15:00',
  '16:30',
  '17:45',
];

const TITLE_CHIPS = [
  'Primera consulta',
  'Revisión post-FUE',
  'Evaluación PRP',
  'Micropigmentación',
  'Seguimiento',
];

const DURATIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 h' },
  { value: '120', label: '2 h' },
  { value: '480', label: 'Día completo' },
];

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function SectionHeader({
  icon: Icon,
  label,
  required,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand-dark">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="cap-eyebrow">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </h3>
    </div>
  );
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const createMutation = useCreateAppointment();

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState('45');
  const [status, setStatus] = useState('scheduled');
  const [error, setError] = useState('');

  const { data: patientsData } = usePatients({
    query: patientSearch.length >= 2 ? patientSearch : undefined,
    pageSize: 8,
  });
  const { data: doctors } = useDoctors();

  const patients = patientsData?.data || [];
  const showPatientResults = patientSearch.length >= 2 && !selectedPatientId;
  const endTime = addMinutes(startTime, parseInt(duration, 10));

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

    if (!selectedPatientId || !doctorId || !date || !startTime) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    const startDatetime = `${date}T${startTime}:00`;
    const endDatetime = `${date}T${endTime}:00`;

    try {
      await createMutation.mutateAsync({
        patientId: selectedPatientId,
        doctorId,
        title: title || undefined,
        description: description || undefined,
        startDatetime,
        endDatetime,
        status,
      });
      router.push('/dashboard/appointments');
    } catch (err: any) {
      setError(err?.message || 'Error al crear la cita');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Back + header */}
      <Link
        href="/dashboard/appointments"
        className="inline-flex w-fit items-center gap-1 text-xs text-text-secondary transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Volver a la agenda
      </Link>
      <div>
        <h2 className="cap-h2 mb-1">Nueva cita</h2>
        <p className="text-[13px] text-text-secondary">
          Agenda una nueva consulta, procedimiento o seguimiento.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid max-w-2xl gap-5">
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Patient */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
            <SectionHeader icon={User} label="Paciente" required />
            {selectedPatientId ? (
              <div className="flex items-center gap-3 rounded-md bg-brand-softer p-3">
                <Avatar name={selectedPatientName} size={32} />
                <span className="flex-1 text-sm font-medium">
                  {selectedPatientName}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleClearPatient}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <Input
                  placeholder="Buscar paciente por nombre…"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="h-11 pl-9"
                />
                {showPatientResults && (
                  <div className="animate-scale-in absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                    {patients.length === 0 ? (
                      <div className="p-3 text-sm text-text-tertiary">
                        No se encontraron pacientes
                      </div>
                    ) : (
                      patients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors first:rounded-t-md last:rounded-b-md hover:bg-surface-2"
                          onClick={() =>
                            handleSelectPatient(p.id, p.nombre, p.apellido)
                          }
                        >
                          <Avatar
                            name={`${p.nombre} ${p.apellido}`}
                            size={28}
                          />
                          <span className="flex-1">
                            <span className="font-medium">
                              {p.nombre} {p.apellido}
                            </span>
                            {p.celular && (
                              <span className="cap-mono ml-2 text-xs text-text-tertiary">
                                {p.celular}
                              </span>
                            )}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Date + time */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
            <SectionHeader icon={Clock} label="Fecha y hora" required />
            <div className="grid gap-4">
              <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-3">
                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duración</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Horarios sugeridos</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_SLOTS.map((slot) => {
                    const active = startTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setStartTime(slot)}
                        className={cn(
                          'cap-mono rounded-sm border px-3 py-1.5 text-xs transition-colors',
                          active
                            ? 'border-brand bg-brand text-white'
                            : 'border-border-strong bg-surface text-foreground hover:bg-surface-2',
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="cap-mono text-[11px] text-text-tertiary">
                Termina a las {endTime}
              </p>
            </div>
          </section>

          {/* Doctor + title + description */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-xs">
            <SectionHeader icon={CalendarDays} label="Detalles" />
            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label>Motivo / título</Label>
                <Input
                  placeholder="Ej. Primera consulta, Revisión post-FUE…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11"
                />
                <div className="flex flex-wrap gap-1.5">
                  {TITLE_CHIPS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTitle(t)}
                      className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-foreground"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Notas adicionales…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Estado inicial</Label>
                <div className="flex gap-2">
                  {(
                    [
                      { v: 'scheduled', l: 'Programada' },
                      { v: 'confirmed', l: 'Confirmada' },
                    ] as const
                  ).map((o) => {
                    const active = status === o.v;
                    return (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setStatus(o.v)}
                        className={cn(
                          'rounded-sm border px-3.5 py-2 text-xs font-medium transition-colors',
                          active
                            ? 'border-brand bg-brand-soft text-brand-dark'
                            : 'border-border-strong bg-surface text-foreground hover:bg-surface-2',
                        )}
                      >
                        {o.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              className="h-11 px-8 font-medium"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creando...' : 'Agendar cita'}
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
