const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');
const { load } = require('./form-test-harness.cjs');
const snapshots = load('apps/api/src/common/audit/audit-snapshot.ts');
const context = load('apps/api/src/common/audit/audit-context.ts');
const sensitive = load('apps/api/src/common/audit/sensitive-fields.ts', { '@prisma/client': { Prisma } });
const uuid = n => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const ids = { actor: uuid(1), product: uuid(2), item: uuid(3), rx: uuid(4), other: uuid(5) };
const clone = value => structuredClone(value);
function select(row, fields) {
  if (row == null || !fields) return clone(row);
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key,
    value === true ? clone(row[key]) : Array.isArray(row[key]) ? row[key].map(item => select(item, value.select)) : select(row[key], value.select),
  ]));
}
const deferred = work => ({ then: (ok, bad) => Promise.resolve().then(work).then(ok, bad) });

// Actual services, middleware, ALS and validation; storage is transactional
// memory only. SQL lock calls are recorded, not executed or claimed as SQL QA.
function fixture() {
  const calls = [];
  class Storage {
    constructor() {
      this.state = { counter: 100, stock: { [ids.product]: 10 }, deliveries: [], lines: [], movements: [], audits: [],
        products: [{ id: ids.product, name: 'Envase ficticio', sku: 'QA-A', stockUnit: 'frasco', content: 60, unit: 'ml', isActive: true, requiresPrescription: false, unitPrice: 123, secretExtra: 'EXCLUDED' }],
        rx: { id: ids.rx, status: 'active', expiresAt: null, notas: 'EXCLUDED clinical notes', patient: { id: uuid(7), nombre: 'Ficticio', apellido: 'QA', deletedAt: null, email: 'EXCLUDED' } },
        items: [{ id: ids.item, prescriptionId: ids.rx, productId: ids.product, medicineName: 'Nombre clínico ficticio', quantity: 1, fulfillmentQuantity: 3, dispensed: false }],
      };
      this.queue = Promise.resolve(); this.failAudit = false; this.failMovement = 0; this.conflicts = 0;
      this.auditLog = { create: async () => assert.fail('Operational audits must use the transaction writer') };
      for (const model of ['product', 'prescription', 'delivery', 'prescriptionItem']) this[model] = this.delegate(model, () => this.state, false);
    }
    $use(middleware) { this.middleware = middleware; }
    row(model, state, where = {}) {
      if (model === 'delivery') {
        const row = state.deliveries.find(row => where.id ? row.id === where.id : row.idempotencyKey === where.idempotencyKey);
        return row && { ...row, reversal: state.deliveries.find(d => d.reversalOfId === row.id) ?? null, lines: state.lines.filter(line => line.deliveryId === row.id) };
      }
      if (model === 'product') {
        const row = state.products.find(row => row.id === where.id);
        return row && { ...row, stockBalance: { currentQuantity: state.stock[row.id] ?? 0 } };
      }
      if (model === 'stockBalance') return { id: uuid(99), productId: where.productId, currentQuantity: state.stock[where.productId] };
      if (model === 'prescriptionItem') {
        const item = state.items.find(item => item.id === where.id);
        return item && { ...item, deliveryLines: state.lines.filter(line => line.prescriptionItemId === item.id) };
      }
      if (model === 'prescription') return where.id === state.rx.id ? { ...state.rx, items: state.items.map(item => ({ ...item,
        product: this.row('product', state, { id: item.productId }),
        deliveryLines: state.lines.filter(line => line.prescriptionItemId === item.id).map(line => ({ ...line, delivery: state.deliveries.find(d => d.id === line.deliveryId) })),
      })) } : null;
      return null;
    }
    delegate(model, state, transaction) {
      const read = args => { calls.push({ location: transaction ? 'tx' : 'root', model, operation: 'read' }); return select(this.row(model, state(), args.where), args.select); };
      const write = (action, args, work) => deferred(() => this.middleware({ model: model[0].toUpperCase() + model.slice(1), action, args }, async () => {
        calls.push({ location: 'tx', model, operation: action }); return work(state());
      }));
      return {
        findUnique: async args => read(args),
        findUniqueOrThrow: async args => { const row = read(args); if (!row) throw Error('Missing fixture row'); return row; },
        count: async ({ where = {} } = {}) => model === 'delivery' ? state().deliveries.filter(d => !where.prescriptionId || d.prescriptionId === where.prescriptionId).length : state().lines.filter(l => !where.productId || l.productId === where.productId).length,
        findMany: async ({ where = {}, select: fields, skip = 0, take = 30 } = {}) => {
          if (model === 'prescriptionItem') return state().items.filter(i => i.prescriptionId === where.prescriptionId).map(i => this.row(model, state(), { id: i.id }));
          if (model === 'delivery') return state().deliveries.filter(d => !where.prescriptionId || d.prescriptionId === where.prescriptionId).slice(skip, skip + take).map(d => select(this.row(model, state(), { id: d.id }), fields));
          return [];
        },
        create: args => write('create', args, s => {
          const row = { id: uuid(s.counter++), createdAt: new Date('2026-10-05T10:00:00Z'), physicalStockConfirmed: false, ...clone(args.data) };
          if (model === 'delivery') {
            if (s.deliveries.some(d => d.idempotencyKey === row.idempotencyKey || (row.reversalOfId && d.reversalOfId === row.reversalOfId))) throw Object.assign(Error('Duplicate'), { code: 'P2002' });
            s.deliveries.push(row);
          }
          if (model === 'stockMovement') { if (this.failMovement && s.movements.length + 1 === this.failMovement) throw Error('Synthetic movement failure'); s.movements.push(row); }
          if (model === 'deliveryLine') s.lines.push(row);
          return clone(row);
        }),
        updateMany: args => write('updateMany', args, s => {
          assert.equal(model, 'stockBalance'); const product = args.where.productId;
          if (args.data.currentQuantity.decrement !== undefined) {
            if (s.stock[product] === undefined || s.stock[product] < args.where.currentQuantity.gte) return { count: 0 };
            s.stock[product] -= args.data.currentQuantity.decrement;
          } else {
            if (s.stock[product] === undefined || s.stock[product] > args.where.currentQuantity.lte) return { count: 0 };
            s.stock[product] += args.data.currentQuantity.increment;
          }
          return { count: 1 };
        }),
        update: args => write('update', args, s => {
          if (model === 'stockBalance') { s.stock[args.where.productId] += args.data.currentQuantity.increment; return this.row(model, s, args.where); }
          if (model === 'prescriptionItem') { Object.assign(s.items.find(i => i.id === args.where.id), args.data); return this.row(model, s, args.where); }
          if (model === 'prescription') { Object.assign(s.rx, args.data); return this.row(model, s, args.where); }
          if (model === 'product') { Object.assign(s.products.find(p => p.id === args.where.id), args.data); return this.row(model, s, args.where); }
        }),
        deleteMany: args => write('deleteMany', args, () => assert.fail('Delivered items must not be deleted')),
        delete: args => write('delete', args, () => assert.fail('Delivered prescriptions must not be deleted')),
      };
    }
    async $transaction(save, options) {
      assert.ok(!options || options.isolationLevel === 'Serializable');
      let release; const previous = this.queue; this.queue = new Promise(resolve => release = resolve); await previous;
      try {
        if (this.conflicts-- > 0) throw Object.assign(Error('Synthetic serialization conflict'), { code: 'P2034' });
        const pending = clone(this.state);
        const tx = { $queryRaw: async (strings, ...values) => { calls.push({ operation: 'lock', sql: strings.join('?'), values }); return []; },
          auditLog: { create: async ({ data }) => { if (this.failAudit) throw Error('Synthetic audit failure'); pending.audits.push(clone(data)); return data; } },
        };
        for (const model of ['delivery', 'deliveryLine', 'product', 'stockBalance', 'stockMovement', 'prescription', 'prescriptionItem']) tx[model] = this.delegate(model, () => pending, true);
        const result = await save(tx); this.state = pending; return result;
      } finally { release(); }
    }
  }
  const { PrismaService } = load('apps/api/src/prisma/prisma.service.ts', { '@prisma/client': { Prisma, PrismaClient: Storage },
    '@nestjs/common': { Injectable: () => v => v, Logger: class { error() { assert.fail('Scoped audit may not fail silently'); } } },
    '../common/audit/audit-context': context, '../common/audit/sensitive-fields': sensitive, '../common/audit/audit-snapshot': snapshots,
  });
  const db = new PrismaService();
  const { DeliveriesService } = load('apps/api/src/modules/deliveries/deliveries.service.ts', { '../../common/audit/audit-snapshot': snapshots, '../../common/audit/sensitive-fields': sensitive });
  const service = new DeliveriesService(db);
  const run = fn => context.auditAls.run({ userId: ids.actor, userEmail: 'qa@example.invalid', ip: '127.0.0.1' }, fn);
  return { db, service, calls, confirm: (dto, key = uuid(10)) => run(() => service.confirm(dto, key, ids.actor)), reverse: (id, dto, key = uuid(11)) => run(() => service.reverse(id, dto, key, ids.actor)) };
}
const direct = quantity => ({ source: 'direct', lines: [{ productId: ids.product, quantity }] });
const prescribed = quantity => ({ source: 'prescription', prescriptionId: ids.rx, lines: [{ prescriptionItemId: ids.item, quantity }] });
const reversal = { reason: 'Corrección ficticia; envases físicamente disponibles', physicalStockConfirmed: true };

test('direct delivery discounts once, keeps linked movement and audit in the transaction, without patient/payment data', async () => {
  const f = fixture(), row = await f.confirm(direct(2));
  assert.equal(f.db.state.stock[ids.product], 8); assert.equal(row.lines[0].quantity, 2);
  assert.equal(row.lines[0].stockUnit, 'frasco'); assert.equal(row.lines[0].presentation, '60 ml');
  assert.equal(row.lines[0].stockMovementId, f.db.state.movements[0].id);
  assert.equal(f.db.state.movements[0].relatedEntityId, row.id);
  assert.ok(f.db.state.audits.length >= 4); assert.ok(f.db.state.audits.every(a => a.userId === ids.actor));
  assert.equal(JSON.stringify(row).includes('EXCLUDED'), false); assert.equal(Object.hasOwn(row, 'requestHash'), false);
  assert.equal((await f.confirm(direct(2))).id, row.id); assert.equal(f.db.state.stock[ids.product], 8);
  assert.equal(f.db.state.deliveries.length, 1); assert.equal(f.db.state.movements.length, 1);
  await assert.rejects(f.confirm(direct(3)), /clave/); assert.equal(f.db.state.stock[ids.product], 8);
});

test('prescribed partials use the explicit target, preserve clinical quantity, and project only fulfillment fields', async () => {
  const f = fixture(); await f.confirm(prescribed(1));
  let summary = await f.service.fulfillment(ids.rx);
  assert.equal(summary.items[0].delivered, 1); assert.equal(summary.items[0].pending, 2); assert.equal(summary.items[0].state, 'partial');
  assert.equal(JSON.stringify(summary).includes('EXCLUDED'), false); assert.equal(Object.hasOwn(summary, 'notas'), false);
  await f.confirm(prescribed(2), uuid(12)); summary = await f.service.fulfillment(ids.rx);
  assert.equal(summary.items[0].pending, 0); assert.equal(summary.items[0].state, 'delivered');
  assert.equal(f.db.state.stock[ids.product], 7); assert.equal(f.db.state.items[0].quantity, 1);
  await assert.rejects(f.confirm(prescribed(1), uuid(13))); assert.equal(f.db.state.stock[ids.product], 7);
  assert.ok(f.calls.some(c => c.sql?.includes('prescriptions') && c.sql.includes('FOR UPDATE')));
});

test('concurrent same-key retries discount once, different keys cannot exceed the same pending target', async () => {
  const f = fixture(); const rows = await Promise.all([f.confirm(prescribed(2)), f.confirm(prescribed(2))]);
  assert.equal(rows[0].id, rows[1].id); assert.equal(f.db.state.stock[ids.product], 8);
  const outcomes = await Promise.allSettled([f.confirm(prescribed(1), uuid(12)), f.confirm(prescribed(1), uuid(13))]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1); assert.equal(f.db.state.stock[ids.product], 7);
});

test('failed audit, second product shortage, and late movement failure roll back all command records', async () => {
  for (const failure of ['audit', 'stock', 'movement']) {
    const f = fixture();
    f.db.state.products.push({ ...f.db.state.products[0], id: ids.other, sku: 'QA-B' }); f.db.state.stock[ids.other] = failure === 'stock' ? 0 : 4;
    if (failure === 'audit') f.db.failAudit = true;
    if (failure === 'movement') f.db.failMovement = 2;
    const before = clone(f.db.state);
    await assert.rejects(f.confirm({ source: 'direct', lines: [{ productId: ids.product, quantity: 1 }, { productId: ids.other, quantity: 1 }] }));
    assert.deepEqual(f.db.state, before);
  }
});

test('full reversal requires physical acknowledgment, is unique, restores stock and pending, preserves original snapshots', async () => {
  const f = fixture(), row = await f.confirm(prescribed(2));
  const original = clone(f.db.state.deliveries[0]), originalLine = clone(f.db.state.lines[0]);
  await assert.rejects(f.reverse(row.id, { ...reversal, physicalStockConfirmed: false }));
  await assert.rejects(f.reverse(row.id, { ...reversal, reason: ' ' }));
  assert.equal(f.db.state.stock[ids.product], 8);
  const reversed = await f.reverse(row.id, reversal);
  assert.equal(reversed.reversalOfId, row.id); assert.equal(reversed.physicalStockConfirmed, true);
  assert.equal((await f.reverse(row.id, reversal)).id, reversed.id);
  await assert.rejects(f.reverse(row.id, reversal, uuid(14)), /revertida/);
  assert.equal(f.db.state.stock[ids.product], 10); assert.equal((await f.service.fulfillment(ids.rx)).items[0].pending, 3);
  assert.deepEqual(f.db.state.deliveries[0], original); assert.deepEqual(f.db.state.lines[0], originalLine);
  assert.equal((await f.service.get(row.id)).reversal.id, reversed.id);
});

test('legacy or ambiguous targets, inactive/expired/cancelled prescriptions and direct restricted products are blocked', async () => {
  for (const change of [f => f.db.state.items[0].fulfillmentQuantity = null, f => f.db.state.items[0].productId = null,
    f => f.db.state.items[0].dispensed = true, f => f.db.state.products[0].stockUnit = null,
    f => f.db.state.products[0].isActive = false, f => f.db.state.rx.status = 'completed',
    f => f.db.state.rx.status = 'cancelled', f => f.db.state.rx.expiresAt = new Date('2000-01-01')]) {
    const f = fixture(); change(f); await assert.rejects(f.confirm(prescribed(1))); assert.equal(f.db.state.stock[ids.product], 10);
  }
  const f = fixture(); f.db.state.products[0].requiresPrescription = true;
  await assert.rejects(f.confirm(direct(1)), /requiere/); await f.confirm(prescribed(1));
});

test('shape, quantities, duplicate lines, wrong item and idempotency UUID are checked before writing', async () => {
  const f = fixture();
  for (const dto of [direct(0), direct(1.5), direct(2147483648), { ...direct(1), prescriptionId: ids.rx },
    { source: 'prescription', prescriptionId: ids.rx, lines: [{ prescriptionItemId: ids.other, quantity: 1 }] },
    { source: 'prescription', prescriptionId: ids.rx, lines: [{ prescriptionItemId: ids.item, productId: ids.product, quantity: 1 }] },
    { source: 'direct', lines: [direct(1).lines[0], direct(1).lines[0]] }]) await assert.rejects(f.confirm(dto));
  await assert.rejects(f.confirm(direct(1), 'invalid'));
  assert.equal(f.db.state.stock[ids.product], 10); assert.equal(f.db.state.deliveries.length, 0);
});

test('serialization retry is bounded and identical reordered multi-line payload reuses its receipt', async () => {
  const f = fixture(); f.db.conflicts = 2;
  await f.confirm(direct(1)); assert.equal(f.db.state.stock[ids.product], 9);
  const g = fixture(); g.db.conflicts = 4;
  await assert.rejects(g.confirm(direct(1)), /Otra operación/); assert.equal(g.db.state.stock[ids.product], 10);
  f.db.state.products.push({ ...f.db.state.products[0], id: ids.other }); f.db.state.stock[ids.other] = 5;
  const dto = { source: 'direct', lines: [{ productId: ids.product, quantity: 1 }, { quantity: 2, productId: ids.other }] };
  const row = await f.confirm(dto, uuid(15));
  assert.equal((await f.confirm({ ...dto, lines: [...dto.lines].reverse().map(l => ({ quantity: l.quantity, productId: l.productId })) }, uuid(15))).id, row.id);
});

test('delivered and fully reversed prescription items remain immutable; prescription deletion is protected', async () => {
  const f = fixture(); const row = await f.confirm(prescribed(1)); await f.reverse(row.id, reversal);
  const { PrescriptionsService } = load('apps/api/src/modules/prescriptions/prescriptions.service.ts', { '../../common/audit/audit-snapshot': snapshots });
  const service = new PrescriptionsService(f.db);
  await assert.rejects(service.update(ids.rx, { items: [] }, ids.actor), /entregas/);
  await assert.rejects(service.update(ids.rx, { items: [{ id: ids.item, medicineName: 'Otro nombre' }] }, ids.actor), /entregas/);
  await assert.rejects(service.remove(ids.rx), /entregas/);
  assert.equal(f.db.state.items.length, 1); assert.equal(f.db.state.stock[ids.product], 10);
});

test('unique-key race recovery returns only the matching committed receipt and does not swallow unrelated errors', async () => {
  const f = fixture(), original = await f.confirm(direct(2));
  f.db.$transaction = async () => { throw Object.assign(Error('Synthetic unique race'), { code: 'P2002' }); };
  assert.equal((await f.confirm(direct(2))).id, original.id);
  await assert.rejects(f.confirm(direct(3)), /clave/);
  await assert.rejects(f.confirm(direct(2), uuid(70)), e => e.code === 'P2002');
  assert.equal(f.db.state.stock[ids.product], 8); assert.equal(f.db.state.deliveries.length, 1);
});

test('reversal failure and integer overflow leave stock, original and reversal ledger untouched', async () => {
  for (const failure of ['audit', 'overflow', 'movement']) {
    const f = fixture(), row = await f.confirm(direct(2));
    if (failure === 'audit') f.db.failAudit = true;
    if (failure === 'overflow') f.db.state.stock[ids.product] = 2147483647;
    if (failure === 'movement') f.db.failMovement = 2;
    const before = clone(f.db.state);
    await assert.rejects(f.reverse(row.id, reversal)); assert.deepEqual(f.db.state, before);
  }
});

test('prescription target validation rejects implicit units, and product presentation cannot change after authorization', async () => {
  const f = fixture();
  const { PrescriptionsService } = load('apps/api/src/modules/prescriptions/prescriptions.service.ts', { '../../common/audit/audit-snapshot': snapshots });
  const rx = new PrescriptionsService(f.db);
  f.db.state.products[0].stockUnit = null;
  await assert.rejects(rx.update(ids.rx, { items: [{ id: ids.item, medicineName: f.db.state.items[0].medicineName, fulfillmentQuantity: 4 }] }, ids.actor), /unidad física/);
  assert.equal(f.db.state.items[0].fulfillmentQuantity, 3);
  f.db.state.products[0].stockUnit = 'frasco';
  await assert.rejects(rx.update(ids.rx, { items: [{ id: ids.item, medicineName: f.db.state.items[0].medicineName, fulfillmentQuantity: 2147483648 }] }, ids.actor), /cantidad entera/);
  const { ProductsService } = load('apps/api/src/modules/products/products.service.ts');
  f.db.delegate = ((delegate) => function(model, state, transaction) {
    const result = delegate.call(this, model, state, transaction);
    if (model === 'prescriptionItem') result.count = async () => state().items.filter(i => i.fulfillmentQuantity != null).length;
    return result;
  })(f.db.delegate);
  await assert.rejects(new ProductsService(f.db).update(ids.product, { stockUnit: 'caja' }, ids.actor), /presentación/);
  assert.equal(f.db.state.products[0].stockUnit, 'frasco');
});
