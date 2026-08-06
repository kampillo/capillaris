import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Fechas de calendario vs. instantes.
 *
 * Los campos `@db.Date` de Prisma (fechaNacimiento, procedureDate,
 * consultationDate, prescriptionDate, fechaSugeridaTransplante, y los
 * `fecha` de micropigmentación y hairmedicine) llegan del API como
 * `"2026-05-12T00:00:00.000Z"`. Son fechas de calendario, no instantes:
 * no traen hora ni zona horaria real.
 *
 * Pasarlas por `new Date(...)` y formatearlas en la zona local las corre
 * un día hacia atrás — en México (UTC-6) el 12 de mayo se muestra como 11
 * de mayo. Ese era el bug que reportó la clínica.
 *
 * Usa `formatDateOnly` y compañía para esos campos: leen el año, mes y día
 * del string tal cual, sin convertir zonas.
 *
 * Para instantes reales (createdAt, updatedAt, startDatetime, scheduledFor,
 * lastLoginAt) usa `formatDateTime`, que sí debe convertir a hora local.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Convierte una fecha de calendario a un `Date` en medianoche **local**,
 * apto para date-fns o aritmética de días. Devuelve null si no parsea.
 */
export function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const m = DATE_ONLY.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 de may 2026" */
export function formatDateOnly(value?: string | null): string | null {
  const d = parseDateOnly(value);
  return d ? format(d, "dd 'de' MMM yyyy", { locale: es }) : null;
}

/** "12 de mayo 2026" */
export function formatDateLong(value?: string | null): string | null {
  const d = parseDateOnly(value);
  return d ? format(d, "dd 'de' MMMM yyyy", { locale: es }) : null;
}

/** "12 may 26" */
export function formatDateShort(value?: string | null): string | null {
  const d = parseDateOnly(value);
  return d ? format(d, 'dd MMM yy', { locale: es }) : null;
}

/**
 * Valor para un `<input type="date">`. Recorta el string sin convertir
 * zonas, así que no corre la fecha.
 */
export function toDateInput(value?: string | null): string {
  if (!value) return '';
  const m = DATE_ONLY.exec(value);
  return m ? value.slice(0, 10) : '';
}

/**
 * Prepara una fecha de calendario para mandarla al API. El backend la
 * guarda en un campo `@db.Date`, así que se ancla a medianoche UTC: es
 * la única hora que sobrevive intacta la conversión de zonas.
 *
 * Devuelve undefined si viene vacía, para poder omitir el campo del
 * payload sin ramificar en cada formulario.
 */
export function toDateOnlyPayload(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (value.includes('T')) return value;
  return DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : undefined;
}

/** Un `Date` a `YYYY-MM-DD` leyendo sus componentes **locales**. */
export function toLocalDateKey(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mes}-${dia}`;
}

/**
 * Día local en que cae un instante, como `YYYY-MM-DD`. Para agrupar citas
 * por día.
 *
 * No uses `iso.split('T')[0]` para esto: eso da el día en UTC, así que una
 * cita de las 7 de la tarde en México aparece en el día siguiente.
 */
export function instantToLocalDateKey(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : toLocalDateKey(d);
}

/**
 * Hoy en zona local, como `YYYY-MM-DD`.
 *
 * Reemplaza a `new Date().toISOString().split('T')[0]`, que devuelve la
 * fecha en UTC — o sea *mañana* si son más de las 18:00 en México.
 */
export function todayInput(): string {
  return toLocalDateKey(new Date());
}

/** Edad cumplida hoy. Null si la fecha no parsea o cae fuera de rango. */
export function calcAge(value?: string | null): number | null {
  const nacimiento = parseDateOnly(value);
  if (!nacimiento) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad >= 0 && edad < 150 ? edad : null;
}

/**
 * Sólo el día de un instante real, en zona local. "12 de may 2026".
 * Para citas y movimientos, donde interesa el día pero no la hora.
 */
export function formatInstantDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, "dd 'de' MMM yyyy", { locale: es });
}

/**
 * Instantes reales (createdAt, startDatetime, scheduledFor). Estos sí
 * llevan hora y deben mostrarse en la zona del usuario.
 */
export function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
