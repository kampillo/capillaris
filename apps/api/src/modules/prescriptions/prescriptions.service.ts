import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { USER_PUBLIC_SELECT } from '../../common/prisma/user-select';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPrescriptionDto: CreatePrescriptionDto, userId?: string) {
    const { items, ...prescriptionData } = createPrescriptionDto;

    return this.prisma.prescription.create({
      data: {
        ...prescriptionData,
        prescriptionDate: new Date(prescriptionData.prescriptionDate),
        expiresAt: prescriptionData.expiresAt ? new Date(prescriptionData.expiresAt) : undefined,
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
        doctor: { select: USER_PUBLIC_SELECT },
      },
    });
  }

  async findAll(page = 1, pageSize = 20, patientId?: string) {
    page = Math.max(1, Math.floor(Number(page) || 1));
    pageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize) || 20)));
    const skip = (page - 1) * pageSize;
    const where = patientId ? { patientId } : {};

    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          items: true,
          patient: true,
          doctor: { select: USER_PUBLIC_SELECT },
        },
      }),
      this.prisma.prescription.count({ where }),
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
        doctor: { select: USER_PUBLIC_SELECT },
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
        const existing = await tx.prescriptionItem.findMany({ where: { prescriptionId: id } });
        const byId = new Map(existing.map(item => [item.id, item]));
        const ids = items.flatMap(item => item.id ? [item.id] : []);
        if (new Set(ids).size !== ids.length || ids.some(itemId => !byId.has(itemId))) throw new BadRequestException('Los medicamentos no corresponden a esta receta');
        const removed = existing.filter(item => !ids.includes(item.id));
        if (removed.some(item => item.dispensed)) throw new BadRequestException('No se puede eliminar un medicamento dispensado');
        for (const item of items) {
          const { id: itemId, ...data } = item;
          if (!itemId) { await tx.prescriptionItem.create({ data: { ...data, prescriptionId: id } }); continue; }
          const old = byId.get(itemId)!;
          if (old.dispensed && Object.entries(data).some(([field, value]) => value !== undefined && value !== (old as any)[field])) throw new BadRequestException('No se puede modificar un medicamento dispensado');
          if (!old.dispensed) await tx.prescriptionItem.update({ where: { id: itemId }, data });
        }
        if (removed.length) await tx.prescriptionItem.deleteMany({ where: { prescriptionId: id, id: { in: removed.map(item => item.id) } } });
      }
      return tx.prescription.update({
        where: { id },
        data: {
          ...prescriptionData,
          expiresAt: prescriptionData.expiresAt ? new Date(prescriptionData.expiresAt) : undefined,
          updatedBy: userId,
        } as any,
        include: {
          items: { include: { product: true } },
          patient: true,
          doctor: { select: USER_PUBLIC_SELECT },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.prescription.delete({ where: { id } });
  }
}
