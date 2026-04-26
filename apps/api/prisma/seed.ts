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
