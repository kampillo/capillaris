import { query } from '../mysql-source';
import { getPrisma } from '../pg-target';

interface AuditResult {
  patientId: number;
  field: string;
  mysqlValue: string;
  pgValue: string;
  match: boolean;
}

/**
 * Spot-check 5 random patients: compare key fields between MySQL and PG.
 * Uses legacyId to match patients across databases.
 */
export async function runSampleAudit(): Promise<{ patients: number; checks: AuditResult[] }> {
  const prisma = getPrisma();

  // Get 5 random patients from MySQL
  const mysqlPatients = await query<{
    id: number;
    nombre: string;
    apellido: string;
    email: string | null;
    celular: string | null;
    edad: number | null;
  }>('SELECT id, nombre, apellido, email, celular, edad FROM patients ORDER BY RAND() LIMIT 5');

  const checks: AuditResult[] = [];

  for (const mp of mysqlPatients) {
    // Find PG patient via legacyId
    const pgPatient = await prisma.patient.findFirst({ where: { legacyId: mp.id } });

    if (!pgPatient) {
      checks.push({
        patientId: mp.id,
        field: 'existence',
        mysqlValue: 'exists',
        pgValue: 'NOT FOUND (legacyId lookup)',
        match: false,
      });
      continue;
    }

    // Compare fields
    const fieldsToCheck: { field: string; mysql: string; pg: string }[] = [
      { field: 'nombre', mysql: mp.nombre, pg: pgPatient.nombre },
      { field: 'apellido', mysql: mp.apellido, pg: pgPatient.apellido },
      { field: 'email', mysql: mp.email || '', pg: pgPatient.email || '' },
      { field: 'celular', mysql: mp.celular || '', pg: pgPatient.celular || '' },
      { field: 'legacyId', mysql: String(mp.id), pg: String(pgPatient.legacyId ?? '') },
    ];

    for (const fc of fieldsToCheck) {
      checks.push({
        patientId: mp.id,
        field: fc.field,
        mysqlValue: fc.mysql,
        pgValue: fc.pg,
        match: fc.mysql === fc.pg,
      });
    }

    // Check that related records exist
    const pgApptCount = await prisma.appointment.count({ where: { patientId: pgPatient.id } });
    const [mysqlApptCount] = await query<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM appointments WHERE patient_id = ?',
      [mp.id],
    );

    checks.push({
      patientId: mp.id,
      field: 'appointment_count',
      mysqlValue: String(mysqlApptCount.cnt),
      pgValue: String(pgApptCount),
      match: mysqlApptCount.cnt === pgApptCount,
    });
  }

  return { patients: mysqlPatients.length, checks };
}
