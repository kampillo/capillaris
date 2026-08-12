/**
 * Siembra sólo el catálogo `treatment_types`.
 *
 * Existe aparte del seed general a propósito: `seed.ts` también crea el
 * usuario admin por defecto y siembra donor_zones / hair_types / variants con
 * nombres de desarrollo que no corresponden a los de la clínica. Correrlo
 * contra producción ya contaminó esos catálogos una vez.
 *
 *   npx tsx prisma/seed-treatment-types.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Los nombres salen de lo que la clínica ya capturaba como texto libre en
// hairmedicines.descripcion, más los que pidió agregar en sus observaciones.
const TIPOS = [
  { code: 'PRP', name: 'PRP (plasma rico en plaquetas)', orden: 1 },
  { code: 'DUT', name: 'Dutasteride', orden: 2 },
  { code: 'BET', name: 'Betametasona', orden: 3 },
  { code: 'BICA', name: 'Bicalutamida', orden: 4 },
  { code: 'MESO', name: 'Mesoterapia', orden: 5 },
  { code: 'CARBO', name: 'Carboxiterapia', orden: 6 },
  { code: 'BIOEST', name: 'Bioestimulación', orden: 7 },
  { code: 'MICRO', name: 'Micropigmentación', orden: 8 },
  { code: 'MINOX', name: 'Minoxidil', orden: 9 },
  { code: 'OTRO', name: 'Otro', orden: 99 },
];

async function main() {
  for (const t of TIPOS) {
    await prisma.treatmentType.upsert({
      where: { code: t.code },
      update: { name: t.name, orden: t.orden },
      create: t,
    });
  }
  const total = await prisma.treatmentType.count();
  console.log(`${TIPOS.length} tipos sembrados — ${total} en el catálogo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
