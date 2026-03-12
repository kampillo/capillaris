import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId, requireId } from '../id-map';

/**
 * Step 09b: Migrate hairmedicines (non-surgical hair treatments).
 *
 * MySQL columns: id, name, date (datetime), duration (int), comments,
 *   patient_id, user_id, timestamps
 */
export async function runHairmedicines(): Promise<void> {
  const prisma = getPrisma();

  const mysqlHairmeds = await query<{
    id: number;
    name: string | null;
    date: Date | null;
    duration: number | null;
    comments: string | null;
    patient_id: number;
    user_id: number | string;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM hairmedicines');

  let skipped = 0;

  for (const h of mysqlHairmeds) {
    const uuid = mapId('hairmedicines', h.id);

    let patientId: string;
    let doctorId: string;
    try {
      patientId = requireId('patients', h.patient_id);
      doctorId = requireId('users', h.user_id);
    } catch {
      skipped++;
      continue;
    }

    await prisma.hairmedicine.create({
      data: {
        id: uuid,
        patientId,
        doctorId,
        fecha: h.date || h.created_at, // Fallback to created_at
        descripcion: h.name || null,
        comments: h.comments || null,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
      },
    });
  }

  console.log(`  Migrated ${mysqlHairmeds.length - skipped} hairmedicines (${skipped} skipped)`);
}
