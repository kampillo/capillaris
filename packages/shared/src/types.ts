import type {
  PatientType,
  Gender,
  MaritalStatus,
  Occupation,
  OriginChannel,
  AppointmentStatus,
  PrescriptionStatus,
  HairThickness,
  HairColor,
  HairTexture,
  DonorZoneAssessment,
  StockMovementType,
  StockMovementReason,
  ReminderType,
  ReminderChannel,
  ReminderStatus,
  UserRole,
} from './enums';

// Base types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditableEntity extends BaseEntity {
  createdBy?: string;
  updatedBy?: string;
}

export interface SoftDeletableEntity extends AuditableEntity {
  deletedAt?: string | null;
}

// User
export interface User extends SoftDeletableEntity {
  nombre: string;
  apellido: string;
  email: string;
  celular?: string;
  cedulaProfesional?: string;
  fechaNacimiento?: string;
  avatarUrl?: string;
  isActive: boolean;
  roles?: UserRole[];
}

// Patient
export interface Patient extends SoftDeletableEntity {
  nombre: string;
  apellido: string;
  email?: string;
  celular?: string;
  celularNormalized?: string;
  direccion?: string;
  fechaNacimiento?: string;
  edadApproximada: boolean;
  genero?: Gender;
  estadoCivil?: MaritalStatus;
  ocupacion?: Occupation;
  tipoPaciente: PatientType;
  origenCanal?: OriginChannel;
  referidoPor?: string;
  ciudad?: string;
  estado?: string;
  pais: string;
  consentDataProcessing: boolean;
  consentMarketing: boolean;
  consentDate?: string;
  notasInternas?: string;
  legacyId?: number;
}

// Appointment
export interface Appointment extends AuditableEntity {
  patientId: string;
  doctorId: string;
  title?: string;
  description?: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes?: number;
  status: AppointmentStatus;
  cancellationReason?: string;
  googleCalendarEventId?: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

// Prescription
export interface Prescription extends AuditableEntity {
  patientId: string;
  doctorId: string;
  prescriptionDate: string;
  notas?: string;
  status: PrescriptionStatus;
  expiresAt?: string;
}

export interface PrescriptionItem extends BaseEntity {
  prescriptionId: string;
  productId?: string;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  quantity: number;
  instructions?: string;
  requiresRefill: boolean;
  refillReminderDays?: number;
  dispensed: boolean;
  dispensedAt?: string;
  dispensedBy?: string;
  dispensedQuantity?: number;
}

// Medical Consultation
export interface MedicalConsultation extends AuditableEntity {
  patientId: string;
  doctorId: string;
  grosor?: HairThickness;
  caspa?: boolean;
  color?: HairColor;
  grasa?: boolean;
  textura?: HairTexture;
  valoracionZonaDonante?: DonorZoneAssessment;
  diagnostico?: string;
  estrategiaQuirurgica?: string;
  fechaSugeridaTransplante?: string;
  comentarios?: string;
  consultationDate: string;
}

// Procedure Report
export interface AnesthesiaDetail {
  fechaInicial?: string;
  fechaFinal?: string;
  lidocaina?: string;
  adrenalina?: number;
  bicarbonatoDeSodio?: number;
  solucionFisiologica?: number;
  anestesiaInfiltrada?: string;
  betametasona?: string;
}

export interface ProcedureReport extends AuditableEntity {
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
  anesthesiaExtraction?: AnesthesiaDetail;
  anesthesiaImplantation?: AnesthesiaDetail;
  doctorIds?: string[];
  hairTypeIds?: string[];
}

// Clinical History
export interface ClinicalHistory extends AuditableEntity {
  patientId: string;
  personalesPatologicos?: string;
  padecimientoActual?: string;
  tratamiento?: string;
}

export interface InheritRelatives {
  negados: boolean;
  hta: boolean;
  dm: boolean;
  ca: boolean;
  respiratorios: boolean;
  otros?: string;
}

export interface NonPathologicalPersonals {
  tabaquismo: boolean;
  alcoholismo: boolean;
  alergias: boolean;
  actFisica: boolean;
  otros?: string;
}

export interface PreviousTreatments {
  minoxidil: boolean;
  fue: boolean;
  finasteride: boolean;
  fuss: boolean;
  dutasteride: boolean;
  bicalutamida: boolean;
  negados: boolean;
  otros?: string;
}

export interface PhysicalExploration {
  fc?: number;
  ta?: string;
  fr?: number;
  temperatura?: number;
  peso?: number;
  talla?: number;
  description?: string;
}

// Micropigmentation
export interface Micropigmentation extends AuditableEntity {
  patientId: string;
  doctorId: string;
  fecha: string;
  duracion?: number;
  dilucion?: string;
  descripcion?: string;
  comments?: string;
  hairTypeIds?: string[];
}

// Hairmedicine
export interface Hairmedicine extends AuditableEntity {
  patientId: string;
  doctorId: string;
  fecha: string;
  descripcion?: string;
  comments?: string;
}

// Product & Inventory
export interface Product extends AuditableEntity {
  sku?: string;
  name: string;
  description?: string;
  categoryId?: string;
  content?: number;
  unit?: string;
  unitPrice?: number;
  isMedicine: boolean;
  requiresPrescription: boolean;
  isActive: boolean;
  imageUrl?: string;
  minStockAlert: number;
}

export interface StockMovement extends BaseEntity {
  productId: string;
  movementType: StockMovementType;
  reason: StockMovementReason;
  quantity: number;
  relatedEntityType?: string;
  relatedEntityId?: string;
  notes?: string;
  createdBy?: string;
}

export interface StockBalance {
  id: string;
  productId: string;
  currentQuantity: number;
  updatedAt: string;
}

// Patient Image
export interface PatientImage extends BaseEntity {
  patientId: string;
  s3Key: string;
  s3Bucket?: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  isFavorite: boolean;
  isBefore: boolean;
  isAfter: boolean;
  imageType?: string;
  takenAt?: string;
  procedureReportId?: string;
  uploadedBy?: string;
}

// Reminder
export interface Reminder extends BaseEntity {
  patientId: string;
  reminderType: ReminderType;
  relatedEntityType?: string;
  relatedEntityId?: string;
  scheduledFor: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  sentAt?: string;
  errorMessage?: string;
  messageTemplate?: string;
  messageVariables?: Record<string, unknown>;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// API error response
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, string[]>;
}
