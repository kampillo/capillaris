import { query } from '../mysql-source';
import { getPrisma } from '../pg-target';

interface CountResult {
  table: string;
  mysql: number;
  pg: number;
  diff: number;
  status: 'OK' | 'MISMATCH' | 'WARN';
}

const TABLE_MAPPINGS: { mysql: string; pg: string }[] = [
  { mysql: 'users', pg: 'users' },
  { mysql: 'patients', pg: 'patients' },
  { mysql: 'appointments', pg: 'appointments' },
  { mysql: 'prescriptions', pg: 'prescriptions' },
  { mysql: 'medicines_prescriptions', pg: 'prescription_items' },
  { mysql: 'medical_consultations', pg: 'medical_consultations' },
  { mysql: 'clinical_histories', pg: 'clinical_histories' },
  { mysql: 'inherit_relatives', pg: 'inherit_relatives' },
  { mysql: 'non_pathological_personals', pg: 'non_pathological_personals' },
  { mysql: 'previous_treatments', pg: 'previous_treatments' },
  { mysql: 'physical_explorations', pg: 'physical_explorations' },
  { mysql: 'procedure_reports', pg: 'procedure_reports' },
  { mysql: 'micropigmentations', pg: 'micropigmentations' },
  { mysql: 'hairmedicines', pg: 'hairmedicines' },
  { mysql: 'images_patient', pg: 'patient_images' },
  { mysql: 'donor_zones', pg: 'donor_zones' },
  { mysql: 'variants', pg: 'variants' },
  { mysql: 'hair_types', pg: 'hair_types' },
];

export async function runCountCheck(): Promise<CountResult[]> {
  const prisma = getPrisma();
  const results: CountResult[] = [];

  for (const mapping of TABLE_MAPPINGS) {
    try {
      const [mysqlCount] = await query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM \`${mapping.mysql}\``,
      );
      const pgCount = (await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM "${mapping.pg}"`,
      )) as { cnt: bigint }[];

      const mysqlN = mysqlCount.cnt;
      const pgN = Number(pgCount[0].cnt);
      const diff = pgN - mysqlN;

      // PG may have more if we added standard catalogs or MySQL has orphaned records
      const isCatalog = ['donor_zones', 'variants', 'hair_types'].includes(mapping.pg);
      const isSubTable = ['inherit_relatives', 'non_pathological_personals', 'previous_treatments', 'physical_explorations'].includes(mapping.pg);
      const status = diff === 0 ? 'OK' : (isCatalog && pgN > mysqlN) ? 'OK' : (isSubTable && pgN <= mysqlN) ? 'OK' : (pgN >= mysqlN ? 'WARN' : 'MISMATCH');

      results.push({ table: mapping.pg, mysql: mysqlN, pg: pgN, diff, status });
    } catch (err: any) {
      results.push({ table: mapping.pg, mysql: -1, pg: -1, diff: 0, status: 'MISMATCH' });
      console.warn(`  Warning: Could not count ${mapping.mysql} / ${mapping.pg}: ${err.message}`);
    }
  }

  return results;
}
