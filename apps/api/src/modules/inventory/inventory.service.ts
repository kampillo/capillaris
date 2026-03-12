import { Injectable, NotFoundException } from '@nestjs/common';
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
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stockBalance: {
          currentQuantity: {
            lte: 0, // Will be compared to minStockAlert in app logic
          },
        },
      },
      include: {
        stockBalance: true,
        category: true,
      },
    });

    return lowStockProducts;
  }

  async createMovement(dto: CreateStockMovementDto, userId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { stockBalance: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    // Create movement and update balance in a transaction
    return this.prisma.$transaction(async (tx: any) => {
      const movement = await tx.stockMovement.create({
        data: {
          ...dto,
          createdBy: userId,
        } as any,
      });

      const quantityChange =
        dto.movementType === 'entrada' ? dto.quantity : -dto.quantity;

      await tx.stockBalance.upsert({
        where: { productId: dto.productId },
        update: {
          currentQuantity: {
            increment: quantityChange,
          },
        },
        create: {
          productId: dto.productId,
          currentQuantity: Math.max(0, quantityChange),
        },
      });

      return movement;
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
}
