/**
 * Campos de `users` que pueden salir en una respuesta del API.
 *
 * Usa esto en **todo** `include` que arrastre una relación a User. Un
 * `doctor: true` a secas devuelve la fila completa — incluido
 * `password_hash` — a cualquier cliente autenticado.
 *
 * Si necesitas un campo más, agrégalo acá: la idea es que exista un solo
 * lugar donde se decide qué es público de un usuario.
 */
export const USER_PUBLIC_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  cedulaProfesional: true,
} as const;
