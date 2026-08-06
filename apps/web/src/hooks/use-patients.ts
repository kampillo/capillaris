import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Patient {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  celular?: string;
  direccion?: string;
  fechaNacimiento?: string;
  edadApproximada?: boolean;
  genero?: string;
  estadoCivil?: string;
  ocupacion?: string;
  tipoPaciente?: string;
  origenCanal?: string;
  referidoPor?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
  consentDataProcessing?: boolean;
  consentMarketing?: boolean;
  notasInternas?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PatientDetail extends Patient {
  appointments: any[];
  prescriptions: any[];
  medicalConsultations: any[];
  procedureReports: any[];
  clinicalHistories: any[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export type PatientSortField =
  | 'name'
  | 'tipoPaciente'
  | 'origenCanal'
  | 'updatedAt'
  | 'createdAt';

export interface SearchParams {
  query?: string;
  tipoPaciente?: string;
  page?: number;
  pageSize?: number;
  sortBy?: PatientSortField;
  sortOrder?: 'asc' | 'desc';
}

export type CreatePatientData = Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdatePatientData = Partial<CreatePatientData>;

export function usePatients(params: SearchParams = {}) {
  const searchParams: Record<string, string> = {};
  if (params.query) searchParams.query = params.query;
  if (params.tipoPaciente) searchParams.tipoPaciente = params.tipoPaciente;
  if (params.page) searchParams.page = String(params.page);
  if (params.pageSize) searchParams.pageSize = String(params.pageSize);
  if (params.sortBy) searchParams.sortBy = params.sortBy;
  if (params.sortOrder) searchParams.sortOrder = params.sortOrder;

  const hasSearch = params.query || params.tipoPaciente;
  const endpoint = hasSearch ? '/patients/search' : '/patients';

  return useQuery<PaginatedResponse<Patient>>({
    queryKey: ['patients', params],
    queryFn: () => api.get(endpoint, { params: searchParams }),
  });
}

export function usePatient(id: string) {
  return useQuery<PatientDetail>({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientData) =>
      api.post<Patient>('/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePatientData }) =>
      api.put<Patient>(`/patients/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/patients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

// ============================================================
// Duplicados y fusión
// ============================================================

export type ClasificacionDuplicado =
  | 'fusion_obligatoria'
  | 'borrado_seguro'
  | 'ambos_vacios';

export interface ConteoRegistros {
  appointments: number;
  medicalConsultations: number;
  procedureReports: number;
  prescriptions: number;
  clinicalHistories: number;
  patientImages: number;
  micropigmentations: number;
  hairmedicines: number;
  reminders: number;
}

export interface PacienteDuplicado extends Patient {
  legacyId?: number;
  totalRegistros: number;
  _count: ConteoRegistros;
}

export interface GrupoDuplicado {
  key: string;
  clasificacion: ClasificacionDuplicado;
  conflictos: string[];
  sugeridoConservarId: string;
  pacientes: PacienteDuplicado[];
}

export function useDuplicatePatients(enabled = true) {
  return useQuery<GrupoDuplicado[]>({
    queryKey: ['patients', 'duplicates'],
    queryFn: () => api.get('/patients/duplicates'),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useMergePatients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      survivorId,
      absorbedId,
      campos,
    }: {
      survivorId: string;
      absorbedId: string;
      campos?: Partial<Patient>;
    }) =>
      api.post(`/patients/${survivorId}/merge`, { absorbedId, campos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
