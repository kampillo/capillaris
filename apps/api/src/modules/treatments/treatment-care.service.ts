import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertWorkspacePatient, assertWorkspaceRole, ClinicalActor, patientSearch, patientSummary, personSummary } from '../../common/clinical-workspace';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';

const staffWhere = { isActive: true, deletedAt: null, userRoles: { some: { role: { name: { in: ['treatment_staff', 'doctor'] } } } } };
const include = {
  tipos: { include: { treatmentType: true } },
  zonas: { include: { hairType: true } },
  realizadoPor: { select: personSummary },
} as const;

@Injectable()
export class TreatmentCareService {
  constructor(private readonly prisma: PrismaService) {}

  async patients(actor: ClinicalActor, query = '') {
    assertWorkspaceRole(actor, 'treatment_staff');
    const where = patientSearch(query);
    if (!where) return [];
    return this.prisma.patient.findMany({ where, select: patientSummary, orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }], take: 100 });
  }

  async catalog() {
    const [types, zones, staff] = await Promise.all([
      this.prisma.treatmentType.findMany({ where: { activo: true }, orderBy: [{ orden: 'asc' }, { name: 'asc' }] }),
      this.prisma.hairType.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: staffWhere, select: personSummary, orderBy: { nombre: 'asc' } }),
    ]);
    return { types, zones, staff };
  }

  async detail(patientId: string, actor: ClinicalActor) {
    return this.prisma.$transaction(async tx => {
      await assertWorkspacePatient(tx, patientId, actor, 'treatment_staff');
      const [patient, treatments] = await Promise.all([
        tx.patient.findUniqueOrThrow({ where: { id: patientId }, select: patientSummary }),
        tx.treatment.findMany({ where: { patientId }, include, orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }] }),
      ]);
      const ids = [...new Set(treatments.flatMap(t => [t.createdBy, t.updatedBy]).filter((id): id is string => !!id))];
      const authors = await tx.user.findMany({ where: { id: { in: ids } }, select: personSummary });
      const byId = new Map(authors.map(a => [a.id, a]));
      return { patient, treatments: treatments.map(t => ({ ...t, capturedBy: t.createdBy ? byId.get(t.createdBy) ?? null : null, editedBy: t.updatedBy ? byId.get(t.updatedBy) ?? null : null })) };
    });
  }

  async save(patientId: string, dto: CreateTreatmentDto | UpdateTreatmentDto, actor: ClinicalActor, id?: string) {
    return this.prisma.$transaction(async tx => {
      await assertWorkspacePatient(tx, patientId, actor, 'treatment_staff');
      if ('patientId' in dto && dto.patientId !== patientId) throw new BadRequestException('El paciente no coincide');
      const previous = id ? await tx.treatment.findFirst({ where: { id, patientId }, include }) : null;
      if (id && !previous) throw new NotFoundException('Tratamiento no disponible');
      if ((!id && !dto.fecha) || dto.fecha === null || (dto.fecha !== undefined && !Number.isFinite(Date.parse(dto.fecha)))) {
        throw new BadRequestException('Selecciona una fecha válida');
      }
      if (dto.realizadoPorId && dto.realizadoPorId !== previous?.realizadoPorId) {
        const staff = await tx.user.findFirst({ where: { id: dto.realizadoPorId, ...staffWhere }, select: { id: true } });
        if (!staff) throw new BadRequestException('Selecciona un responsable activo de tratamientos o un médico');
      }
      const typeIds = dto.treatmentTypeIds == null ? undefined : [...new Set(dto.treatmentTypeIds)];
      const zoneIds = dto.zonaIds == null ? undefined : [...new Set(dto.zonaIds)];
      if (typeIds) {
        const added = typeIds.filter(value => !previous?.tipos.some(t => t.treatmentTypeId === value));
        const count = await tx.treatmentType.count({ where: { id: { in: added }, activo: true } });
        if (count !== added.length) throw new BadRequestException('Selecciona tipos activos del catálogo');
      }
      if (zoneIds) {
        const count = await tx.hairType.count({ where: { id: { in: zoneIds } } });
        if (count !== zoneIds.length) throw new BadRequestException('Selecciona zonas del catálogo');
      }
      // Only clinical form fields. Authors and ownership come from the server.
      const data = {
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        realizadoPorId: dto.realizadoPorId,
        sesionNumero: dto.sesionNumero, duracion: dto.duracion, dilucion: dto.dilucion,
        descripcion: dto.descripcion, comentarios: dto.comentarios,
        tipos: typeIds ? { ...(id ? { deleteMany: {} } : {}), create: typeIds.map(treatmentTypeId => ({ treatmentTypeId })) } : undefined,
        zonas: zoneIds ? { ...(id ? { deleteMany: {} } : {}), create: zoneIds.map(hairTypeId => ({ hairTypeId })) } : undefined,
      };
      if (id) return tx.treatment.update({ where: { id }, data: { ...data, updatedBy: actor.id }, select: { id: true } });
      return tx.treatment.create({ data: { ...data, fecha: new Date(dto.fecha!), patientId, createdBy: actor.id }, select: { id: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
