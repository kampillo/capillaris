const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { Prisma } = require('@prisma/client');
const { serializeJsonQuery, dmmfToRuntimeDataModel } = require('@prisma/client/runtime/library');
const { maskSensitive } = require('../../apps/api/src/common/audit/sensitive-fields');

// The same installed Prisma serializer used before the query engine receives
// JSON. No PrismaClient, database, network or write operation is involved.
function validateWithPrisma(values) {
  return serializeJsonQuery({
    modelName: 'AuditLog', action: 'findMany',
    args: { where: { newValues: { equals: values } } },
    runtimeDataModel: dmmfToRuntimeDataModel(Prisma.dmmf.datamodel),
    clientMethod: 'auditLog.findMany', clientVersion: Prisma.prismaVersion.client,
    errorFormat: 'minimal', previewFeatures: [],
  });
}

test('audit Decimal preserves exact precision and is accepted by the real Prisma JSON serializer', () => {
  const source = { physicalExploration: { talla: new Prisma.Decimal('1.75'), peso: new Prisma.Decimal('70'), temperatura: new Prisma.Decimal('36.6') }, amount: new Prisma.Decimal('9007199254740993.123456789'), zero: new Prisma.Decimal(0), negative: new Prisma.Decimal('-0.25') };
  const result = maskSensitive(source);
  assert.deepEqual(result, { physicalExploration: { talla: '1.75', peso: '70', temperatura: '36.6' }, amount: '9007199254740993.123456789', zero: '0', negative: '-0.25' });
  assert.doesNotThrow(() => validateWithPrisma(result));
  assert.ok(Prisma.Decimal.isDecimal(source.physicalExploration.talla));
});

test('audit Date preserves the instant in JSON, including nested arrays; invalid dates become null', () => {
  const source = new Date('2026-10-03T03:04:05.678-07:00');
  const result = maskSensitive({ createdAt: source, nested: [source, new Date('invalid')] });
  assert.deepEqual(result, { createdAt: '2026-10-03T10:04:05.678Z', nested: ['2026-10-03T10:04:05.678Z', null] });
  assert.doesNotThrow(() => validateWithPrisma(result));
  assert.equal(source.toISOString(), '2026-10-03T10:04:05.678Z');
});

test('audit JSON retains primitives and exact bigint, omits unsupported object values, and retains array positions', () => {
  const result = maskSensitive({ n: 0, yes: false, text: '', nil: null, large: 9007199254740993n, nan: NaN, infinity: Infinity, missing: undefined, callback: () => {}, symbol: Symbol('synthetic'), list: [undefined, () => {}, Symbol(), 0, false, null] });
  assert.deepEqual(result, { n: 0, yes: false, text: '', nil: null, large: '9007199254740993', nan: null, infinity: null, list: [null, null, null, 0, false, null] });
  assert.doesNotThrow(() => validateWithPrisma(result));
});

test('audit masks nested credentials while serializing Decimal and never changes the source object', () => {
  const source = { passwordHash: 'SYNTHETIC_HASH', nested: [{ access_token: 'SYNTHETIC_TOKEN', refreshToken: 'SYNTHETIC_REFRESH', amount: new Prisma.Decimal('12.50') }], data: { currentPassword: 'SYNTHETIC_PASSWORD', newPassword: 'SYNTHETIC_NEW', digest: 'SYNTHETIC_DIGEST', JWT: 'ordinary-field' } };
  const result = maskSensitive(source);
  assert.deepEqual(result, { passwordHash: '***', nested: [{ access_token: '***', refreshToken: '***', amount: '12.5' }], data: { currentPassword: '***', newPassword: '***', digest: '***', JWT: 'ordinary-field' } });
  assert.doesNotThrow(() => validateWithPrisma(result));
  assert.equal(source.passwordHash, 'SYNTHETIC_HASH');
  assert.equal(source.nested[0].access_token, 'SYNTHETIC_TOKEN');
});

test('audit circular data cannot lose the whole event; repeated non-circular objects stay complete', () => {
  const repeated = { amount: new Prisma.Decimal('1.75') };
  const source = { repeated: [repeated, repeated] };
  source.self = source;
  const result = maskSensitive(source);
  assert.deepEqual(result, { repeated: [{ amount: '1.75' }, { amount: '1.75' }], self: '[Circular]' });
  assert.doesNotThrow(() => validateWithPrisma(result));
});

test('audit literal prototype keys stay data and do not change the output prototype', () => {
  const source = JSON.parse('{"__proto__":{"password":"SYNTHETIC_PASSWORD"},"safe":true}');
  const result = maskSensitive(source);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.ok(Object.hasOwn(result, '__proto__'));
  assert.equal(result.__proto__.password, '***');
  assert.doesNotThrow(() => validateWithPrisma(result));
});
