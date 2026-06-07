import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Standalone, idempotent seed for the operating rooms catalog (quirófanos).
// Safe to run against any environment — it only upserts catalog rows and
// never touches users/credentials (unlike the full prisma/seed.ts).
async function main() {
  const operatingRooms = ['Quirófano 1', 'Quirófano 2'];
  for (const name of operatingRooms) {
    await prisma.operatingRoom.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${operatingRooms.length} operating rooms`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
