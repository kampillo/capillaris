import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId, requireId, generateUuid } from '../id-map';

/**
 * Step 05: Migrate clinical histories + 4 sub-tables.
 *
 * MySQL structure:
 * - clinical_histories: personales_patologicos, padecimiento_actual, tratamiento,
 *   patient_id, inherit_relative_id, non_pathological_personal_id,
 *   physical_exploration_id, previous_treatment_id
 * - inherit_relatives: negados, hta, dm, ca, respiratorios, otros
 * - non_pathological_personals: tabaquismo, alcoholismo, alergias, act_fisica, otros
 * - previous_treatments: minoxidil, fue, finasteride, fuss, dutasteride, bicalutamida, negados, otros
 * - physical_explorations: fc, ta, fr, temperatura, peso, talla, description
 *
 * PG: Sub-tables reference clinicalHistoryId (inverted FK direction in Prisma).
 */
export async function runClinicalHistories(): Promise<void> {
  const prisma = getPrisma();

  // Fetch all related data from MySQL
  const histories = await query<{
    id: number;
    personales_patologicos: string | null;
    padecimiento_actual: string | null;
    tratamiento: string | null;
    patient_id: number;
    inherit_relative_id: number | null;
    non_pathological_personal_id: number | null;
    physical_exploration_id: number | null;
    previous_treatment_id: number | null;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM clinical_histories');

  const inheritRelatives = await query<{
    id: number;
    negados: number;
    hta: number;
    dm: number;
    ca: number;
    respiratorios: number;
    otros: string | null;
  }>('SELECT * FROM inherit_relatives');
  const irMap = new Map(inheritRelatives.map(ir => [ir.id, ir]));

  const nonPathPersonals = await query<{
    id: number;
    tabaquismo: number;
    alcoholismo: number;
    alergias: number;
    act_fisica: number;
    otros: string | null;
  }>('SELECT * FROM non_pathological_personals');
  const nppMap = new Map(nonPathPersonals.map(n => [n.id, n]));

  const prevTreatments = await query<{
    id: number;
    minoxidil: number;
    fue: number;
    finasteride: number;
    fuss: number;
    dutasteride: number;
    bicalutamida: number;
    negados: number;
    otros: string | null;
  }>('SELECT * FROM previous_treatments');
  const ptMap = new Map(prevTreatments.map(pt => [pt.id, pt]));

  const physExplorations = await query<{
    id: number;
    fc: number | null;
    ta: string | null;
    fr: number | null;
    temperatura: string | null;
    peso: string | null;
    talla: string | null;
    description: string | null;
  }>('SELECT * FROM physical_explorations');
  const peMap = new Map(physExplorations.map(pe => [pe.id, pe]));

  let skipped = 0;

  for (const h of histories) {
    const uuid = mapId('clinical_histories', h.id);

    let patientId: string;
    try {
      patientId = requireId('patients', h.patient_id);
    } catch {
      skipped++;
      continue;
    }

    await prisma.clinicalHistory.create({
      data: {
        id: uuid,
        patientId,
        personalesPatologicos: h.personales_patologicos || null,
        padecimientoActual: h.padecimiento_actual || null,
        tratamiento: h.tratamiento || null,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
      },
    });

    // InheritRelative
    if (h.inherit_relative_id) {
      const ir = irMap.get(h.inherit_relative_id);
      if (ir) {
        await prisma.inheritRelative.create({
          data: {
            id: generateUuid('inherit_relatives', ir.id),
            clinicalHistoryId: uuid,
            negados: ir.negados === 1,
            hta: ir.hta === 1,
            dm: ir.dm === 1,
            ca: ir.ca === 1,
            respiratorios: ir.respiratorios === 1,
            otros: ir.otros || null,
          },
        });
      }
    }

    // NonPathologicalPersonal
    if (h.non_pathological_personal_id) {
      const npp = nppMap.get(h.non_pathological_personal_id);
      if (npp) {
        await prisma.nonPathologicalPersonal.create({
          data: {
            id: generateUuid('non_pathological_personals', npp.id),
            clinicalHistoryId: uuid,
            tabaquismo: npp.tabaquismo === 1,
            alcoholismo: npp.alcoholismo === 1,
            alergias: npp.alergias === 1,
            actFisica: npp.act_fisica === 1,
            otros: npp.otros || null,
          },
        });
      }
    }

    // PreviousTreatment
    if (h.previous_treatment_id) {
      const pt = ptMap.get(h.previous_treatment_id);
      if (pt) {
        await prisma.previousTreatment.create({
          data: {
            id: generateUuid('previous_treatments', pt.id),
            clinicalHistoryId: uuid,
            minoxidil: pt.minoxidil === 1,
            fue: pt.fue === 1,
            finasteride: pt.finasteride === 1,
            fuss: pt.fuss === 1,
            dutasteride: pt.dutasteride === 1,
            bicalutamida: pt.bicalutamida === 1,
            negados: pt.negados === 1,
            otros: pt.otros || null,
          },
        });
      }
    }

    // PhysicalExploration
    if (h.physical_exploration_id) {
      const pe = peMap.get(h.physical_exploration_id);
      if (pe) {
        const parseIntSafe = (v: any): number | null => {
          if (v == null) return null;
          const n = parseInt(String(v), 10);
          return isNaN(n) ? null : n;
        };
        const parseFloatSafe = (v: any): number | null => {
          if (v == null) return null;
          const n = parseFloat(String(v));
          return isNaN(n) ? null : n;
        };

        await prisma.physicalExploration.create({
          data: {
            id: generateUuid('physical_explorations', pe.id),
            clinicalHistoryId: uuid,
            fc: parseIntSafe(pe.fc),
            ta: pe.ta || null,
            fr: parseIntSafe(pe.fr),
            temperatura: parseFloatSafe(pe.temperatura),
            peso: parseFloatSafe(pe.peso),
            talla: parseFloatSafe(pe.talla),
            description: pe.description || null,
          },
        });
      }
    }
  }

  console.log(`  Migrated ${histories.length - skipped} clinical histories (${skipped} skipped)`);
  console.log(`  Sub-tables: ${inheritRelatives.length} inherit_relatives, ${nonPathPersonals.length} non_path_personals, ${prevTreatments.length} prev_treatments, ${physExplorations.length} phys_explorations`);
}
