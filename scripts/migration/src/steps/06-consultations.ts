import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId, requireId, getId, generateUuid } from '../id-map';

/**
 * Step 06: Migrate medical consultations + pivot tables.
 *
 * MySQL fields: id, grosor, caspa, color, grasa, textura, valoracion_zona_donante,
 *   fecha_transplante, estrategia_quirurgica, diagnostico, comentarios,
 *   patient_id, user_id, timestamps
 *
 * Pivots:
 * - donor_zone_medical_consultation (medical_consultation_id, donor_zone_id)
 * - medical_consultation_variant (medical_consultation_id, variant_id)
 */
export async function runConsultations(): Promise<void> {
  const prisma = getPrisma();

  const mysqlConsultations = await query<{
    id: number;
    grosor: string | null;
    caspa: number | null;
    color: string | null;
    grasa: number | null;
    textura: string | null;
    valoracion_zona_donante: string | null;
    fecha_transplante: Date | null;
    estrategia_quirurgica: string | null;
    diagnostico: string | null;
    comentarios: string | null;
    patient_id: number;
    user_id: number | string;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM medical_consultations');

  let skipped = 0;

  for (const c of mysqlConsultations) {
    const uuid = mapId('medical_consultations', c.id);

    let patientId: string;
    let doctorId: string;
    try {
      patientId = requireId('patients', c.patient_id);
      doctorId = requireId('users', c.user_id);
    } catch {
      skipped++;
      continue;
    }

    // Normalize grosor (Fragil/Mediano/Grueso → lowercase)
    const grosor = c.grosor ? c.grosor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : null;
    const color = c.color ? c.color.toLowerCase() : null;
    const textura = c.textura ? c.textura.toLowerCase() : null;
    const valoracion = c.valoracion_zona_donante
      ? c.valoracion_zona_donante.toLowerCase()
      : null;

    // diagnostico might be stored as int in MySQL, convert to text
    const diagnostico = c.diagnostico !== null ? String(c.diagnostico) : null;
    const estrategia = c.estrategia_quirurgica !== null ? String(c.estrategia_quirurgica) : null;

    await prisma.medicalConsultation.create({
      data: {
        id: uuid,
        patientId,
        doctorId,
        grosor,
        caspa: c.caspa === 1 ? true : c.caspa === 0 ? false : null,
        color,
        grasa: c.grasa === 1 ? true : c.grasa === 0 ? false : null,
        textura,
        valoracionZonaDonante: valoracion,
        diagnostico,
        estrategiaQuirurgica: estrategia,
        fechaSugeridaTransplante: c.fecha_transplante || null,
        comentarios: c.comentarios || null,
        consultationDate: c.created_at, // Use created_at as consultation date
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
    });
  }

  console.log(`  Migrated ${mysqlConsultations.length - skipped} consultations (${skipped} skipped)`);

  // --- Pivot: donor_zone_medical_consultation ---
  const dzPivots = await query<{
    medical_consultation_id: number;
    donor_zone_id: number;
  }>('SELECT * FROM donor_zone_medical_consultation');

  let dzCount = 0;
  for (const pivot of dzPivots) {
    const consultationId = getId('medical_consultations', pivot.medical_consultation_id);
    const donorZoneId = getId('donor_zones', pivot.donor_zone_id);
    if (consultationId && donorZoneId) {
      await prisma.consultationDonorZone.create({
        data: {
          id: generateUuid('consultation_donor_zones', `${pivot.medical_consultation_id}-${pivot.donor_zone_id}`),
          consultationId,
          donorZoneId,
        },
      });
      dzCount++;
    }
  }
  console.log(`  Migrated ${dzCount} consultation-donor-zone links`);

  // --- Pivot: medical_consultation_variant ---
  const varPivots = await query<{
    medical_consultation_id: number;
    variant_id: number;
  }>('SELECT * FROM medical_consultation_variant');

  let varCount = 0;
  for (const pivot of varPivots) {
    const consultationId = getId('medical_consultations', pivot.medical_consultation_id);
    const variantId = getId('variants', pivot.variant_id);
    if (consultationId && variantId) {
      await prisma.consultationVariant.create({
        data: {
          id: generateUuid('consultation_variants', `${pivot.medical_consultation_id}-${pivot.variant_id}`),
          consultationId,
          variantId,
        },
      });
      varCount++;
    }
  }
  console.log(`  Migrated ${varCount} consultation-variant links`);
}
