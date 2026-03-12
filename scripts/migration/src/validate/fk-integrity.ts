import { getPrisma } from '../pg-target';

interface FkResult {
  check: string;
  orphans: number;
  status: 'OK' | 'FAIL';
}

const FK_CHECKS = [
  {
    name: 'appointments → patients',
    sql: `SELECT COUNT(*) as cnt FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id WHERE p.id IS NULL`,
  },
  {
    name: 'appointments → users (doctor)',
    sql: `SELECT COUNT(*) as cnt FROM appointments a LEFT JOIN users u ON a.doctor_id = u.id WHERE u.id IS NULL`,
  },
  {
    name: 'prescriptions → patients',
    sql: `SELECT COUNT(*) as cnt FROM prescriptions p LEFT JOIN patients pt ON p.patient_id = pt.id WHERE pt.id IS NULL`,
  },
  {
    name: 'prescriptions → users (doctor)',
    sql: `SELECT COUNT(*) as cnt FROM prescriptions p LEFT JOIN users u ON p.doctor_id = u.id WHERE u.id IS NULL`,
  },
  {
    name: 'prescription_items → prescriptions',
    sql: `SELECT COUNT(*) as cnt FROM prescription_items pi LEFT JOIN prescriptions p ON pi.prescription_id = p.id WHERE p.id IS NULL`,
  },
  {
    name: 'medical_consultations → patients',
    sql: `SELECT COUNT(*) as cnt FROM medical_consultations mc LEFT JOIN patients p ON mc.patient_id = p.id WHERE p.id IS NULL`,
  },
  {
    name: 'medical_consultations → users (doctor)',
    sql: `SELECT COUNT(*) as cnt FROM medical_consultations mc LEFT JOIN users u ON mc.doctor_id = u.id WHERE u.id IS NULL`,
  },
  {
    name: 'clinical_histories → patients',
    sql: `SELECT COUNT(*) as cnt FROM clinical_histories ch LEFT JOIN patients p ON ch.patient_id = p.id WHERE p.id IS NULL`,
  },
  {
    name: 'procedure_reports → patients',
    sql: `SELECT COUNT(*) as cnt FROM procedure_reports pr LEFT JOIN patients p ON pr.patient_id = p.id WHERE p.id IS NULL`,
  },
  {
    name: 'micropigmentations → patients',
    sql: `SELECT COUNT(*) as cnt FROM micropigmentations m LEFT JOIN patients p ON m.patient_id = p.id WHERE p.id IS NULL`,
  },
  {
    name: 'micropigmentations → users (doctor)',
    sql: `SELECT COUNT(*) as cnt FROM micropigmentations m LEFT JOIN users u ON m.doctor_id = u.id WHERE u.id IS NULL`,
  },
  {
    name: 'hairmedicines → patients',
    sql: `SELECT COUNT(*) as cnt FROM hairmedicines h LEFT JOIN patients p ON h.patient_id = p.id WHERE p.id IS NULL`,
  },
  {
    name: 'patient_images → patients',
    sql: `SELECT COUNT(*) as cnt FROM patient_images pi LEFT JOIN patients p ON pi.patient_id = p.id WHERE p.id IS NULL`,
  },
  {
    name: 'user_roles → users',
    sql: `SELECT COUNT(*) as cnt FROM user_roles ur LEFT JOIN users u ON ur.user_id = u.id WHERE u.id IS NULL`,
  },
  {
    name: 'user_roles → roles',
    sql: `SELECT COUNT(*) as cnt FROM user_roles ur LEFT JOIN roles r ON ur.role_id = r.id WHERE r.id IS NULL`,
  },
];

export async function runFkIntegrity(): Promise<FkResult[]> {
  const prisma = getPrisma();
  const results: FkResult[] = [];

  for (const check of FK_CHECKS) {
    try {
      const rows = (await prisma.$queryRawUnsafe(check.sql)) as { cnt: bigint }[];
      const orphans = Number(rows[0].cnt);
      results.push({
        check: check.name,
        orphans,
        status: orphans === 0 ? 'OK' : 'FAIL',
      });
    } catch (err: any) {
      results.push({ check: check.name, orphans: -1, status: 'FAIL' });
      console.warn(`  Warning: FK check failed for "${check.name}": ${err.message}`);
    }
  }

  return results;
}
