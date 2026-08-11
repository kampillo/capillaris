/**
 * Importa `micropigmentations` y `hairmedicines` al modelo `Treatment`.
 *
 * No borra nada: las tablas originales quedan intactas y cada tratamiento
 * importado guarda de dónde vino en (origen, origenId). Ese par es único, así
 * que correr el script dos veces no duplica — los que ya existen se saltan.
 *
 * El tipo de tratamiento venía como texto libre en `hairmedicines.descripcion`.
 * TEXTO_A_TIPOS traduce cada valor observado en producción a uno o varios
 * códigos del catálogo; el texto original se conserva en `descripcion` para no
 * perder el matiz de lo que se escribió.
 *
 *   npx tsx prisma/import-treatments.ts [--apply]
 *
 * Sin --apply sólo reporta lo que haría.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Los siete valores distintos que existen en producción, mapeados a códigos
 * del catálogo. Varios son combinados: "Dutasteride + mesoterapia" son dos
 * tratamientos aplicados en la misma sesión.
 */
const TEXTO_A_TIPOS: Record<string, string[]> = {
  'PRP ( prp mesoterapia, carboxiterapia)': ['PRP', 'MESO', 'CARBO'],
  'Plasma rico en plaquetas': ['PRP'],
  'Dutasteride + mesoterapia': ['DUT', 'MESO'],
  Mesoterapia: ['MESO'],
  Betametasona: ['BET'],
  'Bicalutamida+ mesoterapia': ['BICA', 'MESO'],
};

const norm = (s: string | null) => (s ?? '').trim();

async function main() {
  const apply = process.argv.includes('--apply');

  const tipos = await prisma.treatmentType.findMany();
  const tipoPorCode = new Map(tipos.map((t) => [t.code, t.id]));
  if (tipoPorCode.size === 0) {
    throw new Error('El catálogo treatment_types está vacío — corre el seed antes.');
  }

  const [micros, hairmeds, yaImportados] = await Promise.all([
    prisma.micropigmentation.findMany({ include: { hairTypes: true } }),
    prisma.hairmedicine.findMany(),
    prisma.treatment.findMany({
      where: { origen: { not: null } },
      select: { origen: true, origenId: true },
    }),
  ]);

  const existente = new Set(
    yaImportados.map((t) => `${t.origen}:${t.origenId}`),
  );

  const sinMapear = new Map<string, number>();
  const aCrear: {
    origen: string;
    origenId: string;
    patientId: string;
    realizadoPorId: string | null;
    fecha: Date;
    duracion: number | null;
    dilucion: string | null;
    descripcion: string | null;
    comentarios: string | null;
    tipoIds: string[];
    zonaIds: string[];
  }[] = [];

  for (const m of micros) {
    if (existente.has(`micropigmentation:${m.id}`)) continue;
    aCrear.push({
      origen: 'micropigmentation',
      origenId: m.id,
      patientId: m.patientId,
      realizadoPorId: m.doctorId,
      fecha: m.fecha,
      duracion: m.duracion,
      dilucion: m.dilucion,
      descripcion: norm(m.descripcion) || null,
      comentarios: norm(m.comments) || null,
      tipoIds: [tipoPorCode.get('MICRO')!],
      zonaIds: m.hairTypes.map((h) => h.hairTypeId),
    });
  }

  for (const h of hairmeds) {
    if (existente.has(`hairmedicine:${h.id}`)) continue;
    const texto = norm(h.descripcion);
    const codes = TEXTO_A_TIPOS[texto];

    if (texto && !codes) {
      sinMapear.set(texto, (sinMapear.get(texto) ?? 0) + 1);
    }

    aCrear.push({
      origen: 'hairmedicine',
      origenId: h.id,
      patientId: h.patientId,
      realizadoPorId: h.doctorId,
      fecha: h.fecha,
      duracion: null,
      dilucion: null,
      descripcion: texto || null,
      comentarios: norm(h.comments) || null,
      // Sin correspondencia en el catálogo se importa sin tipo antes que
      // adivinar: el texto original queda en descripcion y alguien puede
      // clasificarlo después.
      tipoIds: (codes ?? []).map((c) => tipoPorCode.get(c)!).filter(Boolean),
      zonaIds: [],
    });
  }

  const porTipo = new Map<string, number>();
  for (const t of aCrear) {
    for (const id of t.tipoIds) {
      const code = tipos.find((x) => x.id === id)!.code;
      porTipo.set(code, (porTipo.get(code) ?? 0) + 1);
    }
  }

  console.log(`micropigmentaciones en origen : ${micros.length}`);
  console.log(`hairmedicines en origen       : ${hairmeds.length}`);
  console.log(`ya importados (se saltan)     : ${existente.size}`);
  console.log(`a crear                       : ${aCrear.length}`);
  console.log(`  sin tipo asignado           : ${aCrear.filter((t) => t.tipoIds.length === 0).length}`);
  console.log(`  con zonas                   : ${aCrear.filter((t) => t.zonaIds.length > 0).length}`);
  console.log('\ntratamientos por tipo:');
  for (const [code, n] of [...porTipo].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code.padEnd(7)} ${n}`);
  }

  if (sinMapear.size > 0) {
    console.log('\ntextos sin correspondencia en el catálogo:');
    for (const [t, n] of sinMapear) console.log(`  ${n}x  ${t}`);
  }

  if (!apply) {
    console.log('\n(simulación — corre con --apply para escribir)');
    return;
  }

  let creados = 0;
  // En lotes para no abrir una transacción gigantesca.
  const LOTE = 200;
  for (let i = 0; i < aCrear.length; i += LOTE) {
    const lote = aCrear.slice(i, i + LOTE);
    await prisma.$transaction(
      lote.map((t) =>
        prisma.treatment.create({
          data: {
            patientId: t.patientId,
            realizadoPorId: t.realizadoPorId,
            fecha: t.fecha,
            duracion: t.duracion,
            dilucion: t.dilucion,
            descripcion: t.descripcion,
            comentarios: t.comentarios,
            origen: t.origen,
            origenId: t.origenId,
            tipos: { create: t.tipoIds.map((treatmentTypeId) => ({ treatmentTypeId })) },
            zonas: { create: t.zonaIds.map((hairTypeId) => ({ hairTypeId })) },
          },
        }),
      ),
    );
    creados += lote.length;
    process.stdout.write(`\r  creados ${creados}/${aCrear.length}`);
  }
  console.log(`\n\nlisto: ${creados} tratamientos importados`);

  const total = await prisma.treatment.count();
  console.log(`total en la tabla treatments: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
