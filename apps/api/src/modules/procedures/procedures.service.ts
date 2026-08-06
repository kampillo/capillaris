import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { USER_PUBLIC_SELECT } from '../../common/prisma/user-select';

@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService) {}

  private toDate(value?: string | null): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  async create(dto: CreateProcedureDto, userId?: string) {
    const { doctorIds, hairTypeIds, ...data } = dto;

    return this.prisma.procedureReport.create({
      data: {
        ...data,
        procedureDate: new Date(data.procedureDate),
        anestExtFechaInicial: this.toDate(data.anestExtFechaInicial),
        anestExtFechaFinal: this.toDate(data.anestExtFechaFinal),
        anestImpFechaInicial: this.toDate(data.anestImpFechaInicial),
        anestImpFechaFinal: this.toDate(data.anestImpFechaFinal),
        createdBy: userId,
        doctors: doctorIds
          ? {
              create: doctorIds.map((doctorId) => ({ doctorId })),
            }
          : undefined,
        hairTypes: hairTypeIds
          ? {
              create: hairTypeIds.map((hairTypeId) => ({ hairTypeId })),
            }
          : undefined,
      } as any,
      include: {
        patient: true,
        operatingRoom: true,
        doctors: { include: { doctor: { select: USER_PUBLIC_SELECT } } },
        hairTypes: { include: { hairType: true } },
        images: true,
      },
    });
  }

  async findAll(page?: number, pageSize?: number) {
    const p = page && !isNaN(page) ? page : 1;
    const ps = pageSize && !isNaN(pageSize) ? pageSize : 20;
    const skip = (p - 1) * ps;

    const [data, total] = await Promise.all([
      this.prisma.procedureReport.findMany({
        skip,
        take: ps,
        orderBy: { procedureDate: 'desc' },
        include: {
          patient: true,
          doctors: { include: { doctor: { select: USER_PUBLIC_SELECT } } },
          hairTypes: { include: { hairType: true } },
        },
      }),
      this.prisma.procedureReport.count(),
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

  async findByPatient(patientId: string) {
    return this.prisma.procedureReport.findMany({
      where: { patientId },
      include: {
        operatingRoom: true,
        doctors: { include: { doctor: { select: USER_PUBLIC_SELECT } } },
        hairTypes: { include: { hairType: true } },
      },
      orderBy: { procedureDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const procedure = await this.prisma.procedureReport.findUnique({
      where: { id },
      include: {
        patient: true,
        operatingRoom: true,
        doctors: { include: { doctor: { select: USER_PUBLIC_SELECT } } },
        hairTypes: { include: { hairType: true } },
        images: true,
      },
    });

    if (!procedure) {
      throw new NotFoundException(`Procedure report with ID ${id} not found`);
    }

    return procedure;
  }

  async update(id: string, dto: UpdateProcedureDto, userId?: string) {
    await this.findOne(id);
    const { doctorIds, hairTypeIds, ...data } = dto;

    return this.prisma.procedureReport.update({
      where: { id },
      data: {
        ...data,
        procedureDate: data.procedureDate
          ? new Date(data.procedureDate)
          : undefined,
        anestExtFechaInicial: this.toDate(data.anestExtFechaInicial),
        anestExtFechaFinal: this.toDate(data.anestExtFechaFinal),
        anestImpFechaInicial: this.toDate(data.anestImpFechaInicial),
        anestImpFechaFinal: this.toDate(data.anestImpFechaFinal),
        updatedBy: userId,
      } as any,
      include: {
        patient: true,
        operatingRoom: true,
        doctors: { include: { doctor: { select: USER_PUBLIC_SELECT } } },
        hairTypes: { include: { hairType: true } },
        images: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.procedureReport.delete({ where: { id } });
  }

  /**
   * Une dos reportes en una misma sesión de trasplante.
   *
   * La clínica reparte algunos trasplantes en dos días. Antes quedaban como
   * dos procedimientos sueltos, cada uno con su cuenta de folículos; unirlos
   * permite mostrarlos como una sesión con el total sumado.
   *
   * Si alguno ya pertenece a una sesión se reutiliza ese grupo, así que unir
   * un tercer día funciona igual.
   */
  async linkSession(id: string, otherId: string) {
    if (id === otherId) {
      throw new BadRequestException('Un reporte no se puede unir consigo mismo');
    }

    const [a, b] = await Promise.all([
      this.prisma.procedureReport.findUnique({ where: { id } }),
      this.prisma.procedureReport.findUnique({ where: { id: otherId } }),
    ]);
    if (!a) throw new NotFoundException(`Procedimiento ${id} no encontrado`);
    if (!b) throw new NotFoundException(`Procedimiento ${otherId} no encontrado`);
    if (a.patientId !== b.patientId) {
      throw new BadRequestException(
        'Sólo se pueden unir procedimientos del mismo paciente',
      );
    }

    const groupId = a.sessionGroupId ?? b.sessionGroupId ?? randomUUID();

    const miembros = await this.prisma.procedureReport.findMany({
      where: {
        OR: [
          { id: { in: [id, otherId] } },
          ...(a.sessionGroupId ? [{ sessionGroupId: a.sessionGroupId }] : []),
          ...(b.sessionGroupId ? [{ sessionGroupId: b.sessionGroupId }] : []),
        ],
      },
      orderBy: { procedureDate: 'asc' },
    });

    // El día se numera por fecha, no por orden de captura.
    await this.prisma.$transaction(
      miembros.map((m, idx) =>
        this.prisma.procedureReport.update({
          where: { id: m.id },
          data: { sessionGroupId: groupId, sessionDay: idx + 1 },
        }),
      ),
    );

    return this.findByPatient(a.patientId);
  }

  /** Saca un reporte de su sesión y renumera los que quedan. */
  async unlinkSession(id: string) {
    const reporte = await this.prisma.procedureReport.findUnique({
      where: { id },
    });
    if (!reporte) throw new NotFoundException(`Procedimiento ${id} no encontrado`);
    if (!reporte.sessionGroupId) {
      throw new BadRequestException('Ese procedimiento no pertenece a una sesión');
    }

    const restantes = await this.prisma.procedureReport.findMany({
      where: { sessionGroupId: reporte.sessionGroupId, id: { not: id } },
      orderBy: { procedureDate: 'asc' },
    });

    await this.prisma.$transaction([
      this.prisma.procedureReport.update({
        where: { id },
        data: { sessionGroupId: null, sessionDay: null },
      }),
      // Un solo miembro ya no es una sesión.
      ...restantes.map((m, idx) =>
        this.prisma.procedureReport.update({
          where: { id: m.id },
          data:
            restantes.length === 1
              ? { sessionGroupId: null, sessionDay: null }
              : { sessionDay: idx + 1 },
        }),
      ),
    ]);

    return this.findByPatient(reporte.patientId);
  }
}
