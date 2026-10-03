const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('reflect-metadata');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { Reflector } = require('@nestjs/core');
const { RolesGuard } = require('../../apps/api/src/common/guards/roles.guard');
const { JwtStrategy } = require('../../apps/api/src/modules/auth/strategies/jwt.strategy');
const { NursingService } = require('../../apps/api/src/modules/nursing/nursing.service');
const { NursingController } = require('../../apps/api/src/modules/nursing/nursing.controller');
const { ProceduresController } = require('../../apps/api/src/modules/procedures/procedures.controller');
const { AuthController } = require('../../apps/api/src/modules/auth/auth.controller');
const actor = { id: 'nurse', roles: ['nurse'] };
function context(controller, method, user = actor) {
  return { getHandler: () => controller.prototype[method], getClass: () => controller, switchToHttp: () => ({ getRequest: () => ({ user }) }) };
}
test('nursing only enters explicitly allowed endpoints, including with a mixed role', () => {
  const guard = new RolesGuard(new Reflector());
  for (const method of ['patients', 'detail', 'catalog', 'create', 'update', 'participants']) assert.equal(guard.canActivate(context(NursingController, method)), true, method);
  for (const method of ['staff', 'assignments']) assert.equal(guard.canActivate(context(NursingController, method)), false, method);
  assert.equal(NursingController.prototype.assign, undefined);
  assert.equal(NursingController.prototype.revoke, undefined);
  for (const method of ['remove', 'findAll', 'create', 'update', 'linkSession']) assert.equal(guard.canActivate(context(ProceduresController, method)), false, method);
  assert.equal(guard.canActivate(context(AuthController, 'register')), false);
  assert.equal(guard.canActivate(context(AuthController, 'register', null)), false);
  assert.equal(guard.canActivate(context(NursingController, 'staff', { id: 'mixed', roles: ['admin', 'nurse'] })), false);
  class Legacy { read() {} }
  assert.equal(guard.canActivate(context(Legacy, 'read')), false);
});
test('JWT uses current roles and rejects disabled, deleted and removed users', async () => {
  let current = { id: 'n', email: 'qa@example.invalid', isActive: true, deletedAt: null, authVersion: 0, userRoles: [{ role: { name: 'nurse' } }] };
  const strategy = new JwtStrategy({ get: () => 'unit-test-only-secret' }, { user: { findUnique: async () => current } });
  const payload = { sub: 'n', email: 'stale@example.invalid', roles: ['admin'] };
  assert.deepEqual((await strategy.validate(payload)).roles, ['nurse']);
  current.isActive = false;
  await assert.rejects(() => strategy.validate(payload), e => e.getStatus() === 401);
  current.isActive = true; current.deletedAt = new Date();
  await assert.rejects(() => strategy.validate(payload), e => e.getStatus() === 401);
  current = null;
  await assert.rejects(() => strategy.validate(payload), e => e.getStatus() === 401);
});
test('surgical access no longer queries assignments; deleted patients and unrelated roles are rejected', async () => {
  let patient = { id: 'p' };
  const tx = { patient: { findFirst: async ({where}) => { assert.equal(where.deletedAt, null); return patient; } }, nursingAssignment: new Proxy({}, { get: () => { throw Error('Must not query assignments'); } }) };
  const service = new NursingService({ $transaction: fn => fn(tx) });
  await service.assertAccess(tx, 'p', actor);
  await service.assertAccess(tx, 'p', { id: 'd', roles: ['doctor'] });
  for (const roles of [['receptionist'], ['treatment_staff'], ['admin', 'treatment_staff']]) {
    await assert.rejects(() => service.assertAccess(tx, 'p', {id:'other',roles}), e => e.getStatus() === 403);
  }
  patient = null;
  await assert.rejects(() => service.assertAccess(tx, 'p', actor), e => e.getStatus() === 404);
});
test('editing a procedure belonging to another patient is rejected before writing', async () => {
  const tx = { patient: { findFirst: async () => ({ id: 'p' }) }, nursingAssignment: { findFirst: async () => ({ id: 'a' }) }, procedureReport: { findFirst: async ({ where }) => { assert.equal(where.patientId, 'p'); return null; } } };
  const service = new NursingService({ $transaction: fn => fn(tx) });
  await assert.rejects(() => service.save('p', {}, actor, 'other-procedure'), e => e.getStatus() === 404);
});
test('participants reject inactive/non-nursing additions and preserve historical selections without assignment', async () => {
  let writes = 0;
  const tx = {
    patient: { findFirst: async () => ({ id: 'p' }) },
    user: { count: async ({where}) => { assert.equal(where.isActive, true); assert.equal(where.userRoles.some.role.name, 'nurse'); return 0; } },
    procedureReport: { findUnique: async () => ({ patientId: 'p' }), update: async () => { writes++; } },
    procedureReportNurse: { findMany: async () => [{ nurseId: 'historical' }], deleteMany: async () => { writes++; }, createMany: async () => { writes++; } },
  };
  const service = new NursingService({ $transaction: fn => fn(tx) });
  await assert.rejects(() => service.participants('proc', ['outsider'], actor), e => e.getStatus() === 400);
  assert.equal(writes, 0);
  await service.participants('proc', ['historical'], actor);
  assert.equal(writes, 2);
});
