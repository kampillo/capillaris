import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---- Clinical Histories ----

export interface ClinicalHistory {
  id: string;
  patientId: string;
  personalesPatologicos?: string;
  padecimientoActual?: string;
  tratamiento?: string;
  inheritRelatives?: {
    id: string;
    negados: boolean;
    hta: boolean;
    dm: boolean;
    ca: boolean;
    respiratorios: boolean;
    otros?: string;
  };
  nonPathologicalPersonal?: {
    id: string;
    tabaquismo: boolean;
    alcoholismo: boolean;
    alergias: boolean;
    actFisica: boolean;
    otros?: string;
  };
  previousTreatment?: {
    id: string;
    minoxidil: boolean;
    fue: boolean;
    finasteride: boolean;
    fuss: boolean;
    dutasteride: boolean;
    bicalutamida: boolean;
    negados: boolean;
    otros?: string;
  };
  physicalExploration?: {
    id: string;
    fc?: number;
    ta?: string;
    fr?: number;
    temperatura?: number;
    peso?: number;
    talla?: number;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function useClinicalHistoriesByPatient(patientId: string) {
  return useQuery<ClinicalHistory[]>({
    queryKey: ['clinical-histories', 'patient', patientId],
    queryFn: () => api.get(`/clinical-histories/patient/${patientId}`),
    enabled: !!patientId,
  });
}

export function useCreateClinicalHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<ClinicalHistory>('/clinical-histories', data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['clinical-histories', 'patient', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

// ---- Medical Consultations ----

export interface MedicalConsultation {
  id: string;
  patientId: string;
  doctorId: string;
  consultationDate: string;
  grosor?: string;
  caspa?: boolean;
  color?: string;
  grasa?: boolean;
  textura?: string;
  valoracionZonaDonante?: string;
  diagnostico?: string;
  estrategiaQuirurgica?: string;
  fechaSugeridaTransplante?: string;
  comentarios?: string;
  doctor?: { id: string; nombre: string; apellido: string };
  donorZones?: { donorZone: { id: string; name: string } }[];
  variants?: { variant: { id: string; name: string } }[];
  createdAt: string;
}

export function useConsultationsByPatient(patientId: string) {
  return useQuery<MedicalConsultation[]>({
    queryKey: ['consultations', 'patient', patientId],
    queryFn: () => api.get(`/medical-consultations/patient/${patientId}`),
    enabled: !!patientId,
  });
}

export function useCreateConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<MedicalConsultation>('/medical-consultations', data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['consultations', 'patient', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

// ---- Procedures ----

export interface ProcedureReport {
  id: string;
  patientId: string;
  procedureDate: string;
  descripcion?: string;
  punchSize?: number;
  implantador?: string;
  cb1?: number;
  cb2?: number;
  cb3?: number;
  cb4?: number;
  totalFoliculos?: number;
  anestExtFechaInicial?: string;
  anestExtFechaFinal?: string;
  anestExtLidocaina?: string;
  anestExtAdrenalina?: number;
  anestExtBicarbonatoDeSodio?: number;
  anestExtSolucionFisiologica?: number;
  anestExtAnestesiaInfiltrada?: string;
  anestExtBetametasona?: string;
  anestImpFechaInicial?: string;
  anestImpFechaFinal?: string;
  anestImpLidocaina?: string;
  anestImpAdrenalina?: number;
  anestImpBicarbonatoDeSodio?: number;
  anestImpSolucionFisiologica?: number;
  anestImpAnestesiaInfiltrada?: string;
  anestImpBetametasona?: string;
  doctors?: { doctor: { id: string; nombre: string; apellido: string } }[];
  hairTypes?: { hairType: { id: string; name: string } }[];
  createdAt: string;
}

export function useProceduresByPatient(patientId: string) {
  return useQuery<ProcedureReport[]>({
    queryKey: ['procedures', 'patient', patientId],
    queryFn: () => api.get(`/procedures/patient/${patientId}`),
    enabled: !!patientId,
  });
}

export function useCreateProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<ProcedureReport>('/procedures', data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['procedures', 'patient', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

// ---- Catalog data ----

interface CatalogItem {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

export function useDonorZones() {
  return useQuery<CatalogItem[]>({
    queryKey: ['catalog', 'donor-zones'],
    queryFn: () => api.get('/catalog/donor-zones'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVariants() {
  return useQuery<CatalogItem[]>({
    queryKey: ['catalog', 'variants'],
    queryFn: () => api.get('/catalog/variants'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useHairTypes() {
  return useQuery<CatalogItem[]>({
    queryKey: ['catalog', 'hair-types'],
    queryFn: () => api.get('/catalog/hair-types'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDoctors() {
  return useQuery<Doctor[]>({
    queryKey: ['catalog', 'doctors'],
    queryFn: () => api.get('/catalog/doctors'),
    staleTime: 5 * 60 * 1000,
  });
}
