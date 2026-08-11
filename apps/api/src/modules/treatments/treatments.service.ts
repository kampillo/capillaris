import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { USER_PUBLIC_SELECT } from '../../common/prisma/user-select';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';

const INCLUDE = {
  tipos: { include: { treatmentType: true } },
  zonas: { include: { hairType: true } },
  realizadoPor: { select: USER_PUBLIC_SELECT },
} as const;

@Injectable()
export class TreatmentsService {
  constructor(private readonly prisma: PrismaService) {}

  listTypes() {
    return this.prisma.treatmentType.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { name: 'asc' }],
    });
  }

  create(dto: CreateTreatmentDto, userId?: string) {
    const { treatmentTypeIds, zonaIds, fecha, ...data } = dto;

    return this.prisma.treatment.create({
      data: {
        ...data,
        fecha: new Date(fecha),
        createdBy: userId,
        tipos: treatmentTypeIds?.length
          ? { create: treatmentTypeIds.map((treatmentTypeId) => ({ treatmentTypeId })) }
          : undefined,
        zonas: zonaIds?.length
          ? { create: zonaIds.map((hairTypeId) => ({ hairTypeId })) }
          : undefined,
      },
      include: INCLUDE,
    });
  }

  findByPatient(patientId: string) {
    return this.prisma.treatment.findMany({
      where: { patientId },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
      include: INCLUDE,
    });
  }

  async findOne(id: string) {
    const treatment = await this.prisma.treatment.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!treatment) {
      throw new NotFoundException(`Tratamiento ${id} no encontrado`);
    }
    return treatment;
  }

  async update(id: string, dto: UpdateTreatmentDto, userId?: string) {
    await this.findOne(id);
    const { treatmentTypeIds, zonaIds, fecha, ...data } = dto;

    // Las listas se reemplazan enteras cuando vienen: es más simple de razonar
    // que un diff, y son relaciones chicas.
    return this.prisma.$transaction(async (tx) => {
      if (treatmentTypeIds) {
        await tx.treatmentOnType.deleteMany({ where: { treatmentId: id } });
      }
      if (zonaIds) {
        await tx.treatmentZone.deleteMany({ where: { treatmentId: id } });
      }
      return tx.treatment.update({
        where: { id },
        data: {
          ...data,
          fecha: fecha ? new Date(fecha) : undefined,
          updatedBy: userId,
          tipos: treatmentTypeIds?.length
            ? { create: treatmentTypeIds.map((treatmentTypeId) => ({ treatmentTypeId })) }
            : undefined,
          zonas: zonaIds?.length
            ? { create: zonaIds.map((hairTypeId) => ({ hairTypeId })) }
            : undefined,
        },
        include: INCLUDE,
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.treatment.delete({ where: { id } });
  }
}
