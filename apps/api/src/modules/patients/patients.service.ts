import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import {
  SearchPatientsDto,
  PatientSortField,
} from './dto/search-patients.dto';

import { patientValues } from './patient-values';
import { createWorkbook } from '../../common/exports/xlsx';

type SortOrder = 'asc' | 'desc';
const PATIENT_LIST_SELECT = { id: true, nombre: true, apellido: true, email: true, celular: true, fechaNacimiento: true, edadApproximada: true, tipoPaciente: true, origenCanal: true, ciudad: true, estado: true, pais: true, createdAt: true, updatedAt: true } as const;

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
  const field: PatientSortField = sortBy && sortBy in SORT_RAW_SQL ? sortBy : 'createdAt';
  const dir: SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  return { field, dir };
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPatientDto: CreatePatientDto, userId?: string) {
    return this.prisma.patient.create({
      data: {
        ...patientValues(createPatientDto),
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
    const p = Number(page ?? 1);
    const ps = Number(pageSize ?? 20);
    if (!Number.isInteger(p) || p < 1 || !Number.isInteger(ps) || ps < 1 || ps > 200) throw new BadRequestException('Paginación inválida');
    const skip = (p - 1) * ps;
    const { field, dir } = resolveSort(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where: { deletedAt: null },
        skip,
        take: ps,
        select: PATIENT_LIST_SELECT,
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

  async findOneForRoles(id: string, roles: string[]) {
    if (roles.some(role => ['admin', 'doctor', 'receptionist'].includes(role))) return this.findOne(id);
    const patient = await this.prisma.patient.findFirst({ where: { id, deletedAt: null }, select: { id: true, nombre: true, apellido: true, email: true, celular: true } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return patient;
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        _count: { select: { appointments: true, prescriptions: true, medicalConsultations: true, procedureReports: true } },
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

    const sessions = await this.prisma.procedureReport.groupBy({
      by: ['sessionGroupId'],
      where: { patientId: id },
      _count: { _all: true },
    });
    // Each ungrouped report is a procedure; a multi-day group counts once.
    const procedureCount = sessions.reduce(
      (total, session) => total + (session.sessionGroupId === null ? session._count._all : 1),
      0,
    );

    return { ...patient, procedureCount };
  }

  private searchWhere(searchDto: SearchPatientsDto): Prisma.Sql {
    const tokens = (searchDto.query ?? '').trim().split(/\s+/).filter(Boolean);

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

    if (searchDto.tipoPaciente) {
      conditions.push(Prisma.sql`tipo_paciente = ${searchDto.tipoPaciente}`);
    }

    return Prisma.join(conditions, ' AND ');

  }

  async exportPatients(searchDto: SearchPatientsDto) {
    const where = this.searchWhere(searchDto);
    const exportedAt = new Date().toISOString();
    const patients = await this.prisma.$transaction(async tx => {
      const totals = await tx.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM patients WHERE ${where}`;
      if (Number(totals[0]?.count ?? 0) > 20000) throw new BadRequestException('La exportación supera 20000 pacientes; aplica un filtro');
      const ids = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM patients WHERE ${where} ORDER BY nombre ASC, apellido ASC, id ASC`;
      return tx.patient.findMany({ where: { id: { in: ids.map(row => row.id) } }, orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }, { id: 'asc' }], select: {
        id: true, legacyId: true, nombre: true, apellido: true, email: true, celular: true, celularNormalized: true,
        fechaNacimiento: true, edadApproximada: true, tipoPaciente: true, origenCanal: true, ciudad: true, estado: true,
        pais: true, createdAt: true, updatedAt: true,
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    const columns = ['ID sistema', 'ID histórico', 'Nombre', 'Apellido', 'Email', 'Teléfono original', 'Teléfono normalizado', 'Fecha nacimiento', 'Calidad fecha', 'Tipo', 'Origen', 'Ciudad', 'Estado', 'País', 'Creado UTC', 'Actualizado UTC'];
    const rows = patients.map(p => [p.id, p.legacyId?.toString() ?? '', p.nombre, p.apellido, p.email, p.celular, p.celularNormalized,
      p.fechaNacimiento?.toISOString().slice(0, 10), !p.fechaNacimiento ? 'Sin registrar' : p.edadApproximada ? 'Aproximada' : 'Confirmada', p.tipoPaciente, p.origenCanal,
      p.ciudad, p.estado, p.pais, p.createdAt.toISOString(), p.updatedAt.toISOString()]);
    return createWorkbook([
      { name: 'Conciliación', rows: [['Exportado UTC', exportedAt], ['Pacientes incluidos', patients.length], ['Búsqueda', searchDto.query ?? ''], ['Tipo', searchDto.tipoPaciente ?? 'Todos'], ['Alcance', 'Todos los resultados del filtro; excluye expedientes eliminados o absorbidos. Sin notas clínicas.'], ['Identidad', 'Los ID conservan su origen. Esta exportación no fusiona registros ni presupone igualdad con el CRM.']] },
      { name: 'Pacientes', rows: [columns, ...rows], autoFilter: true },
    ]);
  }

  async search(searchDto: SearchPatientsDto) {
    const {
      page = 1,
      pageSize = 20,
      sortBy,
      sortOrder,
    } = searchDto;
    const skip = (page - 1) * pageSize;
    const { field, dir } = resolveSort(sortBy, sortOrder);
    const orderBySql = Prisma.raw(
      SORT_RAW_SQL[field].replaceAll('{{dir}}', dir.toUpperCase()) + ', id ASC',
    );

    const whereClause = this.searchWhere(searchDto);

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
      ? await this.prisma.patient.findMany({ where: { id: { in: ids } }, select: PATIENT_LIST_SELECT })
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
        ...patientValues(updatePatientDto),
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
