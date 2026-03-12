import { getPrisma } from '../pg-target';
import { clearAllMaps } from '../id-map';
import { clearPhoneWarnings } from '../phone-normalizer';

/**
 * Step 00: TRUNCATE CASCADE all PG tables.
 * This ensures idempotent re-runs.
 */
export async function runClean(): Promise<void> {
  const prisma = getPrisma();

  // Order matters: truncate in reverse dependency order, or use CASCADE
  const tables = [
    'audit_log',
    'integration_sync_log',
    'reminders',
    'patient_images',
    'micropigmentation_hair_types',
    'micropigmentations',
    'hairmedicines',
    'procedure_report_hair_types',
    'procedure_report_doctors',
    'procedure_reports',
    'consultation_variants',
    'consultation_donor_zones',
    'medical_consultations',
    'physical_explorations',
    'previous_treatments',
    'non_pathological_personals',
    'inherit_relatives',
    'clinical_histories',
    'prescription_items',
    'prescriptions',
    'appointments',
    'stock_movements',
    'stock_balances',
    'products',
    'product_categories',
    'patients',
    'user_roles',
    'role_permissions',
    'users',
    'permissions',
    'roles',
    'donor_zones',
    'variants',
    'hair_types',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }

  // Clear in-memory state
  clearAllMaps();
  clearPhoneWarnings();

  console.log(`  Truncated ${tables.length} tables`);
}
