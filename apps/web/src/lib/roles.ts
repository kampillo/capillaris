export type RoleName = 'admin' | 'doctor' | 'receptionist' | 'inventory_manager' | 'nurse' | 'treatment_staff';

const DISPLAY_NAMES: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Doctor',
  receptionist: 'Recepción',
  inventory_manager: 'Inventario',
  nurse: 'Enfermería quirúrgica',
  treatment_staff: 'Tratamientos',
};

export function roleDisplayName(name: string): string {
  return DISPLAY_NAMES[name] ?? name;
}

export function restrictedWorkspace(roles: string[], pathname: string) {
  const surgery = roles.includes('nurse');
  const treatments = roles.includes('treatment_staff');
  return {
    restricted: surgery || treatments,
    surgery,
    treatments,
    home: surgery ? '/dashboard/nursing' : '/dashboard/treatment-care',
    allowed: (surgery && /^\/dashboard\/nursing(?:\/[a-f0-9-]+)?$/.test(pathname)) ||
      (treatments && /^\/dashboard\/treatment-care(?:\/[a-f0-9-]+)?$/.test(pathname)),
  };
}
