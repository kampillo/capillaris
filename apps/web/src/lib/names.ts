export type NamedUser = {
  nombre?: string | null;
  apellido?: string | null;
  roles?: string[] | null;
};

/** "Ana Torres" — sin título. */
export function fullName(user?: NamedUser | null): string {
  if (!user) return '';
  return [user.nombre, user.apellido].filter(Boolean).join(' ').trim();
}

/**
 * Nombre para mostrar, con "Dr." sólo cuando consta que la persona es médico.
 *
 * No todos los usuarios del sistema son doctores: recepción e inventario
 * también tienen cuenta, y el sistema les anteponía "Dr." a todos. Esa fue
 * una de las observaciones de la clínica.
 *
 * El título se pone en dos casos:
 *
 * - `user.roles` incluye `doctor` — es el caso del usuario en sesión, que sí
 *   trae sus roles desde el login.
 * - `opts.isDoctor` viene en true — para las listas que salen de
 *   `/catalog/doctors`, que el API ya filtra por rol de doctor.
 *
 * Cuando no hay forma de saberlo (las relaciones `doctor` que devuelve el API
 * en citas, recetas y consultas no incluyen roles) se muestra el nombre solo.
 * Preferimos quedarnos cortos antes que darle título a quien no lo tiene.
 */
export function displayName(
  user?: NamedUser | null,
  opts?: { isDoctor?: boolean },
): string {
  const nombre = fullName(user);
  if (!nombre) return '';
  const esDoctor = opts?.isDoctor ?? user?.roles?.includes('doctor') ?? false;
  return esDoctor ? `Dr. ${nombre}` : nombre;
}
