// Explicit opt-in. Creates only synthetic QA accounts and reports on the authorized
// fictitious patient. Cleanup deletes those reports and deactivates/soft-deletes
// the QA accounts; audit records remain. Never runs against production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const root = path.resolve(__dirname, '../..');
const env = require('dotenv').parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
if (!process.argv.includes('--develop')) throw Error('Requires explicit --develop');
assert.equal(new URL(env.DATABASE_URL).hostname, 'ep-twilight-math-an0vfyln-pooler.c-6.us-east-1.aws.neon.tech');
const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const patientId = 'a060036b-a434-4b81-9fc1-bb4054a4e609';
const users = [], procedures = [];
async function request(token, method, route, body, status = 200) {
  const response = await fetch(`http://127.0.0.1:3001/api/v1${route}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json().catch(() => null);
  assert.equal(response.status, status, `${method} ${route}: expected ${status}, got ${response.status}${response.status >= 400 ? ': ' + JSON.stringify(value) : ''}`);
  return value;
}
async function account(roleName) {
  const password = randomBytes(32).toString('hex');
  const role = await db.role.findUniqueOrThrow({ where: { name: roleName } });
  const user = await db.user.create({ data: {
    nombre: 'QA FICTICIA Enfermeria', apellido: `${roleName} ${randomUUID().slice(0, 8)}`,
    email: `qa-nursing-${randomUUID()}@example.invalid`, passwordHash: await bcrypt.hash(password, 10),
    userRoles: { create: { roleId: role.id } },
  } });
  users.push(user.id);
  const login = await request(null, 'POST', '/auth/login', { email: user.email, password });
  assert.deepEqual(login.user.roles, [roleName]);
  return { id: user.id, token: login.accessToken, name: `${user.nombre} ${user.apellido}` };
}
async function main() {
  const patient = await db.patient.findUniqueOrThrow({ where: { id: patientId } });
  assert.equal(patient.nombre, 'PRUEBA FICTICIA');
  const admin = await account('admin'), nurse = await account('nurse');
  console.log('PASS: individual QA accounts authenticate with current roles');
  await request(null, 'POST', '/auth/register', {}, 401);
  for (const route of ['/patients', '/appointments', '/inventory', '/reports/procedures', '/users', '/catalog/doctors', '/nursing/staff']) await request(nurse.token, 'GET', route, undefined, 403);
  await request(nurse.token, 'POST', '/patients', {}, 403);
  await request(nurse.token, 'POST', '/auth/register', {}, 403);
  await request(nurse.token, 'GET', `/nursing/patients/${patientId}`, undefined, 403);
  assert.deepEqual(await request(nurse.token, 'GET', '/nursing/patients'), []);
  console.log('PASS: no global patient, agenda, inventory, report or account access; unassigned patient blocked');
  await request(admin.token, 'POST', `/nursing/patients/${patientId}/assignments`, { nurseId: nurse.id }, 201);
  const list = await request(nurse.token, 'GET', '/nursing/patients');
  assert.deepEqual(list.map(p => p.id), [patientId]);
  const detail = await request(nurse.token, 'GET', `/nursing/patients/${patientId}`);
  assert.equal('email' in detail.patient, false);
  assert.equal('notas' in detail.patient, false);
  const catalog = await request(nurse.token, 'GET', '/nursing/catalog');
  const doctorIds = catalog.doctors.length ? [catalog.doctors[0].id] : [];
  for (const procedureDate of ['2090-08-31', '2090-09-01']) {
    const created = await request(nurse.token, 'POST', `/nursing/patients/${patientId}/procedures`, {
      patientId, procedureDate, totalFoliculos: 1, descripcion: 'QA FICTICIA TEMPORAL: prueba de permisos. No clínico.', doctorIds,
    }, 201);
    procedures.push(created.id);
    assert.deepEqual(Object.keys(created), ['id']);
    await request(nurse.token, 'PUT', `/nursing/procedures/${created.id}/participants`, { nurseIds: [nurse.id] });
  }
  await request(nurse.token, 'PUT', `/nursing/patients/${patientId}/procedures/${procedures[0]}`, { descripcion: 'QA FICTICIA TEMPORAL: edición verificada', totalFoliculos: 2, doctorIds: [], hairTypeIds: [], anestExtFechaInicial: '2090-08-31T15:00:00.000Z' });
  await request(nurse.token, 'PUT', `/nursing/patients/${patientId}/procedures/${procedures[0]}`, { anestExtFechaInicial: null });
  const stored = await db.procedureReport.findUniqueOrThrow({ where: { id: procedures[0] }, include: { doctors: true } });
  assert.equal(stored.createdBy, nurse.id); assert.equal(stored.updatedBy, nurse.id);
  assert.equal(stored.totalFoliculos, 2); assert.equal(stored.doctors.length, 0); assert.equal(stored.anestExtFechaInicial, null);
  await request(nurse.token, 'PUT', `/nursing/patients/${patientId}/procedures/${randomUUID()}`, {}, 404);
  await request(nurse.token, 'DELETE', `/procedures/${procedures[0]}`, undefined, 403);
  await request(nurse.token, 'POST', `/nursing/patients/${patientId}/assignments`, { nurseId: nurse.id }, 403);
  await request(nurse.token, 'PUT', `/nursing/procedures/${procedures[0]}/participants`, { nurseIds: [admin.id] }, 400);
  console.log('PASS: assigned-only create/edit, persisted values, separate authors/participants; deletion and self-assignment blocked');
  await request(admin.token, 'POST', `/procedures/${procedures[0]}/session`, { withId: procedures[1] }, 201);
  const august = await request(admin.token, 'GET', '/reports/procedures?startDate=2090-08-01&endDate=2090-08-31');
  assert.equal(august.totalProcedures, 1); assert.equal(august.totalFollicles, 3);
  assert.deepEqual(august.byNurse, [{ name: nurse.name, count: 1 }]);
  const september = await request(admin.token, 'GET', '/reports/procedures?startDate=2090-09-01&endDate=2090-09-30');
  assert.equal(september.totalProcedures, 0); assert.deepEqual(september.byNurse, []);
  await request(admin.token, 'POST', `/nursing/patients/${patientId}/assignments/revoke`, { nurseId: nurse.id }, 201);
  await request(nurse.token, 'GET', `/nursing/patients/${patientId}`, undefined, 403);
  await request(nurse.token, 'PUT', `/nursing/patients/${patientId}/procedures/${procedures[0]}`, { totalFoliculos: 99 }, 403);
  await request(nurse.token, 'PUT', `/nursing/procedures/${procedures[0]}/participants`, { nurseIds: [] }, 403);
  assert.equal(await db.procedureReportNurse.count({ where: { nurseId: nurse.id } }), 2);
  assert.deepEqual((await request(admin.token, 'GET', '/reports/procedures?startDate=2090-08-01&endDate=2090-08-31')).byNurse, august.byNurse);
  await db.user.update({ where: { id: nurse.id }, data: { isActive: false } });
  await request(nurse.token, 'GET', '/auth/me', undefined, 401);
  console.log('PASS: unique participation in first-day month, historical participation survives revocation, disabled account blocked immediately');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(async () => {
  try {
    if (procedures.length) await db.procedureReport.deleteMany({ where: { id: { in: procedures }, patientId } });
    if (users.length) {
      await db.nursingAssignment.updateMany({ where: { nurseId: { in: users }, patientId }, data: { revokedAt: new Date() } });
      await db.user.updateMany({ where: { id: { in: users } }, data: { isActive: false, deletedAt: new Date() } });
    }
    console.log('Cleanup: temporary QA reports removed; QA accounts disabled/soft-deleted; original patient reports unchanged.');
  } finally { await db.$disconnect(); }
});
