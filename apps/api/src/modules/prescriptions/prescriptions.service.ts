import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { USER_PUBLIC_SELECT } from '../../common/prisma/user-select';
import { auditSnapshotSelect, withAuditSnapshot, withAuditTransaction } from '../../common/audit/audit-snapshot';

async function validateFulfillment(prisma: Prisma.TransactionClient, productId: string | null | undefined, quantity: number | null | undefined) {
  if (quantity == null) return;
  if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 2147483647) throw new BadRequestException('El objetivo de entrega exige un producto explícito y cantidad entera positiva');
  await prisma.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { isActive: true, stockUnit: true } });
  if (!product?.isActive || !product.stockUnit?.trim()) throw new BadRequestException('Valida el producto activo y su unidad física antes de autorizar entregas');
}

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPrescriptionDto: CreatePrescriptionDto, userId?: string) {
    const { items, ...prescriptionData } = createPrescriptionDto;
    return this.prisma.$transaction(tx => withAuditTransaction(tx, async () => {
      for (const item of items ?? []) await validateFulfillment(tx, item.productId, item.fulfillmentQuantity);
      return tx.prescription.create({
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
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
          include: { product: true, deliveryLines: { select: { id: true }, take: 1 } },
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
      await tx.$queryRaw`SELECT id FROM prescriptions WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.prescription.findUnique({ where: { id }, select: auditSnapshotSelect('Prescription') });
      if (!before) throw new NotFoundException(`Prescription with ID ${id} not found`);
      return withAuditSnapshot('Prescription', id, before, tx, async () => {
        if (items !== undefined) {
          const existing = await tx.prescriptionItem.findMany({ where: { prescriptionId: id }, include: { deliveryLines: { select: { id: true }, take: 1 } } });
          const byId = new Map(existing.map(item => [item.id, item]));
          const ids = items.flatMap(item => item.id ? [item.id] : []);
          if (new Set(ids).size !== ids.length || ids.some(itemId => !byId.has(itemId))) throw new BadRequestException('Los medicamentos no corresponden a esta receta');
          const removed = existing.filter(item => !ids.includes(item.id));
          if (removed.some(item => item.dispensed || item.deliveryLines?.length)) throw new BadRequestException('No se puede eliminar un medicamento con entregas');
          for (const item of items) {
            const { id: itemId, ...data } = item;
            if (!itemId) {
              await validateFulfillment(tx, data.productId, data.fulfillmentQuantity);
              await tx.prescriptionItem.create({ data: { ...data, prescriptionId: id } }); continue;
            }
            const old = byId.get(itemId)!;
            const locked = old.dispensed || !!old.deliveryLines?.length;
            if (locked && Object.entries(data).some(([field, value]) => value !== undefined && value !== (old as any)[field])) throw new BadRequestException('No se puede modificar un medicamento con entregas');
            if (!locked) {
              if (data.productId !== undefined && data.productId !== old.productId && data.fulfillmentQuantity === undefined) data.fulfillmentQuantity = null;
              await validateFulfillment(tx, data.productId !== undefined ? data.productId : old.productId, data.fulfillmentQuantity !== undefined ? data.fulfillmentQuantity : old.fulfillmentQuantity);
              await tx.prescriptionItem.update({ where: { id: itemId }, data });
            }
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
            items: { include: { product: true, deliveryLines: { select: { id: true }, take: 1 } } },
            patient: true,
            doctor: { select: USER_PUBLIC_SELECT },
          },
        });
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async remove(id: string) {
    return this.prisma.$transaction(tx => withAuditTransaction(tx, async () => {
      await tx.$queryRaw`SELECT id FROM prescriptions WHERE id = ${id}::uuid FOR UPDATE`;
      if (await tx.delivery.count({ where: { prescriptionId: id } })) throw new BadRequestException('La receta tiene entregas; conserva su historial');
      return tx.prescription.delete({ where: { id } });
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
