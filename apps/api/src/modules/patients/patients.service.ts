import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import {
  SearchPatientsDto,
  PatientSortField,
} from './dto/search-patients.dto';

type SortOrder = 'asc' | 'desc';

const SORT_ORDERBY_PRISMA: Record<
  PatientSortField,
  (dir: SortOrder) => Prisma.PatientOrderByWithRelationInput[]
> = {
  name: (dir) => [{ nombre: dir }, { apellido: dir }],
  tipoPaciente: (dir) => [{ tipoPaciente: dir }],
  origenCanal: (dir) => [{ origenCanal: { sort: dir, nulls: 'last' } }],
  updatedAt: (dir) => [{ updatedAt: dir }],
  createdAt: (dir) => [{ createdAt: dir }],
};

const SORT_RAW_SQL: Record<PatientSortField, string> = {
  name: 'nombre {{dir}}, apellido {{dir}}',
  tipoPaciente: 'tipo_paciente {{dir}}',
  origenCanal: 'origen_canal {{dir}} NULLS LAST',
  updatedAt: 'updated_at {{dir}}',
  createdAt: 'created_at {{dir}}',
};

function resolveSort(
  sortBy?: PatientSortField,
  sortOrder?: SortOrder,
): { field: PatientSortField; dir: SortOrder } {
  const field: PatientSortField = sortBy ?? 'createdAt';
  const dir: SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  return { field, dir };
}

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

  async findAll(
    page?: number,
    pageSize?: number,
    sortBy?: PatientSortField,
    sortOrder?: SortOrder,
  ) {
    const p = page && !isNaN(page) ? page : 1;
    const ps = pageSize && !isNaN(pageSize) ? pageSize : 20;
    const skip = (p - 1) * ps;
    const { field, dir } = resolveSort(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where: { deletedAt: null },
        skip,
        take: ps,
        orderBy: SORT_ORDERBY_PRISMA[field](dir),
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
    const {
      query,
      tipoPaciente,
      page = 1,
      pageSize = 20,
      sortBy,
      sortOrder,
    } = searchDto;
    const skip = (page - 1) * pageSize;
    const { field, dir } = resolveSort(sortBy, sortOrder);
    const orderBySql = Prisma.raw(
      SORT_RAW_SQL[field].replaceAll('{{dir}}', dir.toUpperCase()),
    );

    const tokens = (query ?? '').trim().split(/\s+/).filter(Boolean);

    const conditions: Prisma.Sql[] = [Prisma.sql`deleted_at IS NULL`];

    for (const token of tokens) {
      const textPattern = `%${token}%`;
      const phoneDigits = token.replace(/\D/g, '');

      const tokenConditions: Prisma.Sql[] = [
        Prisma.sql`unaccent(nombre) ILIKE unaccent(${textPattern})`,
        Prisma.sql`unaccent(apellido) ILIKE unaccent(${textPattern})`,
        Prisma.sql`unaccent(coalesce(email, '')) ILIKE unaccent(${textPattern})`,
      ];

      if (phoneDigits.length > 0) {
        tokenConditions.push(
          Prisma.sql`celular_normalized LIKE ${'%' + phoneDigits + '%'}`,
        );
      }

      conditions.push(Prisma.sql`(${Prisma.join(tokenConditions, ' OR ')})`);
    }

    if (tipoPaciente) {
      conditions.push(Prisma.sql`tipo_paciente = ${tipoPaciente}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const idRows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM patients
      WHERE ${whereClause}
      ORDER BY ${orderBySql}
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    const totalRows = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM patients
      WHERE ${whereClause}
    `;
    const total = Number(totalRows[0]?.count ?? 0);

    const ids = idRows.map((r) => r.id);
    const unordered = ids.length
      ? await this.prisma.patient.findMany({ where: { id: { in: ids } } })
      : [];
    const byId = new Map(unordered.map((p) => [p.id, p]));
    const data = ids.map((id) => byId.get(id)).filter(Boolean);

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
