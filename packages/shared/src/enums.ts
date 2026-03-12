// Patient enums
export enum PatientType {
  LEAD = 'lead',
  REGISTERED = 'registered',
  EVALUATION = 'evaluation',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum Gender {
  HOMBRE = 'hombre',
  MUJER = 'mujer',
  OTRO = 'otro',
  PREFIERO_NO_DECIR = 'prefiero_no_decir',
}

export enum MaritalStatus {
  SOLTERO = 'soltero',
  CASADO = 'casado/a',
  UNION_LIBRE = 'union libre',
  DIVORCIADO = 'divorciado/a',
  VIUDO = 'viudo/a',
  OTRO = 'otro',
}

export enum Occupation {
  PROFESIONISTA = 'profesionista',
  TECNICO = 'tecnico',
  ESTUDIANTE = 'estudiante',
  OTRO = 'otro',
}

export enum OriginChannel {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  WHATSAPP = 'whatsapp',
  WEB = 'web',
  REFERIDO = 'referido',
  GOOGLE = 'google',
  OTRO = 'otro',
}

// Appointment enums
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

// Prescription enums
export enum PrescriptionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

// Medical consultation enums
export enum HairThickness {
  FRAGIL = 'fragil',
  MEDIANO = 'mediano',
  GRUESO = 'grueso',
}

export enum HairColor {
  NEGRO = 'negro',
  CASTANO = 'castaño',
  RUBIO = 'rubio',
  BLANCO = 'blanco',
  OTRO = 'otro',
}

export enum HairTexture {
  RIZADO = 'rizado',
  LISO = 'liso',
  ONDULADO = 'ondulado',
}

export enum DonorZoneAssessment {
  ESCASA = 'escasa',
  MEDIA = 'media',
  SUFICIENTE = 'suficiente',
  AMPLIA = 'amplia',
}

// Inventory enums
export enum StockMovementType {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  AJUSTE = 'ajuste',
}

export enum StockMovementReason {
  COMPRA = 'compra',
  PRESCRIPCION = 'prescripcion',
  PROCEDIMIENTO = 'procedimiento',
  AJUSTE_MANUAL = 'ajuste_manual',
  MERMA = 'merma',
  DEVOLUCION = 'devolucion',
}

// Reminder enums
export enum ReminderType {
  APPOINTMENT = 'appointment',
  PRESCRIPTION_REFILL = 'prescription_refill',
  FOLLOW_UP = 'follow_up',
}

export enum ReminderChannel {
  INTERNAL = 'internal',
  EMAIL = 'email',
}

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Audit enums
export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

// User roles
export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  RECEPTIONIST = 'receptionist',
  INVENTORY_MANAGER = 'inventory_manager',
}
