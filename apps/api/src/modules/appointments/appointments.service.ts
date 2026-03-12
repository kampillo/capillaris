import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto, userId?: string) {
    return this.prisma.appointment.create({
      data: {
        ...createAppointmentDto,
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
      this.prisma.appointment.findMany({
        skip,
        take: pageSize,
        orderBy: { startDatetime: 'desc' },
        include: {
          patient: true,
          doctor: true,
        },
      }),
      this.prisma.appointment.count(),
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
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto, userId?: string) {
    await this.findOne(id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...updateAppointmentDto,
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
    return this.prisma.appointment.delete({ where: { id } });
  }
}
