import { BadRequestException } from '@nestjs/common';
import { normalizeDriveFolderUrl } from '@capillaris/shared';

export function patientValues<T extends { celular?: string | null; fechaNacimiento?: string | null; driveFolderUrl?: string | null }>(dto: T) {
  const data: Record<string, unknown> = { ...dto };
  if (dto.celular !== undefined) {
    const digits = (dto.celular ?? '').replace(/\D/g, '');
    if (digits.length > 20) throw new BadRequestException('Teléfono demasiado largo');
    data.celular = dto.celular?.trim() || null;
    data.celularNormalized = digits || null;
  }
  if (dto.fechaNacimiento !== undefined) {
    if (!dto.fechaNacimiento) data.fechaNacimiento = null;
    else {
      const datePart = dto.fechaNacimiento.slice(0, 10);
      const date = new Date(`${datePart}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== datePart || date > new Date()) {
        throw new BadRequestException('Fecha de nacimiento inválida');
      }
      data.fechaNacimiento = date;
    }
  }
  if (dto.driveFolderUrl !== undefined) {
    try { data.driveFolderUrl = normalizeDriveFolderUrl(dto.driveFolderUrl); }
    catch { throw new BadRequestException('Usa el enlace HTTPS de una carpeta de Google Drive'); }
  }
  for (const field of ['email', 'direccion', 'genero', 'estadoCivil', 'ocupacion', 'origenCanal', 'referidoPor', 'ciudad', 'estado', 'notasInternas']) {
    if (data[field] === '') data[field] = null;
  }
  for (const field of ['nombre', 'apellido', 'tipoPaciente', 'pais']) {
    if (data[field] !== undefined && (typeof data[field] !== 'string' || !(data[field] as string).trim())) throw new BadRequestException(`El campo ${field} no puede estar vacío`);
  }
  return data;
}
