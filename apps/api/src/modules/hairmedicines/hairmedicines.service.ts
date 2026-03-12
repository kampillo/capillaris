import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHairmedicineDto } from './dto/create-hairmedicine.dto';
import { UpdateHairmedicineDto } from './dto/update-hairmedicine.dto';

@Injectable()
export class HairmedicinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHairmedicineDto, userId?: string) {
    return this.prisma.hairmedicine.create({
      data: {
        ...dto,
        createdBy: userId,
      } as any,
      include: {
        patient: true,
        doctor: true,
      },
    });
  }

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.hairmedicine.findMany({
        skip,
        take: pageSize,
        orderBy: { fecha: 'desc' },
        include: {
          patient: true,
          doctor: true,
        },
      }),
      this.prisma.hairmedicine.count(),
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
    const hairmedicine = await this.prisma.hairmedicine.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!hairmedicine) {
      throw new NotFoundException(`Hairmedicine with ID ${id} not found`);
    }

    return hairmedicine;
  }

  async update(id: string, dto: UpdateHairmedicineDto, userId?: string) {
    await this.findOne(id);
    return this.prisma.hairmedicine.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
      } as any,
      include: {
        patient: true,
        doctor: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.hairmedicine.delete({ where: { id } });
  }
}
