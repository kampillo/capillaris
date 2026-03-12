import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMicropigmentationDto } from './dto/create-micropigmentation.dto';
import { UpdateMicropigmentationDto } from './dto/update-micropigmentation.dto';

@Injectable()
export class MicropigmentationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMicropigmentationDto, userId?: string) {
    const { hairTypeIds, ...data } = dto;

    return this.prisma.micropigmentation.create({
      data: {
        ...data,
        createdBy: userId,
        hairTypes: hairTypeIds
          ? {
              create: hairTypeIds.map((hairTypeId) => ({ hairTypeId })),
            }
          : undefined,
      } as any,
      include: {
        patient: true,
        doctor: true,
        hairTypes: { include: { hairType: true } },
      },
    });
  }

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.micropigmentation.findMany({
        skip,
        take: pageSize,
        orderBy: { fecha: 'desc' },
        include: {
          patient: true,
          doctor: true,
          hairTypes: { include: { hairType: true } },
        },
      }),
      this.prisma.micropigmentation.count(),
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
    const micropigmentation = await this.prisma.micropigmentation.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        hairTypes: { include: { hairType: true } },
      },
    });

    if (!micropigmentation) {
      throw new NotFoundException(`Micropigmentation with ID ${id} not found`);
    }

    return micropigmentation;
  }

  async update(id: string, dto: UpdateMicropigmentationDto, userId?: string) {
    await this.findOne(id);
    const { hairTypeIds, ...data } = dto;

    return this.prisma.micropigmentation.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      } as any,
      include: {
        patient: true,
        doctor: true,
        hairTypes: { include: { hairType: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.micropigmentation.delete({ where: { id } });
  }
}
