export type RoleName = 'admin' | 'doctor' | 'receptionist' | 'inventory_manager' | 'nurse';

const DISPLAY_NAMES: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Doctor',
  receptionist: 'Recepción',
  inventory_manager: 'Inventario',
  nurse: 'Enfermería',
};

export function roleDisplayName(name: string): string {
  return DISPLAY_NAMES[name] ?? name;
}
