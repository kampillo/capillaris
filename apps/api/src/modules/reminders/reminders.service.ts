import { Injectable, NotFoundException } from '@nestjs/common';
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

  async update(id: string, data: { status?: string; sentAt?: string; errorMessage?: string }) {
    await this.findOne(id);
    return this.prisma.reminder.update({
      where: { id },
      data: {
        ...data,
        sentAt: data.sentAt ? new Date(data.sentAt) : undefined,
      } as any,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.reminder.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }
}
