import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPatientDto: CreatePatientDto, userId?: string) {
    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        createdBy: userId,
      } as any,
    });
  }

  async findAll(page?: number, pageSize?: number) {
    const p = page && !isNaN(page) ? page : 1;
    const ps = pageSize && !isNaN(pageSize) ? pageSize : 20;
    const skip = (p - 1) * ps;

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where: { deletedAt: null },
        skip,
        take: ps,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where: { deletedAt: null } }),
    ]);

    return {
      data,
      meta: {
        total,
        page: p,
        pageSize: ps,
        totalPages: Math.ceil(total / ps),
      },
    };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { startDatetime: 'desc' }, take: 5 },
        prescriptions: { orderBy: { createdAt: 'desc' }, take: 5 },
        medicalConsultations: { orderBy: { consultationDate: 'desc' }, take: 5 },
        procedureReports: { orderBy: { procedureDate: 'desc' }, take: 5 },
        clinicalHistories: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!patient || patient.deletedAt) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  async search(searchDto: SearchPatientsDto) {
    const { query, tipoPaciente, page = 1, pageSize = 20 } = searchDto;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };

    if (query) {
      where.OR = [
        { nombre: { contains: query, mode: 'insensitive' } },
        { apellido: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { celular: { contains: query } },
      ];
    }

    if (tipoPaciente) {
      where.tipoPaciente = tipoPaciente;
    }

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
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

  async update(id: string, updatePatientDto: UpdatePatientDto, userId?: string) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...updatePatientDto,
        updatedBy: userId,
      } as any,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
