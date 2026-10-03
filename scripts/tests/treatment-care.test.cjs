const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('reflect-metadata');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { Reflector } = require('@nestjs/core');
const { RolesGuard } = require('../../apps/api/src/common/guards/roles.guard');
const { TreatmentCareController } = require('../../apps/api/src/modules/treatments/treatment-care.controller');
const { TreatmentCareService } = require('../../apps/api/src/modules/treatments/treatment-care.service');
const { NursingController } = require('../../apps/api/src/modules/nursing/nursing.controller');
const { TreatmentsController } = require('../../apps/api/src/modules/treatments/treatments.controller');
const { AuthController } = require('../../apps/api/src/modules/auth/auth.controller');
const { restrictedWorkspace } = require('../../apps/web/src/lib/roles');
const { patientSearch, patientSummary } = require('../../apps/api/src/common/clinical-workspace');
const actor = { id: 'operator', roles: ['treatment_staff'] };
const context = (controller, method, roles) => ({ getHandler: () => controller.prototype[method], getClass: () => controller, switchToHttp: () => ({ getRequest: () => ({ user: {id:'operator',roles} }) }) });

test('treatment role and mixed administrative accounts are limited to their explicitly authorized area', () => {
  const guard = new RolesGuard(new Reflector());
  for (const roles of [['treatment_staff'], ['admin', 'treatment_staff']]) {
    for (const method of ['patients', 'detail', 'catalog', 'create', 'update']) assert.equal(guard.canActivate(context(TreatmentCareController, method, roles)), true);
    for (const method of ['patients', 'detail', 'create', 'update', 'participants']) assert.equal(guard.canActivate(context(NursingController, method, roles)), false);
    for (const method of ['create', 'findOne', 'findByPatient', 'update', 'remove']) assert.equal(guard.canActivate(context(TreatmentsController, method, roles)), false);
    for (const method of ['getProfile', 'logout']) assert.equal(guard.canActivate(context(AuthController, method, roles)), true);
    assert.equal(guard.canActivate(context(AuthController, 'register', roles)), false);
  }
  assert.equal(guard.canActivate(context(TreatmentCareController, 'detail', ['nurse'])), false);
  assert.equal(guard.canActivate(context(TreatmentCareController, 'detail', ['nurse','treatment_staff'])), true);
});

test('UI route policy matches isolated and combined restricted roles, including URL bypass attempts', () => {
  for (const roles of [['nurse'], ['treatment_staff'], ['nurse','treatment_staff'], ['admin','treatment_staff']]) {
    for (const url of ['/dashboard', '/dashboard/patients', '/dashboard/appointments', '/dashboard/reports', '/dashboard/settings/users', '/dashboard/nursing/abc/edit', '/dashboard/treatment-care/abc/history']) {
      const rule = restrictedWorkspace(roles, url);
      assert.equal(rule.restricted, true); assert.equal(rule.allowed, false, url);
    }
    assert.equal(restrictedWorkspace(roles, '/dashboard/nursing/abcdef').allowed, roles.includes('nurse'));
    assert.equal(restrictedWorkspace(roles, '/dashboard/treatment-care/abcdef').allowed, roles.includes('treatment_staff'));
  }
  assert.equal(restrictedWorkspace(['admin'], '/dashboard/patients').restricted, false);
});

test('search is bounded, matches full names token by token, and exposes only identification fields', () => {
  assert.equal(patientSearch(''), null); assert.equal(patientSearch('x'), null);
  const where = patientSearch('  Ficticia   Prueba  ');
  assert.equal(where.deletedAt, null); assert.equal(where.AND.length, 2);
  assert.deepEqual(Object.keys(patientSummary).sort(), ['apellido','edadApproximada','fechaNacimiento','id','nombre']);
  assert.throws(() => patientSearch('x'.repeat(101)), e => e.getStatus() === 400);
});

test('treatment ownership, active responsible and valid dates are checked before writing', async () => {
  let record = null;
  const tx = {
    patient: { findFirst: async () => ({id:'p'}) },
    treatment: { findFirst: async ({where}) => { assert.equal(where.patientId, 'p'); return record; } },
    user: { findFirst: async ({where}) => { assert.equal(where.isActive, true); assert.deepEqual(where.userRoles.some.role.name.in, ['treatment_staff','doctor']); return null; } },
  };
  const service = new TreatmentCareService({ $transaction: fn => fn(tx) });
  await assert.rejects(() => service.save('p', {}, actor, 'other'), e => e.getStatus() === 404);
  await assert.rejects(() => service.save('p', {patientId:'other',fecha:'2026-09-21'}, actor), e => e.getStatus() === 400);
  await assert.rejects(() => service.save('p', {fecha:null}, actor), e => e.getStatus() === 400);
  await assert.rejects(() => service.save('p', {fecha:'2026-09-21',realizadoPorId:'nurse'}, actor), e => e.getStatus() === 400);
  await assert.rejects(() => service.detail('p', {id:'n',roles:['nurse']}), e => e.getStatus() === 403);
});

test('updates preserve authorship, historical inactive selections and origin while allowing clear/replace', async () => {
  let written;
  const tx = {
    patient: { findFirst: async () => ({id:'p'}) },
    treatment: {
      findFirst: async () => ({id:'t', realizadoPorId:'historical', tipos:[{treatmentTypeId:'inactive'}], zonas:[]}),
      update: async ({data}) => { written = data; return {id:'t'}; },
    },
    treatmentType: { count: async ({where}) => { assert.deepEqual(where.id.in, []); return 0; } },
    hairType: { count: async () => 0 },
  };
  const service = new TreatmentCareService({$transaction: fn => fn(tx)});
  await service.save('p', {realizadoPorId:'historical',treatmentTypeIds:['inactive'],zonaIds:[],sesionNumero:null,descripcion:'corregido', createdBy:'forged',origen:'forged'}, actor, 't');
  assert.equal(written.updatedBy, actor.id); assert.equal(written.createdBy, undefined); assert.equal(written.origen, undefined);
  assert.equal(written.sesionNumero, null); assert.deepEqual(written.zonas, {deleteMany:{},create:[]});
  assert.deepEqual(written.tipos.create, [{treatmentTypeId:'inactive'}]);
});
