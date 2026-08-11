'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Syringe, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  useTreatmentTypes,
  useTreatmentsByPatient,
  useCreateTreatment,
  useDeleteTreatment,
  useDoctors,
  useHairTypes,
  type Treatment,
} from '@/hooks/use-clinical';
import { useHasRole } from '@/hooks/use-has-role';
import { formatDateLong, todayInput } from '@/lib/dates';
import { displayName } from '@/lib/names';
import { cn } from '@/lib/utils';

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-brand bg-brand-soft text-brand-dark'
          : 'border-border-strong bg-surface text-foreground hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  );
}

function TarjetaTratamiento({
  tratamiento,
  patientId,
  puedeBorrar,
}: {
  tratamiento: Treatment;
  patientId: string;
  puedeBorrar: boolean;
}) {
  const del = useDeleteTreatment(patientId);
  const tipos = tratamiento.tipos.map((t) => t.treatmentType);

  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[200px] flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {tipos.length > 0 ? (
              tipos.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center rounded-full border border-brand/25 bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-dark"
                >
                  {t.name}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-text-tertiary">
                Sin tipo asignado
              </span>
            )}
            {tratamiento.sesionNumero && (
              <span className="cap-mono text-[11px] text-text-tertiary">
                sesión {tratamiento.sesionNumero}
              </span>
            )}
          </div>
          <div className="text-sm font-semibold">
            {formatDateLong(tratamiento.fecha)}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-text-tertiary">
            {tratamiento.realizadoPor && (
              <span>{displayName(tratamiento.realizadoPor)}</span>
            )}
            {tratamiento.duracion != null && (
              <span>{tratamiento.duracion} min</span>
            )}
            {tratamiento.dilucion && <span>dilución {tratamiento.dilucion}</span>}
          </div>
        </div>
        {puedeBorrar && (
          <button
            type="button"
            onClick={() => del.mutate(tratamiento.id)}
            disabled={del.isPending}
            className="rounded-sm p-1.5 text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Eliminar tratamiento"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {tratamiento.zonas.length > 0 && (
        <div className="mt-3">
          <div className="cap-eyebrow mb-1">Zonas</div>
          <div className="flex flex-wrap gap-1.5">
            {tratamiento.zonas.map((z) => (
              <span
                key={z.hairType.id}
                className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px]"
              >
                {z.hairType.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {(tratamiento.descripcion || tratamiento.comentarios) && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          {tratamiento.descripcion && (
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {tratamiento.descripcion}
            </p>
          )}
          {tratamiento.comentarios && (
            <p className="whitespace-pre-wrap text-xs text-text-secondary">
              {tratamiento.comentarios}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function FormularioTratamiento({
  patientId,
  onSuccess,
  onCancel,
}: {
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const crear = useCreateTreatment();
  const { data: tipos = [] } = useTreatmentTypes();
  const { data: doctores = [] } = useDoctors();
  const { data: zonas = [] } = useHairTypes();

  const [form, setForm] = useState({
    fecha: todayInput(),
    treatmentTypeIds: [] as string[],
    zonaIds: [] as string[],
    realizadoPorId: '',
    sesionNumero: '',
    duracion: '',
    dilucion: '',
    descripcion: '',
    comentarios: '',
  });

  const set = (k: string, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const toggle = (k: 'treatmentTypeIds' | 'zonaIds', id: string) =>
    setForm((prev) => ({
      ...prev,
      [k]: prev[k].includes(id)
        ? prev[k].filter((x) => x !== id)
        : [...prev[k], id],
    }));

  // La micropigmentación es la única que usa dilución y duración.
  const esMicro = useMemo(
    () =>
      tipos.some(
        (t) => t.code === 'MICRO' && form.treatmentTypeIds.includes(t.id),
      ),
    [tipos, form.treatmentTypeIds],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = (v: string) => (v ? Number(v) : undefined);
    const str = (v: string) => v || undefined;

    await crear.mutateAsync({
      patientId,
      fecha: form.fecha,
      treatmentTypeIds: form.treatmentTypeIds.length
        ? form.treatmentTypeIds
        : undefined,
      zonaIds: form.zonaIds.length ? form.zonaIds : undefined,
      realizadoPorId: str(form.realizadoPorId),
      sesionNumero: num(form.sesionNumero),
      duracion: num(form.duracion),
      dilucion: str(form.dilucion),
      descripcion: str(form.descripcion),
      comentarios: str(form.comentarios),
    });
    onSuccess();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-xs"
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="cap-eyebrow">Fecha</Label>
          <DatePicker
            value={form.fecha}
            onChange={(v) => set('fecha', v)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sesion" className="cap-eyebrow">
            Número de sesión
          </Label>
          <Input
            id="sesion"
            type="number"
            min={1}
            value={form.sesionNumero}
            onChange={(e) => set('sesionNumero', e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="realizado" className="cap-eyebrow">
            Realizado por
          </Label>
          <select
            id="realizado"
            value={form.realizadoPorId}
            onChange={(e) => set('realizadoPorId', e.target.value)}
            className="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm"
          >
            <option value="">—</option>
            {doctores.map((d) => (
              <option key={d.id} value={d.id}>
                {displayName(d, { isDoctor: true })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="cap-eyebrow">Tratamientos aplicados</Label>
        <p className="text-[11px] text-text-tertiary">
          Se pueden marcar varios: es común combinarlos en una misma sesión.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tipos.map((t) => (
            <Pill
              key={t.id}
              active={form.treatmentTypeIds.includes(t.id)}
              onClick={() => toggle('treatmentTypeIds', t.id)}
            >
              {t.name}
            </Pill>
          ))}
        </div>
      </div>

      {zonas.length > 0 && (
        <div className="space-y-2">
          <Label className="cap-eyebrow">Zonas tratadas</Label>
          <div className="flex flex-wrap gap-1.5">
            {zonas.map((z) => (
              <Pill
                key={z.id}
                active={form.zonaIds.includes(z.id)}
                onClick={() => toggle('zonaIds', z.id)}
              >
                {z.name}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {esMicro && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="duracion" className="cap-eyebrow">
              Duración (min)
            </Label>
            <Input
              id="duracion"
              type="number"
              min={0}
              value={form.duracion}
              onChange={(e) => set('duracion', e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dilucion" className="cap-eyebrow">
              Dilución
            </Label>
            <Input
              id="dilucion"
              value={form.dilucion}
              onChange={(e) => set('dilucion', e.target.value)}
              placeholder="18:1"
              className="h-11"
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="descripcion" className="cap-eyebrow">
          Descripción
        </Label>
        <Textarea
          id="descripcion"
          rows={2}
          value={form.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          className="resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comentarios" className="cap-eyebrow">
          Comentarios
        </Label>
        <Textarea
          id="comentarios"
          rows={2}
          value={form.comentarios}
          onChange={(e) => set('comentarios', e.target.value)}
          className="resize-none"
        />
      </div>

      {crear.error && (
        <p className="text-xs text-destructive">
          No se pudo guardar el tratamiento.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando...' : 'Guardar tratamiento'}
        </Button>
      </div>
    </form>
  );
}

export default function TreatmentsPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: tratamientos, isLoading } = useTreatmentsByPatient(params.id);
  const canWrite = useHasRole('admin', 'doctor', 'receptionist');
  const canDelete = useHasRole('admin', 'doctor');
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/dashboard/patients/${params.id}`}
        className="inline-flex w-fit items-center gap-1 text-xs text-text-secondary transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Volver al paciente
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="cap-h2 mb-1">Tratamientos</h2>
          <p className="text-[13px] text-text-secondary">
            {tratamientos
              ? `${tratamientos.length} tratamiento${tratamientos.length === 1 ? '' : 's'} registrado${tratamientos.length === 1 ? '' : 's'}`
              : 'Cargando...'}
          </p>
        </div>
        {!showForm && canWrite && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo tratamiento
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-surface py-16 shadow-xs">
          <p className="text-sm text-text-secondary">Cargando...</p>
        </div>
      ) : showForm ? (
        <FormularioTratamiento
          patientId={params.id}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      ) : tratamientos && tratamientos.length > 0 ? (
        <div className="flex flex-col gap-3">
          {tratamientos.map((t) => (
            <TarjetaTratamiento
              key={t.id}
              tratamiento={t}
              patientId={params.id}
              puedeBorrar={canDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-16 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <Syringe className="h-6 w-6 text-text-tertiary" />
          </div>
          <p className="text-sm text-text-secondary">
            No hay tratamientos registrados
          </p>
        </div>
      )}
    </div>
  );
}
