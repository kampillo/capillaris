'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  PatientType,
  Gender,
  MaritalStatus,
  Occupation,
  OriginChannel,
} from '@capillaris/shared';

const patientSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  celular: z.string().optional(),
  direccion: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  edadApproximada: z.boolean().optional(),
  genero: z.string().optional(),
  estadoCivil: z.string().optional(),
  ocupacion: z.string().optional(),
  tipoPaciente: z.string().optional(),
  origenCanal: z.string().optional(),
  referidoPor: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  pais: z.string().optional(),
  consentDataProcessing: z.boolean().optional(),
  consentMarketing: z.boolean().optional(),
  notasInternas: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

const PATIENT_TYPE_LABELS: Record<string, string> = {
  [PatientType.LEAD]: 'Lead',
  [PatientType.REGISTERED]: 'Registrado',
  [PatientType.EVALUATION]: 'En evaluación',
  [PatientType.ACTIVE]: 'Activo',
  [PatientType.INACTIVE]: 'Inactivo',
  [PatientType.ARCHIVED]: 'Archivado',
};

const GENDER_LABELS: Record<string, string> = {
  [Gender.HOMBRE]: 'Hombre',
  [Gender.MUJER]: 'Mujer',
  [Gender.OTRO]: 'Otro',
  [Gender.PREFIERO_NO_DECIR]: 'Prefiero no decir',
};

const MARITAL_STATUS_LABELS: Record<string, string> = {
  [MaritalStatus.SOLTERO]: 'Soltero/a',
  [MaritalStatus.CASADO]: 'Casado/a',
  [MaritalStatus.UNION_LIBRE]: 'Unión libre',
  [MaritalStatus.DIVORCIADO]: 'Divorciado/a',
  [MaritalStatus.VIUDO]: 'Viudo/a',
  [MaritalStatus.OTRO]: 'Otro',
};

const OCCUPATION_LABELS: Record<string, string> = {
  [Occupation.PROFESIONISTA]: 'Profesionista',
  [Occupation.TECNICO]: 'Técnico',
  [Occupation.ESTUDIANTE]: 'Estudiante',
  [Occupation.OTRO]: 'Otro',
};

const ORIGIN_LABELS: Record<string, string> = {
  [OriginChannel.FACEBOOK]: 'Facebook',
  [OriginChannel.INSTAGRAM]: 'Instagram',
  [OriginChannel.WHATSAPP]: 'WhatsApp',
  [OriginChannel.WEB]: 'Web',
  [OriginChannel.REFERIDO]: 'Referido',
  [OriginChannel.GOOGLE]: 'Google',
  [OriginChannel.OTRO]: 'Otro',
};

interface PatientFormProps {
  defaultValues?: Partial<PatientFormValues>;
  onSubmit: (data: PatientFormValues) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function PatientForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Guardar',
}: PatientFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      celular: '',
      tipoPaciente: PatientType.LEAD,
      pais: 'Mexico',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" {...register('nombre')} />
            {errors.nombre && (
              <p className="text-sm text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido *</Label>
            <Input id="apellido" {...register('apellido')} />
            {errors.apellido && (
              <p className="text-sm text-destructive">{errors.apellido.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input id="celular" {...register('celular')} placeholder="+52 55 1234 5678" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
            <Input
              id="fechaNacimiento"
              type="date"
              {...register('fechaNacimiento')}
            />
          </div>

          <div className="space-y-2">
            <Label>Género</Label>
            <Select
              value={watch('genero') || ''}
              onValueChange={(val) => setValue('genero', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estado Civil</Label>
            <Select
              value={watch('estadoCivil') || ''}
              onValueChange={(val) => setValue('estadoCivil', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MARITAL_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ocupación</Label>
            <Select
              value={watch('ocupacion') || ''}
              onValueChange={(val) => setValue('ocupacion', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OCCUPATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('edadApproximada')}
                className="rounded border-input"
              />
              Edad aproximada
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Dirección</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" {...register('direccion')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" {...register('ciudad')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Input id="estado" {...register('estado')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pais">País</Label>
            <Input id="pais" {...register('pais')} />
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Clasificación</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Paciente</Label>
            <Select
              value={watch('tipoPaciente') || ''}
              onValueChange={(val) => setValue('tipoPaciente', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PATIENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Canal de Origen</Label>
            <Select
              value={watch('origenCanal') || ''}
              onValueChange={(val) => setValue('origenCanal', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORIGIN_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referidoPor">Referido Por</Label>
            <Input id="referidoPor" {...register('referidoPor')} />
          </div>
        </CardContent>
      </Card>

      {/* Consent & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Consentimiento y Notas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('consentDataProcessing')}
                className="rounded border-input"
              />
              Consiente procesamiento de datos
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('consentMarketing')}
                className="rounded border-input"
              />
              Consiente marketing
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notasInternas">Notas Internas</Label>
            <Textarea
              id="notasInternas"
              {...register('notasInternas')}
              placeholder="Notas internas sobre el paciente..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
