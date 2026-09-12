import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProceduresService } from '../procedures/procedures.service';
import { CreateProcedureDto } from '../procedures/dto/create-procedure.dto';
import { UpdateProcedureDto } from '../procedures/dto/update-procedure.dto';

export type NursingActor = { id: string; roles: string[] };
const person = { id: true, nombre: true, apellido: true } as const;
const patientSummary = { ...person, fechaNacimiento: true, edadApproximada: true, genero: true } as const;
const nurseActive = { deletedAt: null, isActive: true, userRoles: { some: { role: { name: 'nurse' } } } };
const procedureInclude = {
  nurses: { select: { nurse: { select: person } } },
  doctors: { select: { doctor: { select: person } } },
  hairTypes: { include: { hairType: true } }, operatingRoom: true,
} as const;

@Injectable()
export class NursingService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAssigned(tx: Prisma.TransactionClient, patientId: string, actor: NursingActor) {
    const patient = await tx.patient.findFirst({ where: { id: patientId, deletedAt: null }, select: { id: true } });
    if (!patient) throw new NotFoundException('Paciente no disponible');
    if (actor.roles.includes('nurse')) {
      const assignment = await tx.nursingAssignment.findFirst({
        where: { patientId, nurseId: actor.id, revokedAt: null, nurse: nurseActive }, select: { id: true },
      });
      if (!assignment) throw new ForbiddenException('No tienes asignado este paciente');
    } else if (!actor.roles.some(r => ['admin', 'doctor'].includes(r))) {
      throw new ForbiddenException();
    }
  }

  staff() { return this.prisma.user.findMany({ where: nurseActive, select: person, orderBy: { nombre: 'asc' } }); }

  async catalog() {
    const [doctors, hairTypes, operatingRooms] = await Promise.all([
      this.prisma.user.findMany({ where: { deletedAt: null, isActive: true, userRoles: { some: { role: { name: 'doctor' } } } }, select: person, orderBy: { nombre: 'asc' } }),
      this.prisma.hairType.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.operatingRoom.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return { doctors, hairTypes, operatingRooms };
  }

  async patients(actor: NursingActor, query = '') {
    return this.prisma.patient.findMany({
      where: {
        deletedAt: null,
        nursingAssignments: { some: { nurseId: actor.id, revokedAt: null, nurse: nurseActive } },
        ...(query.trim() ? { OR: [{ nombre: { contains: query.trim(), mode: 'insensitive' as const } }, { apellido: { contains: query.trim(), mode: 'insensitive' as const } }] } : {}),
      }, select: patientSummary, orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }], take: 100,
    });
  }

  async detail(patientId: string, actor: NursingActor) {
    return this.prisma.$transaction(async tx => {
      await this.assertAssigned(tx, patientId, actor);
      const [patient, procedures, assignments] = await Promise.all([
        tx.patient.findUniqueOrThrow({ where: { id: patientId }, select: patientSummary }),
        tx.procedureReport.findMany({ where: { patientId }, include: procedureInclude, orderBy: { procedureDate: 'desc' } }),
        tx.nursingAssignment.findMany({ where: { patientId, revokedAt: null, nurse: nurseActive }, select: { nurse: { select: person } } }),
      ]);
      const authorIds = [...new Set(procedures.flatMap(p => [p.createdBy, p.updatedBy]).filter((id): id is string => !!id))];
      const authors = await tx.user.findMany({ where: { id: { in: authorIds } }, select: person });
      const byId = new Map(authors.map(a => [a.id, a]));
      return { patient, procedures: procedures.map(p => ({ ...p, capturedBy: p.createdBy ? byId.get(p.createdBy) : null, editedBy: p.updatedBy ? byId.get(p.updatedBy) : null })), nurses: assignments.map(a => a.nurse) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  assignments(patientId: string) {
    return this.prisma.nursingAssignment.findMany({ where: { patientId, revokedAt: null }, select: { id: true, nurseId: true, assignedAt: true, nurse: { select: { ...person, isActive: true } } } });
  }

  async assign(patientId: string, nurseId: string, actor: NursingActor, revoke = false) {
    if (actor.roles.includes('nurse') || !actor.roles.some(r => ['admin', 'doctor'].includes(r))) throw new ForbiddenException();
    return this.prisma.$transaction(async tx => {
      await this.assertAssigned(tx, patientId, actor);
      if (revoke) return tx.nursingAssignment.update({
        where: { patientId_nurseId: { patientId, nurseId } }, data: { revokedAt: new Date(), revokedBy: actor.id },
      });
      const nurse = await tx.user.findFirst({ where: { id: nurseId, ...nurseActive }, select: { id: true } });
      if (!nurse) throw new BadRequestException('Selecciona una cuenta activa de enfermería');
      return tx.nursingAssignment.upsert({
        where: { patientId_nurseId: { patientId, nurseId } },
        create: { patientId, nurseId, assignedBy: actor.id },
        update: { assignedBy: actor.id, assignedAt: new Date(), revokedAt: null, revokedBy: null },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async save(patientId: string, dto: CreateProcedureDto | UpdateProcedureDto, actor: NursingActor, procedureId?: string) {
    return this.prisma.$transaction(async tx => {
      await this.assertAssigned(tx, patientId, actor);
      if (procedureId) {
        const existing = await tx.procedureReport.findFirst({ where: { id: procedureId, patientId }, select: { id: true } });
        if (!existing) throw new NotFoundException('Procedimiento no disponible');
      }
      if (dto.doctorIds != null) {
        const existing = procedureId ? await tx.procedureReportDoctor.findMany({ where: { procedureReportId: procedureId }, select: { doctorId: true } }) : [];
        const added = [...new Set(dto.doctorIds)].filter(id => !existing.some(d => d.doctorId === id));
        const count = await tx.user.count({ where: { id: { in: added }, deletedAt: null, isActive: true, userRoles: { some: { role: { name: 'doctor' } } } } });
        if (count !== added.length) throw new BadRequestException('Selecciona médicos activos del catálogo');
      }
      // Reuse clinical validation and date/session rules inside the authorization transaction.
      const scoped = new ProceduresService({ ...tx, procedureReport: tx.procedureReport, $transaction: (work: (client: Prisma.TransactionClient) => unknown) => work(tx) } as unknown as PrismaService);
      const result = procedureId
        ? await scoped.update(procedureId, dto as UpdateProcedureDto, actor.id)
        : await scoped.create({ ...dto, patientId } as CreateProcedureDto, actor.id);
      // Do not return the full patient object included by the legacy service.
      return { id: result.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async participants(procedureId: string, nurseIds: string[], actor: NursingActor) {
    return this.prisma.$transaction(async tx => {
      const procedure = await tx.procedureReport.findUnique({ where: { id: procedureId }, select: { patientId: true } });
      if (!procedure) throw new NotFoundException('Procedimiento no disponible');
      await this.assertAssigned(tx, procedure.patientId, actor);
      const ids = [...new Set(nurseIds)];
      const existing = await tx.procedureReportNurse.findMany({ where: { procedureId }, select: { nurseId: true } });
      const added = ids.filter(id => !existing.some(e => e.nurseId === id));
      const count = await tx.nursingAssignment.count({ where: { patientId: procedure.patientId, nurseId: { in: added }, revokedAt: null, nurse: nurseActive } });
      if (count !== added.length) throw new BadRequestException('Cada participante nuevo debe ser de enfermería activa y estar asignado al paciente');
      await tx.procedureReportNurse.deleteMany({ where: { procedureId, nurseId: { notIn: ids } } });
      if (added.length) await tx.procedureReportNurse.createMany({ data: added.map(nurseId => ({ procedureId, nurseId })) });
      await tx.procedureReport.update({ where: { id: procedureId }, data: { updatedBy: actor.id } });
      return tx.procedureReportNurse.findMany({ where: { procedureId }, select: { nurse: { select: person } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
