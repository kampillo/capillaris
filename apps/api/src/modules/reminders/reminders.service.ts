import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    patientId: string;
    reminderType: string;
    scheduledFor: string;
    channel?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    messageTemplate?: string;
    messageVariables?: Record<string, unknown>;
  }, userId?: string) {
    return this.prisma.reminder.create({
      data: {
        ...data,
        scheduledFor: new Date(data.scheduledFor),
        createdBy: userId,
      } as any,
      include: {
        patient: true,
      },
    });
  }

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.reminder.findMany({
        skip,
        take: pageSize,
        orderBy: { scheduledFor: 'asc' },
        include: {
          patient: true,
        },
      }),
      this.prisma.reminder.count(),
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

  async findPending() {
    return this.prisma.reminder.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: new Date(),
        },
      },
      include: {
        patient: true,
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async findOne(id: string) {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder with ID ${id} not found`);
    }

    return reminder;
  }

  async update(id: string, data: { status: string }) {
    if (!['pending', 'cancelled'].includes(data.status)) throw new BadRequestException('Estado de recordatorio inválido');
    const current = await this.findOne(id);
    if (['sent', 'processing'].includes(current.status)) throw new BadRequestException('El recordatorio ya fue enviado o está en proceso');
    const changed = await this.prisma.reminder.updateMany({ where: { id, status: current.status }, data: { status: data.status, sentAt: null, errorMessage: null } });
    if (changed.count !== 1) throw new BadRequestException('El recordatorio cambió; recarga la página');
    return this.findOne(id);
  }

  async remove(id: string) {
    return this.update(id, { status: 'cancelled' });
  }
}
