import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId } from '../id-map';

/**
 * Step 02: Migrate users and assign roles.
 *
 * Since Spatie roles/model_has_roles are empty in MySQL,
 * we assign roles heuristically:
 * - User ID 1 (admin) → admin role
 * - Users with isActive=1 → doctor role (most users are doctors)
 * - Inactive users → doctor role (but inactive)
 *
 * bcrypt hashes from PHP are compatible with Node.js bcrypt.
 */
export async function runUsers(): Promise<void> {
  const prisma = getPrisma();

  const mysqlUsers = await query<{
    id: number;
    nombre: string;
    apellido: string;
    fecha_nacimiento: Date | null;
    email: string;
    password: string;
    celular: string | null;
    ced_prof: string | null;
    foto: string | null;
    isActive: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }>('SELECT * FROM users');

  // Get role IDs from PG (created in step 01)
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const doctorRole = await prisma.role.findUnique({ where: { name: 'doctor' } });

  if (!adminRole || !doctorRole) {
    throw new Error('Roles not found in PG. Did step 01 run?');
  }

  for (const u of mysqlUsers) {
    const uuid = mapId('users', u.id);

    await prisma.user.create({
      data: {
        id: uuid,
        nombre: u.nombre,
        apellido: u.apellido || '',
        email: u.email,
        // PHP bcrypt uses $2y$ prefix; Node bcrypt v5 only matches $2a$/$2b$.
        // Convert prefix (algorithm is identical, just renamed).
        passwordHash: u.password.replace(/^\$2y\$/, '$2a$'),
        celular: u.celular || null,
        cedulaProfesional: u.ced_prof || null,
        fechaNacimiento: u.fecha_nacimiento || null,
        avatarUrl: u.foto || null,
        isActive: u.isActive === 1,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        deletedAt: u.deleted_at || null,
      },
    });

    // Assign role: user ID 1 gets admin, everyone else gets doctor
    const roleId = u.id === 1 ? adminRole.id : doctorRole.id;
    await prisma.userRole.create({
      data: { userId: uuid, roleId },
    });
  }

  console.log(`  Migrated ${mysqlUsers.length} users with role assignments`);
}
