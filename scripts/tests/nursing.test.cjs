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
  for (const method of ['staff', 'assign', 'revoke', 'assignments']) assert.equal(guard.canActivate(context(NursingController, method)), false, method);
  for (const method of ['remove', 'findAll', 'create', 'update', 'linkSession']) assert.equal(guard.canActivate(context(ProceduresController, method)), false, method);
  assert.equal(guard.canActivate(context(AuthController, 'register')), false);
  assert.equal(guard.canActivate(context(AuthController, 'register', null)), false);
  assert.equal(guard.canActivate(context(NursingController, 'assign', { id: 'mixed', roles: ['admin', 'nurse'] })), false);
  class Legacy { read() {} }
  assert.equal(guard.canActivate(context(Legacy, 'read')), false);
});
test('JWT uses current roles and rejects disabled, deleted and removed users', async () => {
  let current = { id: 'n', email: 'qa@example.invalid', isActive: true, deletedAt: null, userRoles: [{ role: { name: 'nurse' } }] };
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
test('patient assignment is checked afresh for each operation, and filters active accounts', async () => {
  let assigned = true;
  const tx = { patient: { findFirst: async () => ({ id: 'p' }) }, nursingAssignment: { findFirst: async ({ where }) => {
    assert.equal(where.patientId, 'p'); assert.equal(where.nurseId, 'nurse'); assert.equal(where.revokedAt, null); assert.equal(where.nurse.isActive, true);
    return assigned ? { id: 'assignment' } : null;
  } } };
  const service = new NursingService({ $transaction: fn => fn(tx) });
  await service.assertAssigned(tx, 'p', actor);
  assigned = false;
  await assert.rejects(() => service.assertAssigned(tx, 'p', actor), e => e.getStatus() === 403);
  await assert.rejects(() => service.save('p', {}, actor), e => e.getStatus() === 403);
  await assert.rejects(() => service.assign('p', 'nurse', actor), e => e.getStatus() === 403);
  await service.assertAssigned(tx, 'p', { id: 'd', roles: ['doctor'] });
});
test('editing a procedure belonging to another patient is rejected before writing', async () => {
  const tx = { patient: { findFirst: async () => ({ id: 'p' }) }, nursingAssignment: { findFirst: async () => ({ id: 'a' }) }, procedureReport: { findFirst: async ({ where }) => { assert.equal(where.patientId, 'p'); return null; } } };
  const service = new NursingService({ $transaction: fn => fn(tx) });
  await assert.rejects(() => service.save('p', {}, actor, 'other-procedure'), e => e.getStatus() === 404);
});
test('participants reject unassigned additions and preserve historical selections', async () => {
  let writes = 0;
  const tx = {
    patient: { findFirst: async () => ({ id: 'p' }) },
    nursingAssignment: { findFirst: async () => ({ id: 'a' }), count: async () => 0 },
    procedureReport: { findUnique: async () => ({ patientId: 'p' }), update: async () => { writes++; } },
    procedureReportNurse: { findMany: async () => [{ nurseId: 'historical' }], deleteMany: async () => { writes++; }, createMany: async () => { writes++; } },
  };
  const service = new NursingService({ $transaction: fn => fn(tx) });
  await assert.rejects(() => service.participants('proc', ['outsider'], actor), e => e.getStatus() === 400);
  assert.equal(writes, 0);
  await service.participants('proc', ['historical'], actor);
  assert.equal(writes, 2);
});
