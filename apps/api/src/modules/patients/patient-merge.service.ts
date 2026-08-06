import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditWriterService } from '../../common/audit/audit-writer.service';
import { MergePatientsDto } from './dto/merge-patients.dto';

/**
 * Relaciones que cuelgan de un paciente. Al fusionar hay que reasignarlas
 * todas: si se olvida una, esos registros quedan colgando de un expediente
 * borrado y nadie los vuelve a ver.
 *
 * Cada entrada es un delegado de Prisma con columna `patientId`.
 */
const PATIENT_RELATIONS = [
  'appointment',
  'prescription',
  'medicalConsultation',
  'procedureReport',
  'clinicalHistory',
  'micropigmentation',
  'hairmedicine',
  'patientImage',
  'reminder',
] as const;

type PatientRelation = (typeof PATIENT_RELATIONS)[number];

/**
 * Los delegados de Prisma son nueve tipos distintos y su unión no se estrecha
 * sola. Todos comparten la columna `patientId`, que es lo único que la fusión
 * necesita tocar, así que se los ve por esa rendija.
 */
type PatientOwnedDelegate = {
  findMany: (args: {
    where: { patientId: string };
    select: { id: true };
  }) => Promise<{ id: string }[]>;
  updateMany: (args: {
    where: { patientId?: string; id?: { in: string[] } };
    data: { patientId: string };
  }) => Promise<{ count: number }>;
};

function asPatientOwned(delegate: unknown): PatientOwnedDelegate {
  return delegate as PatientOwnedDelegate;
}

/** Conteos por relación, tal como los pide `_count` de Prisma. */
const COUNT_SELECT = {
  appointments: true,
  medicalConsultations: true,
  procedureReports: true,
  prescriptions: true,
  clinicalHistories: true,
  patientImages: true,
  micropigmentations: true,
  hairmedicines: true,
  reminders: true,
} as const;

const PATIENT_SUMMARY_SELECT = {
  id: true,
  legacyId: true,
  nombre: true,
  apellido: true,
  email: true,
  celular: true,
  fechaNacimiento: true,
  genero: true,
  ciudad: true,
  estado: true,
  direccion: true,
  ocupacion: true,
  estadoCivil: true,
  tipoPaciente: true,
  origenCanal: true,
  referidoPor: true,
  notasInternas: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: COUNT_SELECT },
} as const;

/**
 * Celulares de relleno que el sistema viejo aceptaba. Sirven para decidir
 * cuál de dos expedientes es el descuidado.
 */
function esCelularDeRelleno(celular: string | null): boolean {
  if (!celular) return true;
  const digits = celular.replace(/\D/g, '');
  if (digits.length < 8) return true;
  return /^0+$/.test(digits);
}

@Injectable()
export class PatientMergeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  /**
   * Agrupa pacientes activos por nombre completo normalizado.
   *
   * La normalización va en SQL con `unaccent` (la misma extensión que usa la
   * búsqueda) para no traer toda la tabla a memoria.
   */
  async findDuplicates() {
    const rows = await this.prisma.$queryRaw<{ key: string; ids: string[] }[]>(
      Prisma.sql`
        WITH normalized AS (
          SELECT
            id,
            upper(
              unaccent(
                regexp_replace(trim(nombre || ' ' || apellido), '\\s+', ' ', 'g')
              )
            ) AS key
          FROM patients
          WHERE deleted_at IS NULL
        )
        SELECT key, array_agg(id::text) AS ids
        FROM normalized
        GROUP BY key
        HAVING count(*) > 1
      `,
    );

    if (rows.length === 0) return [];

    const allIds = rows.flatMap((r) => r.ids);
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: allIds } },
      select: PATIENT_SUMMARY_SELECT,
    });
    const byId = new Map(patients.map((p) => [p.id, p]));

    const groups = rows.map((row) => {
      const miembros = row.ids
        .map((id) => byId.get(id))
        .filter((p): p is (typeof patients)[number] => !!p)
        .map((p) => ({ ...p, totalRegistros: sumCounts(p._count) }));

      return {
        key: row.key,
        clasificacion: clasificar(miembros),
        conflictos: detectarConflictos(miembros),
        sugeridoConservarId: sugerirSobreviviente(miembros).id,
        pacientes: miembros.sort((a, b) => b.totalRegistros - a.totalRegistros),
      };
    });

    // Primero lo más riesgoso: los que perderían datos si alguien los borra.
    const orden = { fusion_obligatoria: 0, borrado_seguro: 1, ambos_vacios: 2 };
    return groups.sort(
      (a, b) =>
        orden[a.clasificacion] - orden[b.clasificacion] ||
        a.key.localeCompare(b.key),
    );
  }

  /**
   * Fusiona `absorbedId` dentro de `survivorId`.
   *
   * Todo ocurre en una transacción: o se mueven las nueve relaciones y se
   * marca el absorbido, o no pasa nada. El absorbido no se borra de verdad —
   * queda con `deletedAt` y apuntando al sobreviviente, que es lo que permite
   * deshacer la fusión después.
   */
  async merge(survivorId: string, dto: MergePatientsDto, userId?: string) {
    const { absorbedId, campos } = dto;

    if (survivorId === absorbedId) {
      throw new BadRequestException(
        'No se puede fusionar un expediente consigo mismo',
      );
    }

    const [survivor, absorbed] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: survivorId } }),
      this.prisma.patient.findUnique({ where: { id: absorbedId } }),
    ]);

    if (!survivor || survivor.deletedAt) {
      throw new NotFoundException(
        `El expediente a conservar (${survivorId}) no existe o está borrado`,
      );
    }
    if (!absorbed || absorbed.deletedAt) {
      throw new NotFoundException(
        `El expediente a absorber (${absorbedId}) no existe o ya fue borrado`,
      );
    }
    if (survivor.mergedIntoId) {
      throw new BadRequestException(
        'El expediente a conservar ya fue fusionado dentro de otro',
      );
    }

    const movidos = await this.prisma.$transaction(async (tx) => {
      const idsPorRelacion: Record<string, string[]> = {};

      for (const relation of PATIENT_RELATIONS) {
        const delegate = asPatientOwned(tx[relation]);

        // Se anotan los ids antes de moverlos: son los que hay que devolver
        // si alguien deshace la fusión.
        const registros = await delegate.findMany({
          where: { patientId: absorbedId },
          select: { id: true },
        });
        if (registros.length === 0) continue;

        idsPorRelacion[relation] = registros.map((r) => r.id);
        await delegate.updateMany({
          where: { patientId: absorbedId },
          data: { patientId: survivorId },
        });
      }

      // Campos resueltos por quien revisó (correo, celular, fecha de
      // nacimiento...). Sólo se tocan los que vengan explícitos.
      if (campos && Object.keys(campos).length > 0) {
        await tx.patient.update({
          where: { id: survivorId },
          data: { ...campos, updatedBy: userId ?? undefined },
        });
      }

      await tx.patient.update({
        where: { id: absorbedId },
        data: {
          deletedAt: new Date(),
          mergedIntoId: survivorId,
          mergedAt: new Date(),
          mergedRecordIds: idsPorRelacion,
          updatedBy: userId ?? undefined,
        },
      });

      return idsPorRelacion;
    });

    await this.audit.write({
      action: 'MERGE',
      entityType: 'Patient',
      entityId: survivorId,
      oldValues: {
        absorbido: {
          id: absorbed.id,
          legacyId: absorbed.legacyId,
          nombre: `${absorbed.nombre} ${absorbed.apellido}`,
          email: absorbed.email,
          celular: absorbed.celular,
        },
      },
      newValues: {
        conservado: {
          id: survivor.id,
          legacyId: survivor.legacyId,
          nombre: `${survivor.nombre} ${survivor.apellido}`,
        },
        registrosMovidos: movidos,
        camposAplicados: campos ?? {},
      },
    });

    return this.prisma.patient.findUnique({
      where: { id: survivorId },
      select: PATIENT_SUMMARY_SELECT,
    });
  }

  /** Deshace una fusión: devuelve los registros y reactiva el absorbido. */
  async unmerge(absorbedId: string, userId?: string) {
    const absorbed = await this.prisma.patient.findUnique({
      where: { id: absorbedId },
    });

    if (!absorbed) {
      throw new NotFoundException(`Paciente ${absorbedId} no encontrado`);
    }
    if (!absorbed.mergedIntoId) {
      throw new BadRequestException(
        'Ese expediente no proviene de una fusión, no hay nada que deshacer',
      );
    }

    const survivorId = absorbed.mergedIntoId;

    // Se devuelven exactamente los registros que la fusión movió. Filtrar por
    // fecha no sirve: arrastraría también los que ya eran del expediente
    // conservado y lo dejaría vacío.
    const idsPorRelacion = (absorbed.mergedRecordIds ?? {}) as Record<
      string,
      string[]
    >;

    const devueltos = await this.prisma.$transaction(async (tx) => {
      const conteos: Record<string, number> = {};

      for (const relation of PATIENT_RELATIONS) {
        const ids = idsPorRelacion[relation];
        if (!ids?.length) continue;

        const delegate = asPatientOwned(tx[relation]);
        const { count } = await delegate.updateMany({
          // El filtro por patientId evita devolver un registro que alguien
          // haya reasignado a mano a otro expediente después de la fusión.
          where: { id: { in: ids }, patientId: survivorId },
          data: { patientId: absorbedId },
        });
        if (count > 0) conteos[relation] = count;
      }

      await tx.patient.update({
        where: { id: absorbedId },
        data: {
          deletedAt: null,
          mergedIntoId: null,
          mergedAt: null,
          mergedRecordIds: Prisma.DbNull,
          updatedBy: userId ?? undefined,
        },
      });

      return conteos;
    });

    await this.audit.write({
      action: 'UNMERGE',
      entityType: 'Patient',
      entityId: absorbedId,
      newValues: { separadoDe: survivorId, registrosDevueltos: devueltos },
    });

    return { ok: true, registrosDevueltos: devueltos };
  }
}

type Miembro = {
  celular: string | null;
  email: string | null;
  fechaNacimiento: Date | null;
  tipoPaciente: string;
  updatedAt: Date;
  totalRegistros: number;
  id: string;
};

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function clasificar(
  miembros: Miembro[],
): 'fusion_obligatoria' | 'borrado_seguro' | 'ambos_vacios' {
  const conDatos = miembros.filter((m) => m.totalRegistros > 0).length;
  if (conDatos === 0) return 'ambos_vacios';
  if (conDatos === 1) return 'borrado_seguro';
  return 'fusion_obligatoria';
}

/**
 * Gana el que tiene más registros clínicos; si empatan, el que tiene celular
 * real; si siguen empatados, el editado más recientemente.
 */
function sugerirSobreviviente(miembros: Miembro[]): Miembro {
  return [...miembros].sort(
    (a, b) =>
      b.totalRegistros - a.totalRegistros ||
      Number(esCelularDeRelleno(a.celular)) -
        Number(esCelularDeRelleno(b.celular)) ||
      b.updatedAt.getTime() - a.updatedAt.getTime(),
  )[0];
}

/** Diferencias que una persona tiene que resolver antes de fusionar. */
function detectarConflictos(miembros: Miembro[]): string[] {
  const out: string[] = [];

  const nacimientos = new Set(
    miembros
      .map((m) => m.fechaNacimiento?.toISOString().slice(0, 10))
      .filter(Boolean),
  );
  if (nacimientos.size > 1) {
    out.push(`Fechas de nacimiento distintas: ${[...nacimientos].join(' vs ')}`);
  }

  const correos = new Set(
    miembros.map((m) => m.email?.toLowerCase()).filter(Boolean),
  );
  if (correos.size > 1) out.push('Dos correos distintos');

  const celulares = new Set(
    miembros.map((m) => m.celular).filter((c) => !esCelularDeRelleno(c)),
  );
  if (celulares.size > 1) out.push('Dos celulares reales');

  const tipos = new Set(miembros.map((m) => m.tipoPaciente));
  if (tipos.size > 1) out.push(`Tipos distintos: ${[...tipos].join(' vs ')}`);

  return out;
}
