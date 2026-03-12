import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId, requireId, getId, generateUuid } from '../id-map';

/**
 * Step 09: Migrate micropigmentations + hair type pivots.
 *
 * MySQL columns: id, name, tono, date (datetime), duration (int), description,
 *   dilucion, patient_id, user_id, timestamps
 *
 * PG columns: fecha, duracion, dilucion, descripcion, comments, ...
 */
export async function runMicropigmentations(): Promise<void> {
  const prisma = getPrisma();

  const mysqlMicros = await query<{
    id: number;
    name: string | null;
    tono: string | null;
    date: Date | null;
    duration: number | null;
    description: string | null;
    dilucion: string | null;
    patient_id: number;
    user_id: number | string;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM micropigmentations');

  let skipped = 0;

  for (const m of mysqlMicros) {
    const uuid = mapId('micropigmentations', m.id);

    let patientId: string;
    let doctorId: string;
    try {
      patientId = requireId('patients', m.patient_id);
      doctorId = requireId('users', m.user_id);
    } catch {
      skipped++;
      continue;
    }

    // Build description from name + tono + description
    const descParts = [m.name, m.tono ? `Tono: ${m.tono}` : null, m.description].filter(Boolean);
    const descripcion = descParts.length > 0 ? descParts.join(' | ') : null;

    await prisma.micropigmentation.create({
      data: {
        id: uuid,
        patientId,
        doctorId,
        fecha: m.date || m.created_at, // Fallback to created_at if date is null
        duracion: m.duration ?? null,
        dilucion: m.dilucion || null,
        descripcion,
        comments: null,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      },
    });
  }

  console.log(`  Migrated ${mysqlMicros.length - skipped} micropigmentations (${skipped} skipped)`);

  // --- Pivot: hair_type_micropigmentation ---
  const htPivots = await query<{
    micropigmentation_id: number;
    hair_type_id: number;
  }>('SELECT * FROM hair_type_micropigmentation');

  let htCount = 0;
  for (const pivot of htPivots) {
    const microId = getId('micropigmentations', pivot.micropigmentation_id);
    const hairTypeId = getId('hair_types', pivot.hair_type_id);
    if (microId && hairTypeId) {
      await prisma.micropigmentationHairType.create({
        data: {
          id: generateUuid('micropigmentation_hair_types', `${pivot.micropigmentation_id}-${pivot.hair_type_id}`),
          micropigmentationId: microId,
          hairTypeId,
        },
      });
      htCount++;
    }
  }
  console.log(`  Migrated ${htCount} micropigmentation-hair-type links`);
}
