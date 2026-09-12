const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('reflect-metadata');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { Prisma } = require('@prisma/client');
const { ProceduresService } = require('../../apps/api/src/modules/procedures/procedures.service');

const row = (id, date, group = null, patientId = 'patient') => ({
  id, procedureDate: new Date(date), sessionGroupId: group, patientId,
});

function setup(rows) {
  const updates = [];
  const tx = { procedureReport: {
    findUnique: async ({ where }) => rows.find(r => r.id === where.id) ?? null,
    findMany: async ({ where }) => rows.filter(r => where.OR
      ? where.OR.some(c => c.id ? c.id.in.includes(r.id) : c.sessionGroupId === r.sessionGroupId)
      : r.sessionGroupId === where.sessionGroupId && r.id !== where.id.not
    ).sort((a, b) => a.procedureDate - b.procedureDate),
    update: async (query) => { updates.push(query); return query; },
  } };
  const prisma = {
    procedureReport: { findMany: async () => rows },
    $transaction: async (fn, opts) => {
      assert.equal(opts.isolationLevel, 'Serializable');
      return fn(tx);
    },
  };
  return { service: new ProceduresService(prisma), updates, prisma };
}

test('links consecutive days across month, year, and leap-day boundaries in date order', async () => {
  for (const [first, second] of [
    ['2026-01-31', '2026-02-01'], ['2026-12-31', '2027-01-01'],
    ['2024-02-28', '2024-02-29'], ['2024-02-29', '2024-03-01'],
    ['2026-03-08', '2026-03-09'],
  ]) {
    const { service, updates } = setup([row('b', second), row('a', first)]);
    await service.linkSession('b', 'a');
    assert.deepEqual(updates.map(u => [u.where.id, u.data.sessionDay]), [['a', 1], ['b', 2]]);
    assert.equal(updates[0].data.sessionGroupId, updates[1].data.sessionGroupId);
  }
});

test('rejects same day and nonconsecutive dates without writing', async () => {
  for (const date of ['2026-01-01', '2026-01-03', '2026-02-01']) {
    const { service, updates } = setup([row('a', '2026-01-01'), row('b', date)]);
    await assert.rejects(service.linkSession('a', 'b'), /días consecutivos distintos/);
    assert.equal(updates.length, 0);
  }
});

test('rejects a third day and merging two complete groups without writing', async () => {
  for (const rows of [
    [row('a', '2026-01-01', 'g'), row('b', '2026-01-02', 'g'), row('c', '2026-01-03')],
    [row('a', '2026-01-01', 'g'), row('b', '2026-01-02', 'g'), row('c', '2026-01-03', 'h'), row('d', '2026-01-04', 'h')],
  ]) {
    const { service, updates } = setup(rows);
    await assert.rejects(service.linkSession('a', 'c'), /máximo dos/);
    assert.equal(updates.length, 0);
  }
});

test('valid repeated link preserves the group', async () => {
  const { service, updates } = setup([row('a', '2026-01-01', 'g'), row('b', '2026-01-02', 'g')]);
  await service.linkSession('a', 'b');
  assert.ok(updates.every(u => u.data.sessionGroupId === 'g'));
});

test('rejects self, missing target, nonexistent reports and different patients', async () => {
  const { service, updates } = setup([row('a', '2026-01-01'), row('b', '2026-01-02', null, 'other')]);
  for (const [a, b] of [['a', 'a'], ['a', undefined], ['a', ''], ['a', 'missing'], ['missing', 'a'], ['a', 'b']]) {
    await assert.rejects(service.linkSession(a, b));
  }
  assert.equal(updates.length, 0);
});

test('create and update cannot assign or clear session metadata directly', async () => {
  const { service, updates } = setup([]);
  for (const fields of [{ sessionGroupId: 'g' }, { sessionGroupId: null }, { sessionDay: 1 }, { sessionDay: null }]) {
    await assert.rejects(service.create({ patientId: 'p', procedureDate: '2026-01-01', ...fields }), /acciones de sesión/);
    await assert.rejects(service.update('a', fields), /acciones de sesión/);
  }
  assert.equal(updates.length, 0);
});

test('grouped dates require unlinking first but clinical edits and unchanged dates remain allowed', async () => {
  const { service, updates } = setup([row('a', '2026-01-01', 'g')]);
  await assert.rejects(service.update('a', { procedureDate: '2026-01-03' }), /Separa el reporte/);
  assert.equal(updates.length, 0);
  await service.update('a', { descripcion: 'Updated' });
  await service.update('a', { procedureDate: '2026-01-01' });
  assert.equal(updates.length, 2);
});

test('ungrouped dates remain editable', async () => {
  const { service, updates } = setup([row('a', '2026-01-01')]);
  await service.update('a', { procedureDate: '2026-01-05' });
  assert.equal(updates[0].data.procedureDate.toISOString(), '2026-01-05T00:00:00.000Z');
});

test('unlinking a two-day group clears metadata on both reports', async () => {
  const { service, updates } = setup([row('a', '2026-01-01', 'g'), row('b', '2026-01-02', 'g')]);
  await service.unlinkSession('a');
  assert.equal(updates.length, 2);
  assert.ok(updates.every(u => u.data.sessionGroupId === null && u.data.sessionDay === null));
});

test('serialization conflicts retry with a fresh read and remain bounded', async () => {
  const { service, prisma } = setup([row('a', '2026-01-01'), row('b', '2026-01-02')]);
  const original = prisma.$transaction;
  let calls = 0;
  const conflict = () => new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' });
  prisma.$transaction = async (...args) => { if (++calls === 1) throw conflict(); return original(...args); };
  await service.linkSession('a', 'b');
  assert.equal(calls, 2);
  calls = 0;
  prisma.$transaction = async () => { calls++; throw conflict(); };
  await assert.rejects(service.linkSession('a', 'b'), /conflict/);
  assert.equal(calls, 3);
});
