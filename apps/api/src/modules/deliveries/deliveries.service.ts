import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { withAuditTransaction } from '../../common/audit/audit-snapshot';
import { isUuid } from '../../common/audit/sensitive-fields';
import { CreateDeliveryDto, ReverseDeliveryDto } from './dto/delivery.dto';

const productSelect = {
  id: true, name: true, sku: true, content: true, unit: true, stockUnit: true,
  isActive: true, requiresPrescription: true, stockBalance: { select: { currentQuantity: true } },
} as const satisfies Prisma.ProductSelect;
export const deliverySelect = {
  id: true, kind: true, source: true, prescriptionId: true, reversalOfId: true,
  reason: true, physicalStockConfirmed: true, createdAt: true, createdBy: true,
  reversal: { select: { id: true, createdAt: true } },
  lines: { orderBy: { id: 'asc' }, select: {
    id: true, productId: true, prescriptionItemId: true, stockMovementId: true,
    quantity: true, productName: true, productSku: true, presentation: true, stockUnit: true,
  } },
} as const satisfies Prisma.DeliverySelect;
const fulfillmentSelect = {
  id: true, status: true, expiresAt: true,
  patient: { select: { id: true, nombre: true, apellido: true, deletedAt: true } },
  items: { orderBy: { id: 'asc' }, select: {
    id: true, medicineName: true, productId: true, fulfillmentQuantity: true, dispensed: true,
    product: { select: productSelect },
    deliveryLines: { select: { quantity: true, delivery: { select: { kind: true } } } },
  } },
} as const satisfies Prisma.PrescriptionSelect;
type FulfillmentRow = Prisma.PrescriptionGetPayload<{ select: typeof fulfillmentSelect }>;
type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function requireUuid(id: unknown) { if (!isUuid(id)) throw new BadRequestException('Identificador inválido'); return id.toLowerCase(); }
function fingerprint(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function presentation(product: ProductRow) {
  return product.content != null && product.unit ? `${product.content} ${product.unit}` : null;
}
function fulfilled(row: FulfillmentRow) {
  const prescriptionEligible = row.status === 'active' && !row.patient.deletedAt && (!row.expiresAt || row.expiresAt > new Date());
  return {
    id: row.id, status: row.status, expiresAt: row.expiresAt,
    patient: { id: row.patient.id, nombre: row.patient.nombre, apellido: row.patient.apellido },
    items: row.items.map(item => {
      const delivered = item.deliveryLines.reduce((sum, line) => sum + (line.delivery.kind === 'reversal' ? -line.quantity : line.quantity), 0);
      const target = item.fulfillmentQuantity;
      const pending = target == null ? null : Math.max(0, target - delivered);
      const blockedReason = !prescriptionEligible ? 'Receta no activa, vencida o paciente no disponible'
        : item.dispensed ? 'Dispensación histórica sin detalle verificable'
          : !item.product || !item.product.isActive ? 'Falta un producto activo validado'
            : !item.product.stockUnit?.trim() || target == null ? 'Falta unidad física u objetivo explícito validado'
              : pending === 0 ? 'Objetivo ya entregado' : null;
      return {
        id: item.id, medicineName: item.medicineName, product: item.product && {
          id: item.product.id, name: item.product.name, sku: item.product.sku,
          presentation: presentation(item.product), stockUnit: item.product.stockUnit,
          stock: item.product.stockBalance?.currentQuantity ?? 0,
        }, target, delivered, pending, hasDelivery: item.deliveryLines.length > 0,
        state: target == null || item.dispensed ? 'unknown' : delivered === 0 ? 'pending' : pending === 0 ? 'delivered' : 'partial',
        blockedReason,
      };
    }),
  };
}

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async fulfillment(id: string) {
    id = requireUuid(id);
    const row = await this.prisma.prescription.findUnique({ where: { id }, select: fulfillmentSelect });
    if (!row) throw new NotFoundException('Receta no disponible');
    return fulfilled(row);
  }

  async get(id: string) {
    id = requireUuid(id);
    const result = await this.prisma.delivery.findUnique({ where: { id }, select: deliverySelect });
    if (!result) throw new NotFoundException('Entrega no disponible');
    return result;
  }

  async list(page = 1, prescriptionId?: string) {
    if (prescriptionId) prescriptionId = requireUuid(prescriptionId);
    const current = Math.max(1, Math.floor(Number(page) || 1));
    const where = prescriptionId ? { prescriptionId } : {};
    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({ where, select: deliverySelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (current - 1) * 30, take: 30 }),
      this.prisma.delivery.count({ where }),
    ]);
    return { data, meta: { total, page: current, pageSize: 30, totalPages: Math.ceil(total / 30) } };
  }

  async searchPrescriptions(query: string) {
    const value = query?.trim() ?? '';
    if (value.length > 100) throw new BadRequestException('La búsqueda admite hasta 100 caracteres');
    if (value.length < 2) return [];
    return this.prisma.prescription.findMany({
      where: { patient: { deletedAt: null, AND: value.split(/\s+/).map(word => ({ OR: [{ nombre: { contains: word, mode: 'insensitive' as const } }, { apellido: { contains: word, mode: 'insensitive' as const } }] })) } },
      select: { id: true, prescriptionDate: true, status: true, patient: { select: { id: true, nombre: true, apellido: true } } },
      orderBy: [{ prescriptionDate: 'desc' }, { id: 'desc' }], take: 30,
    });
  }

  private async command(key: string, hash: string, save: (tx: Prisma.TransactionClient) => Promise<unknown>) {
    key = requireUuid(key);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(tx => withAuditTransaction(tx, async () => {
          const existing = await tx.delivery.findUnique({ where: { idempotencyKey: key }, select: { id: true, requestHash: true } });
          if (existing) {
            if (existing.requestHash !== hash) throw new ConflictException('Esta clave ya se usó para otra operación');
            return tx.delivery.findUniqueOrThrow({ where: { id: existing.id }, select: deliverySelect });
          }
          return save(tx);
        }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 30000 });
      } catch (error) {
        const code = (error as { code?: string }).code;
        // A concurrent request may have committed the same key while this tx waited.
        if (code === 'P2002') {
          const existing = await this.prisma.delivery.findUnique({ where: { idempotencyKey: key }, select: { id: true, requestHash: true } });
          if (existing) {
            if (existing.requestHash !== hash) throw new ConflictException('Esta clave ya se usó para otra operación');
            return this.get(existing.id);
          }
        }
        if (code !== 'P2034') throw error;
      }
    }
    throw new ConflictException('Otra operación modificó estas existencias; revisa el resultado y reintenta con la misma clave');
  }

  async confirm(dto: CreateDeliveryDto, key: string, actor: string) {
    actor = requireUuid(actor);
    if (!['direct', 'prescription'].includes(dto.source) || !dto.lines?.length || dto.lines.length > 50) throw new BadRequestException('Entrega inválida');
    if (dto.source === 'prescription') requireUuid(dto.prescriptionId);
    else if (dto.prescriptionId) throw new BadRequestException('Una entrega directa no lleva receta');
    for (const line of dto.lines) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 2147483647) throw new BadRequestException('Usa cantidades enteras positivas de envases completos');
      requireUuid(dto.source === 'direct' ? line.productId : line.prescriptionItemId);
      if (dto.source === 'direct' ? line.prescriptionItemId : line.productId) throw new BadRequestException('No mezcles productos directos con ítems de receta');
    }
    dto = { ...dto, prescriptionId: dto.prescriptionId?.toLowerCase(), lines: dto.lines.map(line => ({ ...line, productId: line.productId?.toLowerCase(), prescriptionItemId: line.prescriptionItemId?.toLowerCase() })) };
    const lines = [...dto.lines].sort((a, b) => (a.productId ?? a.prescriptionItemId!).localeCompare(b.productId ?? b.prescriptionItemId!));
    const ids = lines.map(line => line.productId ?? line.prescriptionItemId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('No repitas una línea');
    const normalized = lines.map(line => ({ productId: line.productId ?? null, prescriptionItemId: line.prescriptionItemId ?? null, quantity: line.quantity }));
    const hash = fingerprint({ operation: 'delivery', source: dto.source, prescriptionId: dto.prescriptionId ?? null, lines: normalized });
    return this.command(key, hash, async tx => {
      let prescription: FulfillmentRow | null = null;
      if (dto.source === 'prescription') {
        await tx.$queryRaw`SELECT id FROM prescriptions WHERE id = ${dto.prescriptionId}::uuid FOR UPDATE`;
        prescription = await tx.prescription.findUnique({ where: { id: dto.prescriptionId }, select: fulfillmentSelect });
        if (!prescription) throw new NotFoundException('Receta no disponible');
      }
      const summary = prescription && fulfilled(prescription);
      const planned = lines.map(line => {
        const item = summary?.items.find(item => item.id === line.prescriptionItemId);
        if (prescription && (!item || item.blockedReason || line.quantity > (item.pending ?? 0))) throw new ConflictException(item?.blockedReason ?? 'Cantidad superior al pendiente o ítem ajeno a la receta');
        return { quantity: line.quantity, productId: item?.product?.id ?? line.productId!, prescriptionItemId: item?.id ?? null };
      });
      const productIds = [...new Set(planned.map(line => line.productId))].sort();
      const products = new Map<string, ProductRow>();
      for (const productId of productIds) {
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
        const product = await tx.product.findUnique({ where: { id: productId }, select: productSelect });
        if (!product?.isActive || !product.stockUnit?.trim()) throw new ConflictException('Producto inactivo o sin unidad física validada');
        if (dto.source === 'direct' && product.requiresPrescription) throw new ConflictException('Este producto requiere una receta vinculada');
        products.set(productId, product);
      }
      const delivery = await tx.delivery.create({ data: { kind: 'delivery', source: dto.source, prescriptionId: dto.prescriptionId, idempotencyKey: key, requestHash: hash, createdBy: actor } });
      for (const productId of productIds) {
        const quantity = planned.filter(line => line.productId === productId).reduce((sum, line) => sum + line.quantity, 0);
        if (quantity > 2147483647) throw new BadRequestException('Cantidad total inválida');
        const result = await tx.stockBalance.updateMany({ where: { productId, currentQuantity: { gte: quantity } }, data: { currentQuantity: { decrement: quantity } } });
        if (result.count !== 1) throw new ConflictException('Existencias insuficientes; no se registró ninguna entrega');
      }
      for (const line of planned) {
        const product = products.get(line.productId)!;
        const movement = await tx.stockMovement.create({ data: { productId: line.productId, movementType: 'salida', reason: dto.source === 'direct' ? 'entrega_directa' : 'prescripcion', quantity: line.quantity, relatedEntityType: 'delivery', relatedEntityId: delivery.id, createdBy: actor } });
        await tx.deliveryLine.create({ data: { ...line, deliveryId: delivery.id, stockMovementId: movement.id, productName: product.name, productSku: product.sku, presentation: presentation(product), stockUnit: product.stockUnit! } });
      }
      return tx.delivery.findUniqueOrThrow({ where: { id: delivery.id }, select: deliverySelect });
    });
  }

  async reverse(id: string, dto: ReverseDeliveryDto, key: string, actor: string) {
    id = requireUuid(id); actor = requireUuid(actor);
    const reason = dto.reason?.trim();
    if (!reason || reason.length > 500 || dto.physicalStockConfirmed !== true) throw new BadRequestException('Indica el motivo y confirma disponibilidad física de todos los envases');
    return this.command(key, fingerprint({ operation: 'reversal', id, reason, physicalStockConfirmed: true }), async tx => {
      // Same lock order as confirmation: prescription before products.
      const original = await tx.delivery.findUnique({ where: { id }, select: deliverySelect });
      if (!original || original.kind !== 'delivery') throw new NotFoundException('Entrega original no disponible');
      if (original.prescriptionId) await tx.$queryRaw`SELECT id FROM prescriptions WHERE id = ${original.prescriptionId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM deliveries WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.delivery.findUniqueOrThrow({ where: { id }, select: deliverySelect });
      if (current.reversal) throw new ConflictException('La entrega ya fue revertida');
      for (const productId of [...new Set(current.lines.map(line => line.productId))].sort()) {
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
      }
      const reversal = await tx.delivery.create({ data: { kind: 'reversal', source: current.source, prescriptionId: current.prescriptionId, reversalOfId: id, idempotencyKey: key, requestHash: fingerprint({ operation: 'reversal', id, reason, physicalStockConfirmed: true }), reason, physicalStockConfirmed: true, createdBy: actor } });
      for (const line of current.lines) {
        const balance = await tx.stockBalance.updateMany({ where: { productId: line.productId, currentQuantity: { lte: 2147483647 - line.quantity } }, data: { currentQuantity: { increment: line.quantity } } });
        if (balance.count !== 1) throw new ConflictException('No se puede reincorporar esta cantidad al saldo actual; no se registró el reverso');
        const movement = await tx.stockMovement.create({ data: { productId: line.productId, movementType: 'entrada', reason: 'devolucion', quantity: line.quantity, relatedEntityType: 'delivery', relatedEntityId: reversal.id, notes: reason, createdBy: actor } });
        await tx.deliveryLine.create({ data: { deliveryId: reversal.id, productId: line.productId, prescriptionItemId: line.prescriptionItemId, stockMovementId: movement.id, quantity: line.quantity, productName: line.productName, productSku: line.productSku, presentation: line.presentation, stockUnit: line.stockUnit } });
      }
      return tx.delivery.findUniqueOrThrow({ where: { id: reversal.id }, select: deliverySelect });
    });
  }
}
