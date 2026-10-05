import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, userId?: string) {
    const { initialStock, initialStockReason, ...productData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          createdBy: userId,
        } as any,
      });

      if (initialStock && initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: 'entrada',
            reason: initialStockReason || 'compra',
            quantity: initialStock,
            notes: 'Stock inicial',
            createdBy: userId,
          },
        });
        await tx.stockBalance.create({
          data: { productId: product.id, currentQuantity: initialStock },
        });
      } else {
        await tx.stockBalance.create({
          data: { productId: product.id, currentQuantity: 0 },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { category: true, stockBalance: true },
      });
    });
  }

  async findAll(page = 1, pageSize = 20, isMedicine?: boolean, search?: string, isActive?: boolean) {
    page = Math.max(1, Math.floor(Number(page) || 1));
    pageSize = Math.min(500, Math.max(1, Math.floor(Number(pageSize) || 20)));
    if (search && search.length > 100) throw new BadRequestException('Búsqueda demasiado larga');
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProductWhereInput = {
      ...(isMedicine !== undefined && { isMedicine }), ...(isActive !== undefined && { isActive }),
      ...(search?.trim() && { OR: [{ name: { contains: search.trim(), mode: 'insensitive' } }, { sku: { contains: search.trim(), mode: 'insensitive' } }] }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          category: true,
          stockBalance: true,
        },
      }),
      this.prisma.product.count({ where }),
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockBalance: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId?: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${id}::uuid FOR UPDATE`;
      const old = await tx.product.findUnique({ where: { id } });
      if (!old) throw new NotFoundException('Producto no disponible');
      const changesPresentation = ['stockUnit', 'content', 'unit', 'sku'].some(field => (dto as any)[field] !== undefined && String((dto as any)[field] ?? '') !== String((old as any)[field] ?? ''));
      if (changesPresentation && (await tx.deliveryLine.count({ where: { productId: id } }) || await tx.prescriptionItem.count({ where: { productId: id, fulfillmentQuantity: { not: null } } }))) throw new BadRequestException('Esta presentación tiene entregas u objetivos autorizados; crea otro producto para una presentación diferente');
      return tx.product.update({
        where: { id },
        data: {
          ...dto,
          updatedBy: userId,
        } as any,
        include: {
          category: true,
          stockBalance: true,
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
