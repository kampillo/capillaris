import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId } from '../id-map';
import { normalizePhone, getPhoneWarnings } from '../phone-normalizer';
import { CURRENT_YEAR } from '../config';

/**
 * Step 03: Migrate patients.
 *
 * Key transformations:
 * - edad (INT) → fechaNacimiento (Date) = Jan 1, currentYear - edad, edadApproximada = true
 * - tipo_paciente (INT 0-3) → string enum
 * - genero (1/2/3 or string) → normalized string
 * - phone normalization to +52XXXXXXXXXX
 * - Set legacyId for cross-reference
 */

const TIPO_PACIENTE_MAP: Record<number, string> = {
  0: 'lead',
  1: 'registered',
  2: 'evaluation',
  3: 'active',
};

function mapGender(raw: string | number | null): string | null {
  if (raw === null || raw === '' || raw === undefined) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === '1' || s === 'hombre' || s === 'masculino') return 'hombre';
  if (s === '2' || s === 'mujer' || s === 'femenino') return 'mujer';
  if (s === '3' || s === 'otro') return 'otro';
  return s;
}

function edadToFechaNacimiento(edad: number | null): { fecha: Date | null; approximada: boolean } {
  if (edad === null || edad === undefined || edad <= 0 || edad > 120) {
    return { fecha: null, approximada: false };
  }
  const year = CURRENT_YEAR - edad;
  return { fecha: new Date(`${year}-01-01`), approximada: true };
}

export async function runPatients(): Promise<void> {
  const prisma = getPrisma();

  const mysqlPatients = await query<{
    id: number;
    nombre: string;
    apellido: string;
    email: string | null;
    celular: string | null;
    direccion: string | null;
    edad: number | null;
    genero: string | number | null;
    estado_civil: string | null;
    ocupacion: string | null;
    tipo_paciente: number | null;
    clinical_history_id: number | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }>('SELECT * FROM patients');

  let phoneWarningCount = 0;

  for (const p of mysqlPatients) {
    const uuid = mapId('patients', p.id);
    const { fecha, approximada } = edadToFechaNacimiento(p.edad);
    const phoneResult = normalizePhone(p.celular);
    if (phoneResult.warning) phoneWarningCount++;

    const tipoPaciente = TIPO_PACIENTE_MAP[p.tipo_paciente ?? 0] || 'lead';
    const genero = mapGender(p.genero);

    await prisma.patient.create({
      data: {
        id: uuid,
        nombre: p.nombre,
        apellido: p.apellido,
        email: p.email || null,
        celular: p.celular || null,
        celularNormalized: phoneResult.normalized,
        direccion: p.direccion || null,
        fechaNacimiento: fecha,
        edadApproximada: approximada,
        genero,
        estadoCivil: p.estado_civil || null,
        ocupacion: p.ocupacion || null,
        tipoPaciente: tipoPaciente,
        pais: 'Mexico',
        legacyId: p.id,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        deletedAt: p.deleted_at || null,
      },
    });
  }

  const phoneWarnings = getPhoneWarnings();
  console.log(`  Migrated ${mysqlPatients.length} patients`);
  if (phoneWarningCount > 0) {
    console.log(`  Phone normalization warnings: ${phoneWarningCount}`);
    for (const w of phoneWarnings.slice(0, 5)) {
      console.log(`    - ${w}`);
    }
    if (phoneWarnings.length > 5) {
      console.log(`    ... and ${phoneWarnings.length - 5} more`);
    }
  }
}
