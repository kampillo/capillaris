import { zodResolver } from '@hookform/resolvers/zod';
import type { UseFormProps } from 'react-hook-form';
import { z } from 'zod';
import { normalizeDriveFolderUrl, PatientType } from '@capillaris/shared';

// Keep the existing validation and defaults shared by the form and its tests.
export const patientSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  celular: z.string().optional(),
  direccion: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  edadApproximada: z.boolean().optional(),
  driveFolderUrl: z.string().max(1000).optional().refine(value => {
    try { normalizeDriveFolderUrl(value); return true; } catch { return false; }
  }, 'Usa el enlace HTTPS de una carpeta de Google Drive'),
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

export function patientFormOptions(
  defaultValues?: Partial<PatientFormValues>,
): UseFormProps<PatientFormValues> {
  return {
    resolver: zodResolver(patientSchema),
    shouldFocusError: true,
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      celular: '',
      driveFolderUrl: '',
      edadApproximada: false,
      tipoPaciente: PatientType.LEAD,
      pais: 'Mexico',
      ...defaultValues,
    },
  };
}
