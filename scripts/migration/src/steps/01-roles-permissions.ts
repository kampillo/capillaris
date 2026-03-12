import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId } from '../id-map';

/**
 * Step 01: Create roles, permissions, and migrate catalog tables.
 *
 * Note: In the legacy DB, Spatie roles/permissions tables are EMPTY.
 * We create standard roles from scratch and seed permissions.
 */
export async function runRolesPermissions(): Promise<void> {
  const prisma = getPrisma();

  // --- Roles (created fresh since MySQL has none) ---
  const standardRoles = [
    { name: 'admin', displayName: 'Administrador', description: 'Acceso total al sistema' },
    { name: 'doctor', displayName: 'Doctor', description: 'Acceso a expedientes médicos y procedimientos' },
    { name: 'receptionist', displayName: 'Recepción', description: 'Registro de pacientes y citas' },
    { name: 'inventory_manager', displayName: 'Inventario', description: 'Gestión de productos y stock' },
  ];

  const createdRoles: Record<string, string> = {};
  for (const sr of standardRoles) {
    const role = await prisma.role.create({
      data: { name: sr.name, displayName: sr.displayName, description: sr.description },
    });
    createdRoles[sr.name] = role.id;
  }
  console.log(`  Created ${standardRoles.length} roles`);

  // --- Permissions ---
  const modules = [
    'patients', 'appointments', 'prescriptions', 'medical_consultations',
    'procedures', 'clinical_histories', 'micropigmentations', 'hairmedicines',
    'products', 'inventory', 'images', 'reports', 'reminders', 'users', 'settings',
  ];
  const actions = ['create', 'read', 'update', 'delete'];

  const permissions = [];
  for (const mod of modules) {
    for (const action of actions) {
      const perm = await prisma.permission.create({
        data: {
          name: `${mod}:${action}`,
          displayName: `${action} ${mod}`,
          module: mod,
        },
      });
      permissions.push(perm);
    }
  }

  // Assign permissions to roles
  const adminRoleId = createdRoles['admin'];
  for (const perm of permissions) {
    await prisma.rolePermission.create({
      data: { roleId: adminRoleId, permissionId: perm.id },
    });
  }

  const doctorModules = [
    'patients', 'appointments', 'prescriptions', 'medical_consultations',
    'procedures', 'clinical_histories', 'micropigmentations', 'hairmedicines',
    'images', 'reports',
  ];
  const doctorRoleId = createdRoles['doctor'];
  for (const perm of permissions.filter(p => doctorModules.some(m => p.name.startsWith(m)))) {
    await prisma.rolePermission.create({
      data: { roleId: doctorRoleId, permissionId: perm.id },
    });
  }

  const recModules = ['patients', 'appointments', 'images'];
  const recRoleId = createdRoles['receptionist'];
  for (const perm of permissions.filter(p => recModules.some(m => p.name.startsWith(m)))) {
    await prisma.rolePermission.create({
      data: { roleId: recRoleId, permissionId: perm.id },
    });
  }

  const invModules = ['products', 'inventory'];
  const invRoleId = createdRoles['inventory_manager'];
  for (const perm of permissions.filter(p => invModules.some(m => p.name.startsWith(m)))) {
    await prisma.rolePermission.create({
      data: { roleId: invRoleId, permissionId: perm.id },
    });
  }

  console.log(`  Created ${permissions.length} permissions with role assignments`);

  // --- Catalog: Donor Zones ---
  const mysqlDonorZones = await query<{ id: number; nombre: string }>(
    'SELECT id, nombre FROM donor_zones',
  );
  for (const dz of mysqlDonorZones) {
    const uuid = mapId('donor_zones', dz.id);
    await prisma.donorZone.create({
      data: { id: uuid, name: dz.nombre },
    });
  }
  // Ensure standard donor zones exist
  const stdDonorZones = ['Occipital', 'Parietal Derecho', 'Parietal Izquierdo', 'Temporal Derecho', 'Temporal Izquierdo'];
  for (const name of stdDonorZones) {
    const existing = await prisma.donorZone.findUnique({ where: { name } });
    if (!existing) {
      await prisma.donorZone.create({ data: { name } });
    }
  }
  console.log(`  Migrated ${mysqlDonorZones.length} donor zones`);

  // --- Catalog: Variants ---
  const mysqlVariants = await query<{ id: number; nombre: string }>(
    'SELECT id, nombre FROM variants',
  );
  for (const v of mysqlVariants) {
    const uuid = mapId('variants', v.id);
    await prisma.variant.create({
      data: { id: uuid, name: v.nombre },
    });
  }
  const stdVariants = ['Androgenética', 'Areata', 'Cicatricial', 'Difusa', 'Frontal', 'Universal', 'Otra'];
  for (const name of stdVariants) {
    const existing = await prisma.variant.findUnique({ where: { name } });
    if (!existing) {
      await prisma.variant.create({ data: { name } });
    }
  }
  console.log(`  Migrated ${mysqlVariants.length} variants`);

  // --- Catalog: Hair Types ---
  const mysqlHairTypes = await query<{ id: number; nombre: string }>(
    'SELECT id, nombre FROM hair_types',
  );
  for (const ht of mysqlHairTypes) {
    const uuid = mapId('hair_types', ht.id);
    await prisma.hairType.create({
      data: { id: uuid, name: ht.nombre },
    });
  }
  const stdHairTypes = ['Liso', 'Ondulado', 'Rizado', 'Crespo', 'Afro'];
  for (const name of stdHairTypes) {
    const existing = await prisma.hairType.findUnique({ where: { name } });
    if (!existing) {
      await prisma.hairType.create({ data: { name } });
    }
  }
  console.log(`  Migrated ${mysqlHairTypes.length} hair types`);
}
