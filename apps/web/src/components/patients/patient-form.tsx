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
} from '@/components/ui/card';
import {
  PatientType,
  Gender,
  MaritalStatus,
  Occupation,
  OriginChannel,
} from '@capillaris/shared';
import { User, MapPin, Tag, FileCheck } from 'lucide-react';

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

function SectionHeader({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{title}</h3>
    </div>
  );
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
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={User} title="Información Personal" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre <span className="text-destructive">*</span></Label>
              <Input id="nombre" {...register('nombre')} className="h-11" placeholder="Nombre del paciente" />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apellido">Apellido <span className="text-destructive">*</span></Label>
              <Input id="apellido" {...register('apellido')} className="h-11" placeholder="Apellido del paciente" />
              {errors.apellido && (
                <p className="text-xs text-destructive">{errors.apellido.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} className="h-11" placeholder="correo@ejemplo.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="celular">Celular</Label>
              <Input id="celular" {...register('celular')} className="h-11" placeholder="+52 55 1234 5678" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
              <Input
                id="fechaNacimiento"
                type="date"
                {...register('fechaNacimiento')}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Género</Label>
              <Select
                value={watch('genero') || ''}
                onValueChange={(val) => setValue('genero', val)}
              >
                <SelectTrigger className="h-11">
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

            <div className="space-y-1.5">
              <Label>Estado Civil</Label>
              <Select
                value={watch('estadoCivil') || ''}
                onValueChange={(val) => setValue('estadoCivil', val)}
              >
                <SelectTrigger className="h-11">
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

            <div className="space-y-1.5">
              <Label>Ocupación</Label>
              <Select
                value={watch('ocupacion') || ''}
                onValueChange={(val) => setValue('ocupacion', val)}
              >
                <SelectTrigger className="h-11">
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

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register('edadApproximada')}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Edad aproximada
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={MapPin} title="Dirección" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" {...register('direccion')} className="h-11" placeholder="Calle, número, colonia..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input id="ciudad" {...register('ciudad')} className="h-11" placeholder="Ciudad" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estado">Estado</Label>
              <Input id="estado" {...register('estado')} className="h-11" placeholder="Estado" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pais">País</Label>
              <Input id="pais" {...register('pais')} className="h-11" placeholder="País" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={Tag} title="Clasificación" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label>Tipo de Paciente</Label>
              <Select
                value={watch('tipoPaciente') || ''}
                onValueChange={(val) => setValue('tipoPaciente', val)}
              >
                <SelectTrigger className="h-11">
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

            <div className="space-y-1.5">
              <Label>Canal de Origen</Label>
              <Select
                value={watch('origenCanal') || ''}
                onValueChange={(val) => setValue('origenCanal', val)}
              >
                <SelectTrigger className="h-11">
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

            <div className="space-y-1.5">
              <Label htmlFor="referidoPor">Referido Por</Label>
              <Input id="referidoPor" {...register('referidoPor')} className="h-11" placeholder="Nombre de quien refiere" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consent & Notes */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <SectionHeader icon={FileCheck} title="Consentimiento y Notas" />
          <div className="space-y-5">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register('consentDataProcessing')}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Consiente procesamiento de datos
              </label>

              <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register('consentMarketing')}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Consiente marketing
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notasInternas">Notas Internas</Label>
              <Textarea
                id="notasInternas"
                {...register('notasInternas')}
                placeholder="Notas internas sobre el paciente..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" className="h-11 px-8 font-medium" disabled={isLoading}>
          {isLoading ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
