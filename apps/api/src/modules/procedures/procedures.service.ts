import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { USER_PUBLIC_SELECT } from '../../common/prisma/user-select';

@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService) {}

  private toDate(value?: string | null): Date | null | undefined {
    return value === null ? null : value ? new Date(value) : undefined;
  }

  private rejectDirectSessionFields(dto: CreateProcedureDto | UpdateProcedureDto) {
    if (dto.sessionGroupId !== undefined || dto.sessionDay !== undefined) {
      throw new BadRequestException('Para unir o separar días utiliza las acciones de sesión');
    }
  }

  private validateSession(members: { patientId: string; procedureDate: Date }[]) {
    if (members.length !== 2) {
      throw new BadRequestException('Un procedimiento admite como máximo dos reportes de días consecutivos');
    }
    if (members[0].patientId !== members[1].patientId) {
      throw new BadRequestException('Sólo se pueden unir procedimientos del mismo paciente');
    }
    // procedureDate is a database DATE: compare calendar days in UTC, not local DST hours.
    const days = members.map(({ procedureDate }) => Date.UTC(
      procedureDate.getUTCFullYear(), procedureDate.getUTCMonth(), procedureDate.getUTCDate(),
    )).sort((a, b) => a - b);
    if (days[1] - days[0] !== 86_400_000) {
      throw new BadRequestException('Los reportes deben corresponder a dos días consecutivos distintos');
    }
  }

  private async sessionTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    // Retry serialization conflicts so simultaneous links cannot add a third day.
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt >= 2) throw error;
      }
    }
  }

  async create(dto: CreateProcedureDto, userId?: string) {
    this.rejectDirectSessionFields(dto);
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
        nurses: { select: { nurse: { select: { id: true, nombre: true, apellido: true } } } },
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
    this.rejectDirectSessionFields(dto);
    return this.sessionTransaction(async (tx) => {
      const current = await tx.procedureReport.findUnique({ where: { id } });
      if (!current) throw new NotFoundException(`Procedure report with ID ${id} not found`);
      if (current.sessionGroupId && dto.procedureDate !== undefined &&
          new Date(dto.procedureDate).getTime() !== current.procedureDate.getTime()) {
        throw new BadRequestException('Separa el reporte de su sesión antes de cambiar la fecha');
      }
      const { doctorIds, hairTypeIds, ...data } = dto;

      return tx.procedureReport.update({
        where: { id },
        data: {
          ...data,
          ...(doctorIds !== undefined ? { doctors: { deleteMany: {}, create: [...new Set(doctorIds)].map(doctorId => ({ doctorId })) } } : {}),
          ...(hairTypeIds !== undefined ? { hairTypes: { deleteMany: {}, create: [...new Set(hairTypeIds)].map(hairTypeId => ({ hairTypeId })) } } : {}),
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
   * Una sesión admite exactamente dos reportes de días consecutivos.
   */
  async linkSession(id: string, otherId: string) {
    if (typeof otherId !== 'string' || !otherId.trim()) {
      throw new BadRequestException('Selecciona el reporte que deseas unir');
    }
    if (id === otherId) {
      throw new BadRequestException('Un reporte no se puede unir consigo mismo');
    }

    const patientId = await this.sessionTransaction(async (tx) => {
      const [a, b] = await Promise.all([
        tx.procedureReport.findUnique({ where: { id } }),
        tx.procedureReport.findUnique({ where: { id: otherId } }),
      ]);
      if (!a) throw new NotFoundException(`Procedimiento ${id} no encontrado`);
      if (!b) throw new NotFoundException(`Procedimiento ${otherId} no encontrado`);
      if (a.patientId !== b.patientId) {
        throw new BadRequestException(
          'Sólo se pueden unir procedimientos del mismo paciente',
        );
      }

      const groupId = a.sessionGroupId ?? b.sessionGroupId ?? randomUUID();

      const miembros = await tx.procedureReport.findMany({
        where: {
          OR: [
            { id: { in: [id, otherId] } },
            ...(a.sessionGroupId ? [{ sessionGroupId: a.sessionGroupId }] : []),
            ...(b.sessionGroupId ? [{ sessionGroupId: b.sessionGroupId }] : []),
          ],
        },
        orderBy: { procedureDate: 'asc' },
      });

      this.validateSession(miembros);
      // El día se numera por fecha, no por orden de captura.
      await Promise.all(
        miembros.map((m, idx) =>
          tx.procedureReport.update({
            where: { id: m.id },
            data: { sessionGroupId: groupId, sessionDay: idx + 1 },
          }),
        ),
      );

      return a.patientId;
    });
    return this.findByPatient(patientId);
  }

  /** Saca un reporte de su sesión y renumera los que quedan. */
  async unlinkSession(id: string) {
    const patientId = await this.sessionTransaction(async (tx) => {
      const reporte = await tx.procedureReport.findUnique({
        where: { id },
      });
      if (!reporte) throw new NotFoundException(`Procedimiento ${id} no encontrado`);
      if (!reporte.sessionGroupId) {
        throw new BadRequestException('Ese procedimiento no pertenece a una sesión');
      }

      const restantes = await tx.procedureReport.findMany({
        where: { sessionGroupId: reporte.sessionGroupId, id: { not: id } },
        orderBy: { procedureDate: 'asc' },
      });

      await Promise.all([
        tx.procedureReport.update({
          where: { id },
          data: { sessionGroupId: null, sessionDay: null },
        }),
        // Un solo miembro ya no es una sesión.
        ...restantes.map((m, idx) =>
          tx.procedureReport.update({
            where: { id: m.id },
            data:
              restantes.length === 1
                ? { sessionGroupId: null, sessionDay: null }
                : { sessionDay: idx + 1 },
          }),
        ),
      ]);

      return reporte.patientId;
    });
    return this.findByPatient(patientId);
  }
}
