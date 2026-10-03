import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventory(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.stockBalance.findMany({
        skip,
        take: pageSize,
        include: {
          product: {
            include: { category: true },
          },
        },
        orderBy: {
          product: { name: 'asc' },
        },
      }),
      this.prisma.stockBalance.count(),
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

  async getLowStock() {
    const products = await this.prisma.product.findMany({ where: { isActive: true }, include: { stockBalance: true, category: true } });
    return products.filter(product => (product.stockBalance?.currentQuantity ?? 0) <= product.minStockAlert);
  }

  async createMovement(dto: CreateStockMovementDto, userId?: string) {
    if (!['entrada', 'salida'].includes(dto.movementType) || !Number.isInteger(dto.quantity) || dto.quantity < 1) throw new BadRequestException('Usa una entrada o salida con cantidad positiva');
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || !product.isActive) throw new NotFoundException('Producto no disponible');
    return this.prisma.$transaction(async tx => {
      if (dto.movementType === 'entrada') {
        await tx.stockBalance.upsert({ where: { productId: dto.productId }, update: { currentQuantity: { increment: dto.quantity } }, create: { productId: dto.productId, currentQuantity: dto.quantity } });
      } else {
        // The condition and decrement are one SQL update, including concurrent exits.
        const changed = await tx.stockBalance.updateMany({ where: { productId: dto.productId, currentQuantity: { gte: dto.quantity } }, data: { currentQuantity: { decrement: dto.quantity } } });
        if (changed.count !== 1) throw new BadRequestException('Existencias insuficientes para registrar la salida');
      }
      return tx.stockMovement.create({ data: { ...dto, createdBy: userId } });
    });
  }

  async getMovements(productId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { productId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
        },
      }),
      this.prisma.stockMovement.count({ where: { productId } }),
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

  async getAllMovements(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { product: true },
      }),
      this.prisma.stockMovement.count(),
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
}
