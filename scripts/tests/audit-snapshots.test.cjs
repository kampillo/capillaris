const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');
const { serializeJsonQuery, dmmfToRuntimeDataModel } = require('@prisma/client/runtime/library');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('./form-test-harness.cjs');
const snapshots = load('apps/api/src/common/audit/audit-snapshot.ts');
const sensitive = load('apps/api/src/common/audit/sensitive-fields.ts', { '@prisma/client': { Prisma } });
const context = load('apps/api/src/common/audit/audit-context.ts');
const { computeDiff, renderAuditValue } = load('apps/web/src/lib/audit-diff.ts');

// Actual middleware, services, projections and ALS; transactional memory
// doubles only. No PrismaClient, DB, network, configuration or real records.
const ids = { row: '11111111-1111-4111-8111-111111111111', actor: '22222222-2222-4222-8222-222222222222', item: '33333333-3333-4333-8333-333333333333' };
const date = new Date('2026-10-04T10:00:00.000Z');
const actor = { userId: ids.actor, userEmail: 'qa@example.invalid', ip: '127.0.0.1', userAgent: 'Synthetic QA' };
const clinical = () => ({
  id: ids.row, patientId: 'qa-patient', personalesPatologicos: null, padecimientoActual: null,
  diagnostico: null, tratamiento: null, createdAt: date, updatedAt: date, createdBy: ids.actor, updatedBy: ids.actor,
  inheritRelatives: null, nonPathologicalPersonal: null, previousTreatment: null,
  physicalExploration: { id: ids.item, description: 'Descripción QA anterior', peso: new Prisma.Decimal('70'), talla: new Prisma.Decimal('1.75'), temperatura: new Prisma.Decimal('36.6'), fc: null, ta: null, fr: null, tallaUnidad: 'm' },
  patient: { nombre: 'Ficticio', extraPrivateProfile: 'excluded-patient-profile' },
});
const prescription = () => ({
  id: ids.row, patientId: 'qa-patient', doctorId: 'qa-doctor', notas: 'Notas QA anteriores', status: 'active', prescriptionDate: date, expiresAt: null,
  createdAt: date, updatedAt: date, createdBy: ids.actor, updatedBy: ids.actor,
  items: [{ id: ids.item, productId: null, medicineName: 'Medicina ficticia', dosage: null, frequency: null, durationDays: null, quantity: 1, instructions: null, requiresRefill: false, refillReminderDays: null, dispensed: false, dispensedAt: null, dispensedBy: null, dispensedQuantity: null, updatedAt: date, product: { extraPrivateProfile: 'excluded-product-profile' } }],
  patient: { extraPrivateProfile: 'excluded-patient-profile' }, doctor: { passwordHash: 'SYNTHETIC_HASH', extraPrivateProfile: 'excluded-doctor-profile' },
});
function clone(value) {
  if (value instanceof Date) return new Date(value);
  if (Prisma.Decimal.isDecimal(value)) return new Prisma.Decimal(value);
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  return value;
}
function select(row, fields) {
  if (!row || !fields) return clone(row);
  return Object.fromEntries(Object.entries(fields).filter(([key]) => Object.hasOwn(row, key)).map(([key, spec]) => [key,
    spec === true ? clone(row[key]) : Array.isArray(row[key]) ? row[key].map(item => select(item, spec.select)) : select(row[key], spec.select),
  ]));
}
// Match Prisma's lazy thenable boundary: the request starts when awaited.
const deferred = work => ({ then: (resolve, reject) => Promise.resolve().then(work).then(resolve, reject) });
function memory(model, initial, failAudit = false) {
  const key = model[0].toLowerCase() + model.slice(1);
  const calls = [], committed = [], errors = [];
  class Storage {
    constructor() {
      this.row = clone(initial);
      this.auditLog = { create: async () => assert.fail('Scoped audit must use the transaction writer') };
      this[key] = { findUnique: async args => { calls.push({ location: 'root', operation: 'read', args }); return select(this.row, args.select); } };
    }
    $use(fn) { this.middleware = fn; }
    async $transaction(save, options) {
      calls.push({ operation: 'transaction', options });
      const row = clone(this.row), pending = [];
      const tx = {
        $queryRaw: async () => [],
        auditLog: { create: async ({ data }) => {
          calls.push({ location: 'transaction', operation: 'audit', entity: data.entityType });
          if (failAudit) throw Error('Synthetic audit failure');
          pending.push(clone(data)); return data;
        } },
      };
      tx[key] = {
        findUnique: async args => { calls.push({ location: 'transaction', operation: 'read', args }); return select(row, args.select); },
        update: args => deferred(() => this.middleware({ model, action: 'update', args }, async () => {
          calls.push({ location: 'transaction', operation: 'update', model });
          await Promise.resolve();
          for (const [field, value] of Object.entries(args.data)) {
            if (value === undefined) continue;
            row[field] = value?.upsert ? { ...row[field], ...value.upsert.update } : clone(value);
          }
          row.updatedAt = new Date('2026-10-04T11:00:00.000Z');
          return clone(row);
        })),
      };
      tx.prescriptionItem = {
        findMany: async () => clone(row.items),
        findUnique: async ({ where }) => { calls.push({ location: 'transaction', operation: 'item-read' }); return clone(row.items.find(item => item.id === where.id)); },
        update: args => deferred(() => this.middleware({ model: 'PrescriptionItem', action: 'update', args }, async () => {
          calls.push({ location: 'transaction', operation: 'item-update' });
          const item = row.items.find(item => item.id === args.where.id);
          Object.assign(item, clone(args.data), { updatedAt: new Date('2026-10-04T11:00:00.000Z') }); return clone(item);
        })),
      };
      const result = await save(tx);
      this.row = row; committed.push(...pending); return result;
    }
  }
  const { PrismaService } = load('apps/api/src/prisma/prisma.service.ts', {
    '@prisma/client': { Prisma, PrismaClient: Storage },
    '@nestjs/common': { Injectable: () => value => value, Logger: class { error(message) { errors.push(message); } } },
    '../common/audit/audit-context': context,
    '../common/audit/sensitive-fields': sensitive,
    '../common/audit/audit-snapshot': snapshots,
  });
  const db = new PrismaService();
  const name = model === 'ClinicalHistory' ? 'ClinicalHistoriesService' : 'PrescriptionsService';
  const folder = model === 'ClinicalHistory' ? 'clinical-histories' : 'prescriptions';
  const Service = load(`apps/api/src/modules/${folder}/${folder}.service.ts`, { '../../common/audit/audit-snapshot': snapshots })[name];
  return { db, service: new Service(db), calls, committed, errors, update: dto => context.auditAls.run(actor, () => new Service(db).update(ids.row, dto, ids.actor)) };
}
const differences = (before, after) => computeDiff(before, after).map(field => field.key);

test('history description captures complete before/after with Decimal and Date inside the same transaction', async () => {
  const m = memory('ClinicalHistory', clinical());
  const response = await m.update({ physicalExploration: { description: 'Descripción QA nueva' } });
  const event = m.committed[0];
  assert.equal(event.oldValues.physicalExploration.description, 'Descripción QA anterior');
  assert.equal(event.newValues.physicalExploration.description, 'Descripción QA nueva');
  for (const side of [event.oldValues, event.newValues]) {
    assert.equal(side.physicalExploration.peso, '70'); assert.equal(side.physicalExploration.talla, '1.75');
    assert.equal(side.physicalExploration.temperatura, '36.6'); assert.equal(side.createdAt, date.toISOString());
    assert.equal(Object.hasOwn(side, 'patient'), false);
    assert.doesNotThrow(() => serializeJsonQuery({ modelName: 'AuditLog', action: 'findMany', args: { where: { newValues: { equals: side } } }, runtimeDataModel: dmmfToRuntimeDataModel(Prisma.dmmf.datamodel), clientMethod: 'auditLog.findMany', clientVersion: Prisma.prismaVersion.client, errorFormat: 'minimal', previewFeatures: [] }));
  }
  assert.deepEqual(differences(event.oldValues, event.newValues), ['physicalExploration.description', 'updatedAt']);
  assert.equal(event.userId, actor.userId); assert.equal(event.userEmail, actor.userEmail); assert.equal(event.ipAddress, actor.ip);
  assert.equal(m.calls.filter(call => call.location === 'root').length, 1);
  assert.equal(m.calls.find(call => call.operation === 'transaction').options.isolationLevel, 'Serializable');
  assert.ok(m.calls.findIndex(call => call.location === 'transaction' && call.operation === 'read') < m.calls.findIndex(call => call.operation === 'update'));
  assert.equal(response.patient.nombre, 'Ficticio'); // API response remains enriched.
  assert.equal(m.errors.length, 0);
});

test('recipe notes and identical submitted items do not turn intact relationships into additions', async () => {
  const state = prescription(), m = memory('Prescription', state);
  await m.update({ notas: 'Notas QA nuevas', items: [{ id: ids.item, medicineName: state.items[0].medicineName, dosage: null }] });
  const event = m.committed.find(event => event.entityType === 'prescription');
  assert.equal(event.oldValues.notas, 'Notas QA anteriores'); assert.equal(event.newValues.notas, 'Notas QA nuevas');
  assert.deepEqual(event.oldValues.items, event.newValues.items);
  assert.deepEqual(differences(event.oldValues, event.newValues), ['notas', 'updatedAt']);
  for (const side of [event.oldValues, event.newValues]) {
    assert.equal(Object.hasOwn(side, 'patient'), false); assert.equal(Object.hasOwn(side, 'doctor'), false);
    assert.equal(Object.hasOwn(side.items[0], 'product'), false);
    assert.equal(side.prescriptionDate, date.toISOString());
  }
  assert.equal(m.calls.filter(call => call.location === 'root').length, 1);
  assert.ok(m.calls.findIndex(call => call.operation === 'read' && call.location === 'transaction') < m.calls.findIndex(call => call.operation === 'item-update'));
  assert.ok(m.committed.some(event => event.entityType === 'prescriptionItem' && event.userId === actor.userId));
  assert.equal(m.errors.length, 0);
});

test('aggregate edit and its audit roll back together if the transactional audit fails', async () => {
  for (const [model, row, dto] of [['ClinicalHistory', clinical(), { diagnostico: 'QA' }], ['Prescription', prescription(), { notas: 'QA' }]]) {
    const m = memory(model, row, true);
    await assert.rejects(m.update(dto), /Synthetic audit failure/);
    assert.deepEqual(m.db.row, row); assert.equal(m.committed.length, 0);
  }
});

test('parallel request contexts keep their before-state, transaction writer and actor isolated', async () => {
  const a = memory('ClinicalHistory', clinical()), b = memory('ClinicalHistory', { ...clinical(), diagnostico: 'Otra historia QA' });
  const other = { ...actor, userId: '44444444-4444-4444-8444-444444444444', userEmail: 'other@example.invalid' };
  await Promise.all([a.update({ diagnostico: 'QA A' }), context.auditAls.run(other, () => b.service.update(ids.row, { diagnostico: 'QA B' }, other.userId))]);
  assert.equal(a.committed[0].userId, actor.userId); assert.equal(b.committed[0].userId, other.userId);
  assert.equal(a.committed[0].oldValues.diagnostico, null); assert.equal(b.committed[0].oldValues.diagnostico, 'Otra historia QA');
  assert.equal(a.committed[0].newValues.diagnostico, 'QA A'); assert.equal(b.committed[0].newValues.diagnostico, 'QA B');
});

test('projection omits unapproved profiles, normalizes item order and masking remains active', () => {
  const row = prescription(); row.items.push({ ...row.items[0], id: '00000000-0000-4000-8000-000000000000' });
  const a = sensitive.maskSensitive(snapshots.projectAuditSnapshot('Prescription', row));
  const b = sensitive.maskSensitive(snapshots.projectAuditSnapshot('Prescription', { ...row, items: [...row.items].reverse() }));
  assert.deepEqual(a, b); assert.equal(JSON.stringify(a).includes('excluded-'), false);
  const user = sensitive.maskSensitive(snapshots.projectAuditSnapshot('User', { passwordHash: 'SYNTHETIC_HASH', createdAt: date }));
  assert.equal(user.passwordHash, '***'); assert.equal(user.createdAt, date.toISOString());
});

test('legacy missing keys render No capturado while explicit null stays distinct, without backfilling', () => {
  const before = { id: ids.row }, after = { id: ids.row, physicalExploration: { description: 'Texto QA actual', peso: '70', talla: '1.75' } };
  const original = JSON.stringify({ before, after });
  const [missing] = computeDiff(before, after);
  assert.equal(missing.beforeCaptured, false); assert.equal(missing.afterCaptured, true);
  assert.equal(renderAuditValue(missing.before, missing.beforeCaptured), 'No capturado');
  const [cleared] = computeDiff({ description: null }, { description: 'QA' });
  assert.equal(cleared.beforeCaptured, true); assert.equal(renderAuditValue(cleared.before, cleared.beforeCaptured), '—');
  const [removed] = computeDiff({ description: 'QA' }, {});
  assert.equal(removed.afterCaptured, false); assert.equal(renderAuditValue(removed.after, removed.afterCaptured), 'No capturado');
  const { Diff } = load('apps/web/src/app/dashboard/settings/audit-logs/page.tsx', {
    '@/hooks/use-audit-logs': {}, '@/lib/audit-labels': load('apps/web/src/lib/audit-labels.ts'),
  }, 'export { Diff };');
  const html = renderToStaticMarkup(Diff({ before, after }));
  assert.ok(html.includes('No capturado')); assert.ok(html.includes('Texto QA actual'));
  assert.equal(JSON.stringify({ before, after }), original);
});

test('diff ignores object key order and intact values, shows only the changed nested description and date', () => {
  const before = { physicalExploration: { peso: '70', description: 'QA anterior', talla: '1.75' }, flag: false, count: 0, empty: '', updatedAt: date.toISOString() };
  const after = { empty: '', count: 0, flag: false, physicalExploration: { talla: '1.75', description: 'QA nueva', peso: '70' }, updatedAt: '2026-10-04T11:00:00.000Z' };
  const fields = computeDiff(before, after);
  assert.deepEqual(fields.map(field => field.key), ['physicalExploration.description', 'updatedAt']);
  assert.equal(fields[0].before, 'QA anterior'); assert.equal(fields[0].after, 'QA nueva');
  assert.equal(fields[1].before, date.toISOString());
  assert.equal(renderAuditValue(false), 'false'); assert.equal(renderAuditValue(0), '0');
  assert.equal(renderAuditValue({ a: 'QA' }), '{\n  "a": "QA"\n}');
});
