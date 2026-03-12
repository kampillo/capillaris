import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';

@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService) {}

  private toDate(value?: string | null): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  async create(dto: CreateProcedureDto, userId?: string) {
    const { doctorIds, hairTypeIds, ...data } = dto;

    return this.prisma.procedureReport.create({
      data: {
        ...data,
        procedureDate: new Date(data.procedureDate),
        anestExtFechaInicial: this.toDate(data.anestExtFechaInicial),
        anestExtFechaFinal: this.toDate(data.anestExtFechaFinal),
        anestImpFechaInicial: this.toDate(data.anestImpFechaInicial),
        anestImpFechaFinal: this.toDate(data.anestImpFechaFinal),
        createdBy: userId,
        doctors: doctorIds
          ? {
              create: doctorIds.map((doctorId) => ({ doctorId })),
            }
          : undefined,
        hairTypes: hairTypeIds
          ? {
              create: hairTypeIds.map((hairTypeId) => ({ hairTypeId })),
            }
          : undefined,
      } as any,
      include: {
        patient: true,
        doctors: { include: { doctor: true } },
        hairTypes: { include: { hairType: true } },
        images: true,
      },
    });
  }

  async findAll(page?: number, pageSize?: number) {
    const p = page && !isNaN(page) ? page : 1;
    const ps = pageSize && !isNaN(pageSize) ? pageSize : 20;
    const skip = (p - 1) * ps;

    const [data, total] = await Promise.all([
      this.prisma.procedureReport.findMany({
        skip,
        take: ps,
        orderBy: { procedureDate: 'desc' },
        include: {
          patient: true,
          doctors: { include: { doctor: true } },
          hairTypes: { include: { hairType: true } },
        },
      }),
      this.prisma.procedureReport.count(),
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

  async findByPatient(patientId: string) {
    return this.prisma.procedureReport.findMany({
      where: { patientId },
      include: {
        doctors: { include: { doctor: true } },
        hairTypes: { include: { hairType: true } },
      },
      orderBy: { procedureDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const procedure = await this.prisma.procedureReport.findUnique({
      where: { id },
      include: {
        patient: true,
        doctors: { include: { doctor: true } },
        hairTypes: { include: { hairType: true } },
        images: true,
      },
    });

    if (!procedure) {
      throw new NotFoundException(`Procedure report with ID ${id} not found`);
    }

    return procedure;
  }

  async update(id: string, dto: UpdateProcedureDto, userId?: string) {
    await this.findOne(id);
    const { doctorIds, hairTypeIds, ...data } = dto;

    return this.prisma.procedureReport.update({
      where: { id },
      data: {
        ...data,
        procedureDate: data.procedureDate
          ? new Date(data.procedureDate)
          : undefined,
        anestExtFechaInicial: this.toDate(data.anestExtFechaInicial),
        anestExtFechaFinal: this.toDate(data.anestExtFechaFinal),
        anestImpFechaInicial: this.toDate(data.anestImpFechaInicial),
        anestImpFechaFinal: this.toDate(data.anestImpFechaFinal),
        updatedBy: userId,
      } as any,
      include: {
        patient: true,
        doctors: { include: { doctor: true } },
        hairTypes: { include: { hairType: true } },
        images: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.procedureReport.delete({ where: { id } });
  }
}
