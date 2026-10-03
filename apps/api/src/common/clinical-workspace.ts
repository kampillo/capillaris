import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type ClinicalActor = { id: string; roles: string[] };
export const personSummary = { id: true, nombre: true, apellido: true } as const;
export const patientSummary = { ...personSummary, fechaNacimiento: true, edadApproximada: true } as const;
export const restrictedRoles = ['nurse', 'treatment_staff'];

// Restricted roles never inherit broader permissions from a mixed account.
export function assertWorkspaceRole(actor: ClinicalActor, role: string) {
  const restricted = actor.roles.filter(r => restrictedRoles.includes(r));
  if (!(restricted.length ? restricted.includes(role) : actor.roles.some(r => ['admin', 'doctor'].includes(r)))) {
    throw new ForbiddenException();
  }
}

export async function assertWorkspacePatient(tx: Prisma.TransactionClient, patientId: string, actor: ClinicalActor, role: string) {
  assertWorkspaceRole(actor, role);
  const patient = await tx.patient.findFirst({ where: { id: patientId, deletedAt: null }, select: { id: true } });
  if (!patient) throw new NotFoundException('Paciente no disponible');
}

export function patientSearch(query: string) {
  const value = query.trim();
  if (value.length > 100) throw new BadRequestException('La búsqueda admite hasta 100 caracteres');
  if (value.length < 2) return null;
  return {
    deletedAt: null,
    AND: value.split(/\s+/).map(word => ({ OR: [
      { nombre: { contains: word, mode: 'insensitive' as const } },
      { apellido: { contains: word, mode: 'insensitive' as const } },
    ] })),
  };
}
