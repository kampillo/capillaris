const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../..');

// A fresh process must load the workspace package without ts-node or type stripping.
test('shared utilities and enums load as JavaScript in a plain Node process', () => {
  const output = execFileSync(process.execPath, ['-e', `
    const shared = require('@capillaris/shared');
    console.log(JSON.stringify({
      status: shared.AppointmentStatus.CONFIRMED,
      totals: shared.procedureTotals({ cb1: 2, cb2: 3 }),
      folder: shared.normalizeDriveFolderUrl('https://drive.google.com/drive/u/0/folders/qa_Folder?resourcekey=qa-key'),
      typescriptLoaded: Object.keys(require.cache).some(file => /\\.ts$/.test(file)),
    }));
  `], { cwd: repo, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.deepEqual(JSON.parse(output), {
    status: 'confirmed', totals: { follicles: 5, hairs: 8, coefficient: 1.6, source: 'cb' },
    folder: 'https://drive.google.com/drive/folders/qa_Folder?resourcekey=qa-key', typescriptLoaded: false,
  });
});

require('reflect-metadata');
require('ts-node').register({ project: path.join(repo, 'apps/api/tsconfig.json'), transpileOnly: true });
const { UsersService } = require('../../apps/api/src/modules/users/users.service');
const { JwtStrategy } = require('../../apps/api/src/modules/auth/strategies/jwt.strategy');
const { Reflector } = require('@nestjs/core');
const { RolesGuard } = require('../../apps/api/src/common/guards/roles.guard');
const { UsersController } = require('../../apps/api/src/modules/users/users.controller');

function fixture() {
  const row = { id: 'qa-user', email: 'qa@example.invalid', nombre: 'QA', apellido: 'Ficticio',
    passwordHash: 'synthetic-not-a-hash', isActive: true, deletedAt: null, authVersion: 3,
    userRoles: [{ role: { id: 'qa-role', name: 'receptionist', displayName: 'Recepción' } }],
  };
  const writes = [];
  const user = {
    findUnique: async () => row,
    findUniqueOrThrow: async () => row,
    update: async ({ data, select }) => {
      writes.push(data);
      const { authVersion, ...rest } = data;
      Object.assign(row, rest);
      if (authVersion) row.authVersion += authVersion.increment;
      return select ? Object.fromEntries(Object.entries(row).filter(([key]) => select[key])) : row;
    },
  };
  const tx = { user, userRole: {
    deleteMany: async () => assert.fail('Existing roles must be preserved'),
    create: async () => assert.fail('Existing roles must be preserved'),
  } };
  const db = { user, $transaction: fn => fn(tx) };
  return { row, writes, service: new UsersService(db), strategy: new JwtStrategy({ get: () => 'synthetic-test-secret-only' }, db) };
}
const unauthorized = error => error.getStatus() === 401;

for (const route of ['PUT', 'DELETE']) {
  test(`${route} deactivation revokes old sessions across reactivation without replacing roles`, async () => {
    const f = fixture();
    const token = { sub: f.row.id, roles: ['admin'], authVersion: 3 };
    assert.deepEqual((await f.strategy.validate(token)).roles, ['receptionist']);
    const response = route === 'PUT' ? await f.service.update(f.row.id, { isActive: false }) : await f.service.remove(f.row.id);
    assert.equal(response.isActive, false);
    assert.equal(Object.hasOwn(response, 'passwordHash'), false);
    assert.equal(f.row.authVersion, 4);
    await assert.rejects(f.strategy.validate(token), unauthorized);
    await f.service.reactivate(f.row.id);
    await assert.rejects(f.strategy.validate(token), unauthorized);
    const current = await f.strategy.validate({ ...token, authVersion: 4 });
    assert.deepEqual(current.roles, ['receptionist']);
  });
}

test('legacy tokens without authVersion stay revoked after PUT deactivation and reactivation', async () => {
  const f = fixture();
  f.row.authVersion = 0;
  const legacyToken = { sub: f.row.id, roles: ['admin'] };
  assert.deepEqual((await f.strategy.validate(legacyToken)).roles, ['receptionist']);
  await f.service.update(f.row.id, { isActive: false });
  await f.service.reactivate(f.row.id);
  await assert.rejects(f.strategy.validate(legacyToken), unauthorized);
  assert.equal(f.row.authVersion, 1);
});

test('profile edits and PUT reactivation preserve the session version and existing roles', async () => {
  const f = fixture();
  const response = await f.service.update(f.row.id, { nombre: 'QA editado' });
  assert.equal(response.nombre, 'QA editado');
  assert.deepEqual(response.roles.map(role => role.name), ['receptionist']);
  assert.equal(f.row.authVersion, 3);
  await f.service.update(f.row.id, { isActive: false });
  await f.service.update(f.row.id, { isActive: true });
  assert.equal(f.row.authVersion, 4);
  await assert.rejects(f.strategy.validate({ sub: f.row.id, authVersion: 3 }), unauthorized);
});

test('user update and deactivate endpoints retain admin-only access', () => {
  const guard = new RolesGuard(new Reflector());
  for (const method of ['update', 'remove', 'reactivate']) {
    const context = roles => ({ getHandler: () => UsersController.prototype[method], getClass: () => UsersController,
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'qa', roles } }) }) });
    assert.equal(guard.canActivate(context(['admin'])), true);
    for (const roles of [['doctor'], ['receptionist'], ['inventory_manager'], ['nurse'], ['treatment_staff'], ['admin', 'nurse']]) {
      assert.equal(guard.canActivate(context(roles)), false, `${method}: ${roles}`);
    }
  }
});
