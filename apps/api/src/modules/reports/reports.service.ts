import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Range = { start?: Date; end?: Date };

function parseRange(startDate?: string, endDate?: string): Range {
  return {
    start: startDate ? new Date(startDate) : undefined,
    end: endDate ? new Date(endDate) : undefined,
  };
}

function getPreviousRange(r: Range): Range | null {
  if (!r.start || !r.end) return null;
  const ms = r.end.getTime() - r.start.getTime();
  return {
    start: new Date(r.start.getTime() - ms - 86400000),
    end: new Date(r.start.getTime() - 86400000),
  };
}

function dateFilter(field: string, r: Range): any {
  if (!r.start && !r.end) return {};
  const f: any = {};
  if (r.start) f.gte = r.start;
  if (r.end) f.lte = r.end;
  return { [field]: f };
}

function delta(current: number, previous: number | null): number | null {
  if (previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- PATIENTS ----------
  async getPatientsReport(startDate?: string, endDate?: string) {
    const r = parseRange(startDate, endDate);
    const prev = getPreviousRange(r);

    const [totalPatients, newPatients, previousNewPatients, byType] = await Promise.all([
      this.prisma.patient.count({ where: { deletedAt: null } }),
      this.prisma.patient.count({
        where: { deletedAt: null, ...dateFilter('createdAt', r) },
      }),
      prev
        ? this.prisma.patient.count({
            where: { deletedAt: null, ...dateFilter('createdAt', prev) },
          })
        : Promise.resolve(null),
      this.prisma.patient.groupBy({
        by: ['tipoPaciente'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
    ]);

    // Monthly new patients last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const recentPatients = await this.prisma.patient.findMany({
      where: { deletedAt: null, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });
    const monthlySeries = buildMonthlySeries(recentPatients.map((p) => p.createdAt), 6);

    return {
      totalPatients,
      newPatients,
      previousNewPatients,
      newPatientsDelta: delta(newPatients, previousNewPatients ?? null),
      byType: byType.map((item: any) => ({
        type: item.tipoPaciente,
        count: item._count.id,
      })),
      monthlySeries,
    };
  }

  // ---------- PROCEDURES ----------
  async getProceduresReport(startDate?: string, endDate?: string) {
    const r = parseRange(startDate, endDate);
    const prev = getPreviousRange(r);
    const where = dateFilter('procedureDate', r);
    const wherePrev = prev ? dateFilter('procedureDate', prev) : null;

    const [totalProcedures, previousTotal, agg, byDoctorRaw] = await Promise.all([
      this.prisma.procedureReport.count({ where }),
      wherePrev
        ? this.prisma.procedureReport.count({ where: wherePrev })
        : Promise.resolve(null),
      this.prisma.procedureReport.aggregate({
        _avg: { totalFoliculos: true },
        _sum: { totalFoliculos: true },
        where,
      }),
      this.prisma.procedureReport.findMany({
        where,
        select: {
          doctors: {
            select: { doctor: { select: { id: true, nombre: true, apellido: true } } },
          },
        },
      }),
    ]);

    // Aggregate procedures per doctor (a procedure can have multiple doctors)
    const docCount = new Map<string, { name: string; count: number }>();
    for (const p of byDoctorRaw) {
      for (const d of p.doctors) {
        const key = d.doctor.id;
        const name = `${d.doctor.nombre} ${d.doctor.apellido}`;
        const cur = docCount.get(key);
        docCount.set(key, { name, count: (cur?.count ?? 0) + 1 });
      }
    }
    const byDoctor = Array.from(docCount.values()).sort((a, b) => b.count - a.count);

    return {
      totalProcedures,
      previousTotal,
      proceduresDelta: delta(totalProcedures, previousTotal),
      averageFollicles: agg._avg.totalFoliculos,
      totalFollicles: agg._sum.totalFoliculos,
      byDoctor,
    };
  }

  // ---------- APPOINTMENTS ----------
  async getAppointmentsReport(startDate?: string, endDate?: string) {
    const r = parseRange(startDate, endDate);
    const prev = getPreviousRange(r);
    const where = dateFilter('startDatetime', r);
    const wherePrev = prev ? dateFilter('startDatetime', prev) : null;

    const [total, previousTotal, byStatusRaw] = await Promise.all([
      this.prisma.appointment.count({ where }),
      wherePrev
        ? this.prisma.appointment.count({ where: wherePrev })
        : Promise.resolve(null),
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: { id: true },
        where,
      }),
    ]);

    const byStatus: Record<string, number> = {
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
      rescheduled: 0,
    };
    for (const s of byStatusRaw) {
      byStatus[s.status as string] = s._count.id;
    }

    const decided = byStatus.completed + byStatus.cancelled + byStatus.no_show;
    const noShowRate = decided > 0 ? Math.round((byStatus.no_show / decided) * 100) : 0;
    const completedRate = decided > 0 ? Math.round((byStatus.completed / decided) * 100) : 0;
    const cancelledRate = decided > 0 ? Math.round((byStatus.cancelled / decided) * 100) : 0;

    return {
      total,
      previousTotal,
      totalDelta: delta(total, previousTotal),
      byStatus,
      noShowRate,
      completedRate,
      cancelledRate,
    };
  }

  // ---------- PRESCRIPTIONS ----------
  async getPrescriptionsReport(startDate?: string, endDate?: string) {
    const r = parseRange(startDate, endDate);
    const prev = getPreviousRange(r);
    const where = dateFilter('prescriptionDate', r);
    const wherePrev = prev ? dateFilter('prescriptionDate', prev) : null;

    const [total, previousTotal, byStatusRaw, totalActive] = await Promise.all([
      this.prisma.prescription.count({ where }),
      wherePrev
        ? this.prisma.prescription.count({ where: wherePrev })
        : Promise.resolve(null),
      this.prisma.prescription.groupBy({
        by: ['status'],
        _count: { id: true },
        where,
      }),
      this.prisma.prescription.count({ where: { status: 'active' } }),
    ]);

    const byStatus: Record<string, number> = {
      draft: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const s of byStatusRaw) {
      byStatus[s.status as string] = s._count.id;
    }

    return {
      total,
      previousTotal,
      totalDelta: delta(total, previousTotal),
      byStatus,
      totalActive,
    };
  }

  // ---------- INVENTORY ----------
  async getInventoryReport(startDate?: string, endDate?: string) {
    const r = parseRange(startDate, endDate);
    const where = dateFilter('createdAt', r);

    // Low stock: products where currentQuantity <= minStockAlert
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { stockBalance: true },
    });
    const lowStockCount = products.filter(
      (p) => (p.stockBalance?.currentQuantity ?? 0) <= p.minStockAlert,
    ).length;
    const totalProducts = products.length;

    // Top moved products in range
    const movements = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      _count: { id: true },
      _sum: { quantity: true },
      where,
    });
    const sorted = movements
      .map((m: any) => ({
        productId: m.productId as string,
        movements: m._count.id as number,
        units: (m._sum.quantity ?? 0) as number,
      }))
      .sort((a, b) => b.movements - a.movements)
      .slice(0, 5);
    const productMap = new Map(products.map((p) => [p.id, p.name] as const));
    const topMovedProducts = sorted.map((m) => ({
      productId: m.productId,
      name: productMap.get(m.productId) ?? '—',
      movements: m.movements,
      units: m.units,
    }));

    return {
      lowStockCount,
      totalProducts,
      topMovedProducts,
    };
  }

  // ---------- SOURCES (marketing) ----------
  async getSourcesReport(startDate?: string, endDate?: string) {
    const r = parseRange(startDate, endDate);
    const where = { deletedAt: null, ...dateFilter('createdAt', r) };

    const byChannelRaw = await this.prisma.patient.groupBy({
      by: ['origenCanal'],
      _count: { id: true },
      where,
    });
    const byChannel = byChannelRaw
      .map((c: any) => ({
        channel: (c.origenCanal as string) ?? 'sin_canal',
        count: c._count.id as number,
      }))
      .sort((a, b) => b.count - a.count);

    // Conversion lead → active (across patients created in range)
    const periodPatients = await this.prisma.patient.findMany({
      where,
      select: { tipoPaciente: true },
    });
    const total = periodPatients.length;
    const active = periodPatients.filter(
      (p) => p.tipoPaciente === 'active' || p.tipoPaciente === 'evaluation',
    ).length;
    const conversionRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      byChannel,
      conversionRate,
      totalLeads: periodPatients.filter((p) => p.tipoPaciente === 'lead').length,
      totalActive: active,
    };
  }

  // ---------- CLINICAL ----------
  async getClinicalReport(startDate?: string, endDate?: string) {
    const r = parseRange(startDate, endDate);
    const prev = getPreviousRange(r);
    const where = dateFilter('consultationDate', r);
    const wherePrev = prev ? dateFilter('consultationDate', prev) : null;

    const [consultations, prevConsultations, variantsRaw, donorZonesRaw] = await Promise.all([
      this.prisma.medicalConsultation.count({ where }),
      wherePrev
        ? this.prisma.medicalConsultation.count({ where: wherePrev })
        : Promise.resolve(null),
      this.prisma.consultationVariant.findMany({
        where: { consultation: where },
        include: { variant: { select: { name: true } } },
      }),
      this.prisma.consultationDonorZone.findMany({
        where: { consultation: where },
        include: { donorZone: { select: { name: true } } },
      }),
    ]);

    const variantCounts = new Map<string, number>();
    for (const v of variantsRaw) {
      const name = v.variant.name;
      variantCounts.set(name, (variantCounts.get(name) ?? 0) + 1);
    }
    const variantsDistribution = Array.from(variantCounts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const zoneCounts = new Map<string, number>();
    for (const z of donorZonesRaw) {
      const name = z.donorZone.name;
      zoneCounts.set(name, (zoneCounts.get(name) ?? 0) + 1);
    }
    const topDonorZones = Array.from(zoneCounts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      consultations,
      previousConsultations: prevConsultations,
      consultationsDelta: delta(consultations, prevConsultations),
      variantsDistribution,
      topDonorZones,
    };
  }

  // ---------- SALES (legacy, kept for compatibility) ----------
  async getSalesReport(startDate?: string, endDate?: string) {
    const r = parseRange(startDate, endDate);
    const movements = await this.prisma.stockMovement.findMany({
      where: { ...dateFilter('createdAt', r), movementType: 'salida' },
      include: { product: true },
    });
    return {
      totalMovements: movements.length,
      movements,
    };
  }
}

// ---------- helpers ----------

function buildMonthlySeries(dates: Date[], months: number): { month: string; count: number }[] {
  const series: { month: string; count: number; date: Date }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    series.push({
      month: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
      count: 0,
      date: d,
    });
  }
  for (const d of dates) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = series.findIndex(
      (s) => `${s.date.getFullYear()}-${s.date.getMonth()}` === key,
    );
    if (idx >= 0) series[idx].count++;
  }
  return series.map(({ month, count }) => ({ month, count }));
}
