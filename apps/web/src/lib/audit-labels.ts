const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creó',
  UPDATE: 'Actualizó',
  DELETE: 'Eliminó',
  CREATE_MANY: 'Creó varios',
  UPDATE_MANY: 'Actualizó varios',
  DELETE_MANY: 'Eliminó varios',
  LOGIN: 'Inicio de sesión',
  LOGIN_FAILED: 'Login fallido',
  LOGOUT: 'Cierre de sesión',
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'Usuario',
  patient: 'Paciente',
  appointment: 'Cita',
  prescription: 'Receta',
  medicalConsultation: 'Consulta',
  clinicalHistory: 'Historia clínica',
  procedureReport: 'Procedimiento',
  micropigmentation: 'Micropigmentación',
  hairmedicine: 'Hairmedicine',
  patientImage: 'Imagen',
  reminder: 'Recordatorio',
  product: 'Producto',
  stockMovement: 'Movimiento de stock',
  role: 'Rol',
  userRole: 'Asignación de rol',
  rolePermission: 'Permiso',
  permission: 'Permiso',
  googleToken: 'Token Google',
  auth: 'Sesión',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

export function actionVariant(action: string): 'create' | 'update' | 'delete' | 'auth' {
  if (action === 'CREATE' || action === 'CREATE_MANY') return 'create';
  if (action === 'UPDATE' || action === 'UPDATE_MANY') return 'update';
  if (action === 'DELETE' || action === 'DELETE_MANY') return 'delete';
  return 'auth';
}
