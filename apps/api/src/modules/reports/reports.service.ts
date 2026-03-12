import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPatientsReport(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalPatients, byType, newPatients] = await Promise.all([
      this.prisma.patient.count({ where: { deletedAt: null } }),
      this.prisma.patient.groupBy({
        by: ['tipoPaciente'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      this.prisma.patient.count({
        where: { ...where, deletedAt: null },
      }),
    ]);

    return {
      totalPatients,
      newPatients,
      byType: byType.map((item: any) => ({
        type: item.tipoPaciente,
        count: item._count.id,
      })),
    };
  }

  async getProceduresReport(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.procedureDate = {};
      if (startDate) where.procedureDate.gte = new Date(startDate);
      if (endDate) where.procedureDate.lte = new Date(endDate);
    }

    const [totalProcedures, avgFollicles] = await Promise.all([
      this.prisma.procedureReport.count({ where }),
      this.prisma.procedureReport.aggregate({
        _avg: { totalFoliculos: true },
        _sum: { totalFoliculos: true },
        where,
      }),
    ]);

    return {
      totalProcedures,
      averageFollicles: avgFollicles._avg.totalFoliculos,
      totalFollicles: avgFollicles._sum.totalFoliculos,
    };
  }

  async getSalesReport(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        ...where,
        movementType: 'salida',
      },
      include: {
        product: true,
      },
    });

    return {
      totalMovements: movements.length,
      movements,
    };
  }
}
