import { Decimal } from '@prisma/client/runtime/library';
import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId, requireId, getId, generateUuid } from '../id-map';

/**
 * Step 08: Migrate procedure reports.
 *
 * MySQL has 4 separate 1:1 tables that we flatten into PG procedure_reports:
 * - hair_follicles: cb1, cb2, cb3, cb4, total_foliculos
 * - tools: punch, implantador
 * - anesthesia_extractions: fecha_inicial_extraccion, fecha_final_extraccion, lidocaina, adrenalina, ...
 * - anesthesia_implantations: same structure for implantation
 *
 * Plus pivot tables:
 * - procedure_report_user → procedure_report_doctors
 * - hair_type_procedure_report → procedure_report_hair_types
 */
export async function runProcedures(): Promise<void> {
  const prisma = getPrisma();

  // Fetch all sub-tables
  const follicles = await query<{
    id: number; cb1: number | null; cb2: number | null;
    cb3: number | null; cb4: number | null; total_foliculos: number | null;
  }>('SELECT * FROM hair_follicles');
  const follicleMap = new Map(follicles.map(f => [f.id, f]));

  const tools = await query<{
    id: number; punch: string | null; implantador: string | null;
  }>('SELECT * FROM tools');
  const toolMap = new Map(tools.map(t => [t.id, t]));

  const anestExts = await query<{
    id: number;
    fecha_inicial_extraccion: Date | null;
    fecha_final_extraccion: Date | null;
    lidocaina: string | null;
    adrenalina: number | null;
    bicarbonato_de_sodio: number | null;
    solucion_fisiologica: number | null;
    anestesia_infiltrada: string | null;
    betametasona: string | null;
  }>('SELECT * FROM anesthesia_extractions');
  const anestExtMap = new Map(anestExts.map(a => [a.id, a]));

  const anestImps = await query<{
    id: number;
    fecha_inicial_implantacion: Date | null;
    fecha_final_implantacion: Date | null;
    lidocaina: string | null;
    adrenalina: number | null;
    bicarbonato_de_sodio: number | null;
    solucion_fisiologica: number | null;
    anestesia_infiltrada: string | null;
    betametasona: string | null;
  }>('SELECT * FROM anesthesia_implantations');
  const anestImpMap = new Map(anestImps.map(a => [a.id, a]));

  const procedures = await query<{
    id: number;
    fecha: Date | null;
    descripcion: string | null;
    patient_id: number;
    hair_follicle_id: number | null;
    tool_id: number | null;
    anesthesia_extraction_id: number | null;
    anesthesia_implantation_id: number | null;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM procedure_reports');

  let skipped = 0;

  for (const proc of procedures) {
    const uuid = mapId('procedure_reports', proc.id);

    let patientId: string;
    try {
      patientId = requireId('patients', proc.patient_id);
    } catch {
      skipped++;
      continue;
    }

    const hf = proc.hair_follicle_id ? follicleMap.get(proc.hair_follicle_id) : null;
    const tool = proc.tool_id ? toolMap.get(proc.tool_id) : null;
    const ae = proc.anesthesia_extraction_id ? anestExtMap.get(proc.anesthesia_extraction_id) : null;
    const ai = proc.anesthesia_implantation_id ? anestImpMap.get(proc.anesthesia_implantation_id) : null;

    const toDecimal = (v: number | string | null | undefined) => {
      if (v == null) return null;
      const n = parseFloat(String(v));
      return isNaN(n) ? null : new Decimal(n);
    };

    // MySQL TIME "HH:MM:SS" → DateTime using procedure date as base
    const baseDate = proc.fecha || proc.created_at;
    const timeToDatetime = (time: string | Date | null | undefined): Date | null => {
      if (!time) return null;
      const s = String(time);
      // If already a Date object or ISO string
      if (time instanceof Date) return time;
      // If it's a TIME string like "09:00:00"
      const match = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
      if (match) {
        const d = new Date(baseDate);
        d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), 0);
        return d;
      }
      // Try parsing as ISO
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    const toInt = (v: any): number | null => {
      if (v == null) return null;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };

    await prisma.procedureReport.create({
      data: {
        id: uuid,
        patientId,
        procedureDate: proc.fecha || proc.created_at,
        descripcion: proc.descripcion || null,

        // From tools
        punchSize: tool?.punch ? new Decimal(tool.punch) : null,
        implantador: tool?.implantador || null,

        // From hair_follicles
        cb1: toInt(hf?.cb1),
        cb2: toInt(hf?.cb2),
        cb3: toInt(hf?.cb3),
        cb4: toInt(hf?.cb4),
        totalFoliculos: toInt(hf?.total_foliculos),

        // From anesthesia_extractions
        anestExtFechaInicial: timeToDatetime(ae?.fecha_inicial_extraccion),
        anestExtFechaFinal: timeToDatetime(ae?.fecha_final_extraccion),
        anestExtLidocaina: ae?.lidocaina != null ? String(ae.lidocaina) : null,
        anestExtAdrenalina: toDecimal(ae?.adrenalina),
        anestExtBicarbonatoDeSodio: toDecimal(ae?.bicarbonato_de_sodio),
        anestExtSolucionFisiologica: toDecimal(ae?.solucion_fisiologica),
        anestExtAnestesiaInfiltrada: ae?.anestesia_infiltrada != null ? String(ae.anestesia_infiltrada) : null,
        anestExtBetametasona: ae?.betametasona != null ? String(ae.betametasona) : null,

        // From anesthesia_implantations
        anestImpFechaInicial: timeToDatetime(ai?.fecha_inicial_implantacion),
        anestImpFechaFinal: timeToDatetime(ai?.fecha_final_implantacion),
        anestImpLidocaina: ai?.lidocaina != null ? String(ai.lidocaina) : null,
        anestImpAdrenalina: toDecimal(ai?.adrenalina),
        anestImpBicarbonatoDeSodio: toDecimal(ai?.bicarbonato_de_sodio),
        anestImpSolucionFisiologica: toDecimal(ai?.solucion_fisiologica),
        anestImpAnestesiaInfiltrada: ai?.anestesia_infiltrada != null ? String(ai.anestesia_infiltrada) : null,
        anestImpBetametasona: ai?.betametasona != null ? String(ai.betametasona) : null,

        createdAt: proc.created_at,
        updatedAt: proc.updated_at,
      },
    });
  }

  console.log(`  Migrated ${procedures.length - skipped} procedure reports (${skipped} skipped)`);

  // --- Pivot: procedure_report_user → procedure_report_doctors ---
  const userPivots = await query<{
    procedure_report_id: number;
    user_id: number | string;
  }>('SELECT * FROM procedure_report_user');

  let doctorCount = 0;
  for (const pivot of userPivots) {
    const reportId = getId('procedure_reports', pivot.procedure_report_id);
    const doctorId = getId('users', pivot.user_id);
    if (reportId && doctorId) {
      await prisma.procedureReportDoctor.create({
        data: {
          id: generateUuid('procedure_report_doctors', `${pivot.procedure_report_id}-${pivot.user_id}`),
          procedureReportId: reportId,
          doctorId,
        },
      });
      doctorCount++;
    }
  }
  console.log(`  Migrated ${doctorCount} procedure-doctor links`);

  // --- Pivot: hair_type_procedure_report → procedure_report_hair_types ---
  const htPivots = await query<{
    procedure_report_id: number;
    hair_type_id: number;
  }>('SELECT * FROM hair_type_procedure_report');

  let htCount = 0;
  for (const pivot of htPivots) {
    const reportId = getId('procedure_reports', pivot.procedure_report_id);
    const hairTypeId = getId('hair_types', pivot.hair_type_id);
    if (reportId && hairTypeId) {
      await prisma.procedureReportHairType.create({
        data: {
          id: generateUuid('procedure_report_hair_types', `${pivot.procedure_report_id}-${pivot.hair_type_id}`),
          procedureReportId: reportId,
          hairTypeId,
        },
      });
      htCount++;
    }
  }
  console.log(`  Migrated ${htCount} procedure-hair-type links`);
}
