import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async create(createAppointmentDto: CreateAppointmentDto, userId?: string) {
    const appointment = await this.prisma.appointment.create({
      data: {
        ...createAppointmentDto,
        createdBy: userId,
      } as any,
      include: {
        patient: true,
        doctor: true,
      },
    });

    // Sync to Google Calendar
    if (userId) {
      const eventId = await this.googleCalendarService.createEvent(userId, {
        title: appointment.title,
        description: appointment.description,
        startDatetime: appointment.startDatetime,
        endDatetime: appointment.endDatetime,
        patientName: `${appointment.patient.nombre} ${appointment.patient.apellido}`,
      });

      if (eventId) {
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: { googleCalendarEventId: eventId },
        });
        appointment.googleCalendarEventId = eventId;
      }
    }

    return appointment;
  }

  async findAll(page = 1, pageSize = 20, timeMin?: string, timeMax?: string) {
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (timeMin || timeMax) {
      where.startDatetime = {};
      if (timeMin) where.startDatetime.gte = new Date(timeMin);
      if (timeMax) where.startDatetime.lte = new Date(timeMax);
    }

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startDatetime: 'desc' },
        include: {
          patient: true,
          doctor: true,
        },
      }),
      this.prisma.appointment.count({ where }),
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
    const appointment = await this.prisma.appointment.update({
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

    // Sync update to Google Calendar
    if (userId && appointment.googleCalendarEventId) {
      await this.googleCalendarService.updateEvent(
        userId,
        appointment.googleCalendarEventId,
        {
          title: appointment.title,
          description: appointment.description,
          startDatetime: appointment.startDatetime,
          endDatetime: appointment.endDatetime,
          patientName: `${appointment.patient.nombre} ${appointment.patient.apellido}`,
          status: appointment.status,
        },
      );
    }

    return appointment;
  }

  async remove(id: string, userId?: string) {
    const appointment = await this.findOne(id);

    // Delete from Google Calendar
    if (userId && appointment.googleCalendarEventId) {
      await this.googleCalendarService.deleteEvent(userId, appointment.googleCalendarEventId);
    }

    return this.prisma.appointment.delete({ where: { id } });
  }
}
