import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId, requireId, generateUuid } from '../id-map';

/**
 * Step 07: Migrate prescriptions.
 *
 * MySQL:
 * - prescriptions: id, name, description, prescription_date, user_id, patient_id, timestamps
 * - medicines: id, name, timestamps
 * - medicines_prescriptions (pivot): medicine_id, prescription_id
 *
 * PG:
 * - prescriptions: id, patientId, doctorId, prescriptionDate, notas, status
 * - prescription_items: id, prescriptionId, medicineName, ...
 */
export async function runPrescriptions(): Promise<void> {
  const prisma = getPrisma();

  // Fetch medicines catalog for name lookup (may be empty in legacy DB)
  const medicines = await query<{ id: number; name: string }>(
    'SELECT id, name FROM medicines',
  );
  const medicineMap = new Map(medicines.map(m => [m.id, m.name]));
  if (medicines.length === 0) {
    console.log('  Note: medicines table is empty in MySQL');
  }

  const mysqlPrescriptions = await query<{
    id: number;
    name: string | null;
    description: string | null;
    prescription_date: Date;
    user_id: number | string;
    patient_id: number;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM prescriptions');

  let skipped = 0;

  for (const p of mysqlPrescriptions) {
    const uuid = mapId('prescriptions', p.id);

    let patientId: string;
    let doctorId: string;
    try {
      patientId = requireId('patients', p.patient_id);
      doctorId = requireId('users', p.user_id);
    } catch {
      skipped++;
      continue;
    }

    await prisma.prescription.create({
      data: {
        id: uuid,
        patientId,
        doctorId,
        prescriptionDate: p.prescription_date,
        notas: p.description || null,
        status: 'completed', // Legacy prescriptions are considered completed
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      },
    });
  }

  console.log(`  Migrated ${mysqlPrescriptions.length - skipped} prescriptions (${skipped} skipped)`);

  // --- Pivot: medicines_prescriptions → prescription_items ---
  const pivots = await query<{
    medicine_id: number;
    prescription_id: number;
  }>('SELECT * FROM medicines_prescriptions');

  let itemCount = 0;
  for (const pivot of pivots) {
    const prescriptionId = mapId('prescription_items', `${pivot.prescription_id}-${pivot.medicine_id}`);
    const prescriptionUuid = requireId('prescriptions', pivot.prescription_id);
    const medicineName = medicineMap.get(pivot.medicine_id) || `Medicine #${pivot.medicine_id}`;

    await prisma.prescriptionItem.create({
      data: {
        id: generateUuid('prescription_items_record', `${pivot.prescription_id}-${pivot.medicine_id}`),
        prescriptionId: prescriptionUuid,
        medicineName,
        quantity: 1,
      },
    });
    itemCount++;
  }

  console.log(`  Migrated ${itemCount} prescription items from ${medicines.length} medicines`);
}
