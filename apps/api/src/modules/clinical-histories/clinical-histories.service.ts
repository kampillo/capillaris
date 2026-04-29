import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClinicalHistoryDto } from './dto/create-clinical-history.dto';
import { UpdateClinicalHistoryDto } from './dto/update-clinical-history.dto';

@Injectable()
export class ClinicalHistoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClinicalHistoryDto, userId?: string) {
    const {
      inheritRelatives,
      nonPathologicalPersonal,
      previousTreatment,
      physicalExploration,
      ...data
    } = dto;

    return this.prisma.clinicalHistory.create({
      data: {
        ...data,
        createdBy: userId,
        inheritRelatives: inheritRelatives
          ? { create: inheritRelatives }
          : undefined,
        nonPathologicalPersonal: nonPathologicalPersonal
          ? { create: nonPathologicalPersonal }
          : undefined,
        previousTreatment: previousTreatment
          ? { create: previousTreatment }
          : undefined,
        physicalExploration: physicalExploration
          ? { create: physicalExploration }
          : undefined,
      } as any,
      include: {
        patient: true,
        inheritRelatives: true,
        nonPathologicalPersonal: true,
        previousTreatment: true,
        physicalExploration: true,
      },
    });
  }

  async findAll(page?: number, pageSize?: number) {
    const p = page && !isNaN(page) ? page : 1;
    const ps = pageSize && !isNaN(pageSize) ? pageSize : 20;
    const skip = (p - 1) * ps;

    const [data, total] = await Promise.all([
      this.prisma.clinicalHistory.findMany({
        skip,
        take: ps,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
          inheritRelatives: true,
          nonPathologicalPersonal: true,
          previousTreatment: true,
          physicalExploration: true,
        },
      }),
      this.prisma.clinicalHistory.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: p,
        pageSize: ps,
        totalPages: Math.ceil(total / ps),
      },
    };
  }

  async findOne(id: string) {
    const history = await this.prisma.clinicalHistory.findUnique({
      where: { id },
      include: {
        patient: true,
        inheritRelatives: true,
        nonPathologicalPersonal: true,
        previousTreatment: true,
        physicalExploration: true,
      },
    });

    if (!history) {
      throw new NotFoundException(`Clinical history with ID ${id} not found`);
    }

    return history;
  }

  async findByPatient(patientId: string) {
    return this.prisma.clinicalHistory.findMany({
      where: { patientId },
      include: {
        inheritRelatives: true,
        nonPathologicalPersonal: true,
        previousTreatment: true,
        physicalExploration: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateClinicalHistoryDto, userId?: string) {
    await this.findOne(id);
    const {
      inheritRelatives,
      nonPathologicalPersonal,
      previousTreatment,
      physicalExploration,
      ...data
    } = dto;

    return this.prisma.clinicalHistory.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
        inheritRelatives: inheritRelatives
          ? {
              upsert: {
                create: inheritRelatives,
                update: inheritRelatives,
              },
            }
          : undefined,
        nonPathologicalPersonal: nonPathologicalPersonal
          ? {
              upsert: {
                create: nonPathologicalPersonal,
                update: nonPathologicalPersonal,
              },
            }
          : undefined,
        previousTreatment: previousTreatment
          ? {
              upsert: {
                create: previousTreatment,
                update: previousTreatment,
              },
            }
          : undefined,
        physicalExploration: physicalExploration
          ? {
              upsert: {
                create: physicalExploration,
                update: physicalExploration,
              },
            }
          : undefined,
      } as any,
      include: {
        patient: true,
        inheritRelatives: true,
        nonPathologicalPersonal: true,
        previousTreatment: true,
        physicalExploration: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.clinicalHistory.delete({ where: { id } });
  }
}
