import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMedicalConsultationDto } from './dto/create-medical-consultation.dto';
import { UpdateMedicalConsultationDto } from './dto/update-medical-consultation.dto';

@Injectable()
export class MedicalConsultationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMedicalConsultationDto, userId?: string) {
    const { donorZoneIds, variantIds, ...data } = dto;

    return this.prisma.medicalConsultation.create({
      data: {
        ...data,
        consultationDate: new Date(data.consultationDate),
        fechaSugeridaTransplante: data.fechaSugeridaTransplante
          ? new Date(data.fechaSugeridaTransplante)
          : undefined,
        createdBy: userId,
        donorZones: donorZoneIds
          ? {
              create: donorZoneIds.map((donorZoneId) => ({
                donorZoneId,
              })),
            }
          : undefined,
        variants: variantIds
          ? {
              create: variantIds.map((variantId) => ({
                variantId,
              })),
            }
          : undefined,
      } as any,
      include: {
        patient: true,
        doctor: true,
        donorZones: { include: { donorZone: true } },
        variants: { include: { variant: true } },
      },
    });
  }

  async findAll(page?: number, pageSize?: number) {
    const p = page && !isNaN(page) ? page : 1;
    const ps = pageSize && !isNaN(pageSize) ? pageSize : 20;
    const skip = (p - 1) * ps;

    const [data, total] = await Promise.all([
      this.prisma.medicalConsultation.findMany({
        skip,
        take: ps,
        orderBy: { consultationDate: 'desc' },
        include: {
          patient: true,
          doctor: true,
          donorZones: { include: { donorZone: true } },
          variants: { include: { variant: true } },
        },
      }),
      this.prisma.medicalConsultation.count(),
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
    return this.prisma.medicalConsultation.findMany({
      where: { patientId },
      include: {
        doctor: true,
        donorZones: { include: { donorZone: true } },
        variants: { include: { variant: true } },
      },
      orderBy: { consultationDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const consultation = await this.prisma.medicalConsultation.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        donorZones: { include: { donorZone: true } },
        variants: { include: { variant: true } },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Medical consultation with ID ${id} not found`);
    }

    return consultation;
  }

  async update(id: string, dto: UpdateMedicalConsultationDto, userId?: string) {
    await this.findOne(id);
    const { donorZoneIds, variantIds, ...data } = dto;

    return this.prisma.medicalConsultation.update({
      where: { id },
      data: {
        ...data,
        fechaSugeridaTransplante: data.fechaSugeridaTransplante
          ? new Date(data.fechaSugeridaTransplante)
          : undefined,
        updatedBy: userId,
      } as any,
      include: {
        patient: true,
        doctor: true,
        donorZones: { include: { donorZone: true } },
        variants: { include: { variant: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.medicalConsultation.delete({ where: { id } });
  }
}
