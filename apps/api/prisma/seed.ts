import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', displayName: 'Administrador', description: 'Acceso total al sistema' },
    }),
    prisma.role.upsert({
      where: { name: 'doctor' },
      update: {},
      create: { name: 'doctor', displayName: 'Doctor', description: 'Acceso a expedientes médicos y procedimientos' },
    }),
    prisma.role.upsert({
      where: { name: 'receptionist' },
      update: {},
      create: { name: 'receptionist', displayName: 'Recepción', description: 'Registro de pacientes y citas' },
    }),
    prisma.role.upsert({
      where: { name: 'inventory_manager' },
      update: {},
      create: { name: 'inventory_manager', displayName: 'Inventario', description: 'Gestión de productos y stock' },
    }),
  ]);

  console.log(`Created ${roles.length} roles`);

  // 2. Create permissions
  const modules = [
    'patients', 'appointments', 'prescriptions', 'medical_consultations',
    'procedures', 'clinical_histories', 'micropigmentations', 'hairmedicines',
    'products', 'inventory', 'images', 'reports', 'reminders', 'users', 'settings',
  ];
  const actions = ['create', 'read', 'update', 'delete'];

  const permissions = [];
  for (const mod of modules) {
    for (const action of actions) {
      const perm = await prisma.permission.upsert({
        where: { name: `${mod}:${action}` },
        update: {},
        create: {
          name: `${mod}:${action}`,
          displayName: `${action} ${mod}`,
          module: mod,
        },
      });
      permissions.push(perm);
    }
  }

  console.log(`Created ${permissions.length} permissions`);

  // 3. Assign all permissions to admin role
  const adminRole = roles.find((r) => r.name === 'admin')!;
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // 4. Assign medical permissions to doctor role
  const doctorRole = roles.find((r) => r.name === 'doctor')!;
  const doctorModules = [
    'patients', 'appointments', 'prescriptions', 'medical_consultations',
    'procedures', 'clinical_histories', 'micropigmentations', 'hairmedicines',
    'images', 'reports',
  ];
  for (const perm of permissions.filter((p) => doctorModules.some((m) => p.name.startsWith(m)))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: doctorRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: doctorRole.id, permissionId: perm.id },
    });
  }

  // 5. Assign receptionist permissions
  const receptionistRole = roles.find((r) => r.name === 'receptionist')!;
  const receptionistModules = ['patients', 'appointments', 'images'];
  const receptionistPerms = permissions.filter((p) => receptionistModules.some((m) => p.name.startsWith(m)));
  for (const perm of receptionistPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: receptionistRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: receptionistRole.id, permissionId: perm.id },
    });
  }

  // 6. Assign inventory_manager permissions
  const inventoryRole = roles.find((r) => r.name === 'inventory_manager')!;
  const inventoryModules = ['products', 'inventory'];
  for (const perm of permissions.filter((p) => inventoryModules.some((m) => p.name.startsWith(m)))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: inventoryRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: inventoryRole.id, permissionId: perm.id },
    });
  }

  console.log('Assigned permissions to roles');

  // 7. Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@capillaris.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Capillaris',
      email: 'admin@capillaris.com',
      passwordHash,
      isActive: true,
    },
  });

  // Assign admin role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log(`Created admin user: admin@capillaris.com / admin123`);

  // 8. Seed catalog data - Donor Zones
  const donorZones = ['Occipital', 'Parietal Derecho', 'Parietal Izquierdo', 'Temporal Derecho', 'Temporal Izquierdo'];
  for (const name of donorZones) {
    await prisma.donorZone.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Created ${donorZones.length} donor zones`);

  // 9. Seed catalog data - Variants
  const variants = ['Androgenética', 'Areata', 'Cicatricial', 'Difusa', 'Frontal', 'Universal', 'Otra'];
  for (const name of variants) {
    await prisma.variant.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Created ${variants.length} variants`);

  // 10. Seed catalog data - Hair Types
  const hairTypes = ['Liso', 'Ondulado', 'Rizado', 'Crespo', 'Afro'];
  for (const name of hairTypes) {
    await prisma.hairType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Created ${hairTypes.length} hair types`);

  // 11. Seed catalog data - Operating Rooms
  const operatingRooms = ['Quirófano 1', 'Quirófano 2'];
  for (const name of operatingRooms) {
    await prisma.operatingRoom.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Created ${operatingRooms.length} operating rooms`);

  // 12. Catálogo de tratamientos.
  // Los nombres salen de lo que la clínica ya venía capturando como texto
  // libre en hairmedicines.descripcion — no son categorías inventadas.
  const treatmentTypes = [
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
  for (const t of treatmentTypes) {
    await prisma.treatmentType.upsert({
      where: { code: t.code },
      update: { name: t.name, orden: t.orden },
      create: t,
    });
  }
  console.log(`Created ${treatmentTypes.length} treatment types`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
