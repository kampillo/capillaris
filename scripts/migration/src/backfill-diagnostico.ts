import './config';
import { closeMysql, query } from './mysql-source';
import { closePrisma, getPrisma } from './pg-target';
import { generateUuid } from './id-map';

/**
 * One-time backfill: in the legacy system, `clinical_histories.padecimiento_actual`
 * was used as the diagnosis (a closed dropdown of alopecia types). The new schema
 * separates "motivo de consulta" (padecimientoActual) from "diagnostico", so for
 * every legacy-migrated history we move padecimientoActual → diagnostico.
 *
 * Idempotent: only updates rows where diagnostico IS NULL, so re-running is safe
 * and does not overwrite data edited after the first backfill.
 */
async function main() {
  const prisma = getPrisma();

  console.log('Reading legacy clinical_histories from MySQL...');
  const rows = await query<{ id: number; padecimiento_actual: string | null }>(
    "SELECT id, padecimiento_actual FROM clinical_histories WHERE padecimiento_actual IS NOT NULL AND padecimiento_actual != ''",
  );
  console.log(`  ${rows.length} legacy histories with padecimiento_actual to consider`);

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const row of rows) {
    const uuid = generateUuid('clinical_histories', row.id);

    // Only touch rows that:
    // 1. Exist in PG (i.e., were actually migrated)
    // 2. Still have padecimientoActual matching the legacy value (not edited since)
    // 3. Have diagnostico still NULL (not already backfilled or manually set)
    const result = await prisma.clinicalHistory.updateMany({
      where: {
        id: uuid,
        diagnostico: null,
        padecimientoActual: row.padecimiento_actual,
      },
      data: {
        diagnostico: row.padecimiento_actual,
        padecimientoActual: null,
      },
    });

    if (result.count === 1) {
      updated++;
    } else {
      // Either the record was deleted, already backfilled, or edited.
      const exists = await prisma.clinicalHistory.findUnique({
        where: { id: uuid },
        select: { id: true },
      });
      if (exists) {
        skipped++;
      } else {
        missing++;
      }
    }
  }

  console.log('');
  console.log('Backfill summary:');
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}  (already backfilled or padecimientoActual was edited)`);
  console.log(`  Missing:  ${missing}  (legacy record not found in PG — likely never migrated)`);
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeMysql();
    await closePrisma();
  });
