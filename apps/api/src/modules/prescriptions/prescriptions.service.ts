import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPrescriptionDto: CreatePrescriptionDto, userId?: string) {
    const { items, ...prescriptionData } = createPrescriptionDto;

    return this.prisma.prescription.create({
      data: {
        ...prescriptionData,
        createdBy: userId,
        items: items
          ? {
              create: items,
            }
          : undefined,
      } as any,
      include: {
        items: true,
        patient: true,
        doctor: true,
      },
    });
  }

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          patient: true,
          doctor: true,
        },
      }),
      this.prisma.prescription.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        patient: true,
        doctor: true,
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    return prescription;
  }

  async update(id: string, updatePrescriptionDto: UpdatePrescriptionDto, userId?: string) {
    await this.findOne(id);
    const { items, ...prescriptionData } = updatePrescriptionDto;

    return this.prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        await tx.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
        if (items.length > 0) {
          await tx.prescriptionItem.createMany({
            data: items.map((item) => ({ ...item, prescriptionId: id })),
          });
        }
      }
      return tx.prescription.update({
        where: { id },
        data: {
          ...prescriptionData,
          updatedBy: userId,
        } as any,
        include: {
          items: { include: { product: true } },
          patient: true,
          doctor: true,
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.prescription.delete({ where: { id } });
  }
}
