const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, setup, nodes, find, event } = require('./form-test-harness.cjs');
const { readDeliveryCommand } = load('apps/web/src/lib/delivery-command.ts');
const id = n => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const product = { id: id(2), name: 'Envase QA', sku: 'QA-FRASCO', isActive: true, stockUnit: 'frasco', requiresPrescription: false, stockBalance: { currentQuantity: 10 } };
const receipt = { id: id(3), kind: 'delivery', source: 'direct', reversal: null, createdAt: '2026-10-05T10:00:00Z', lines: [{ id: id(4), productId: product.id, productName: product.name, stockUnit: product.stockUnit, quantity: 1 }] };
class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
function storage() { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; }
function environment(fn, saved = storage()) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'crypto'), previousStorage = globalThis.sessionStorage;
  let counter = 20;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => id(counter++) } });
  globalThis.sessionStorage = saved;
  return Promise.resolve().then(() => fn(saved)).finally(() => { if (previous) Object.defineProperty(globalThis, 'crypto', previous); else delete globalThis.crypto; if (previousStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previousStorage; });
}
function workspace(post, role = 'receptionist', historyRows = [], props = {}) {
  const { DeliveryWorkspace } = load('apps/web/src/components/inventory/delivery-workspace.tsx', {
    '@/lib/api': { api: { post }, ApiError }, '@/lib/delivery-command': { readDeliveryCommand },
    '@/store/auth': { useAuthStore: selector => selector({ user: { id: id(1) } }) },
    '@/hooks/use-has-role': { useHasRole: (...allowed) => allowed.includes(role) },
    '@/hooks/use-inventory': { useProducts: () => ({ data: { data: [product], meta: { total: 1 } }, refetch() {} }) },
    '@/hooks/use-deliveries': {
      useFulfillment: () => ({ data: null }), useRefreshDeliveries: () => () => {},
      useDeliveries: () => ({ data: { data: historyRows, meta: { total: historyRows.length, totalPages: 1 } }, refetch() {} }),
    },
  });
  return setup(DeliveryWorkspace, props);
}
function add(p) { find(p.tree, n => n.props.children === 'Agregar').props.onClick(); p.tree = p.rerender(); }
function form(p, index = 0) { return nodes(p.tree).filter(n => n.type === 'form')[index]; }
function text(tree) { return nodes(tree).flatMap(n => typeof n.props.children === 'string' ? n.props.children : []).join(' '); }

test('UI duplicate submit sends once; timeout freezes draft, remount restores and retries identical body/key', async () => environment(async saved => {
  const calls = []; let reject;
  const p = workspace((url, body, options) => { calls.push({ url, body, key: options.headers['Idempotency-Key'] }); assert.ok(saved.values.size, 'intent is persisted before transport'); return new Promise((_, bad) => reject = bad); });
  add(p);
  const first = form(p).props.onSubmit(event); await form(p).props.onSubmit(event);
  assert.equal(calls.length, 1); reject(new TypeError('Synthetic network timeout')); await first;
  p.tree = p.rerender(); assert.ok(readDeliveryCommand([...saved.values.values()][0]));
  assert.equal(find(p.tree, n => n.type === 'fieldset').props.disabled, true);
  const restored = workspace(async (url, body, options) => { calls.push({ url, body, key: options.headers['Idempotency-Key'] }); return receipt; });
  restored.tree = restored.rerender();
  await find(restored.tree, n => n.props.children === 'Reintentar operación pendiente').props.onClick();
  restored.tree = restored.rerender();
  assert.deepEqual(calls[1], calls[0]); assert.equal(saved.values.size, 0);
  assert.ok(text(restored.tree).includes('Entrega confirmada'));
  assert.equal(Object.hasOwn(calls[0].body, 'patientId'), false); assert.equal(Object.hasOwn(calls[0].body, 'amount'), false);
}));

test('uncertain HTTP responses preserve the key; definitive rejection clears it and permits a new corrected attempt', async () => environment(async saved => {
  for (const status of [500, 403, 408, 429]) {
    saved.values.clear(); const calls = [];
    const p = workspace(async (_, body, options) => { calls.push({ body, key: options.headers['Idempotency-Key'] }); throw new ApiError('Synthetic uncertain response', status); });
    add(p); await form(p).props.onSubmit(event); p.tree = p.rerender();
    await find(p.tree, n => n.props.children === 'Reintentar operación pendiente').props.onClick();
    assert.deepEqual(calls[0], calls[1]); assert.equal(saved.values.size, 1);
  }
  saved.values.clear(); const keys = [];
  const p = workspace(async (_, body, options) => { keys.push(options.headers['Idempotency-Key']); throw new ApiError('Stock insuficiente', 409); });
  add(p); await form(p).props.onSubmit(event); p.tree = p.rerender(); assert.equal(saved.values.size, 0);
  await form(p).props.onSubmit(event); assert.equal(keys.length, 2); assert.notEqual(keys[0], keys[1]);
}));

test('storage failure or corrupt pending intent prevents a new request and never discards an unknown result', async () => {
  const broken = storage(); broken.setItem = () => { throw Error('Synthetic storage unavailable'); };
  await environment(async () => { const p = workspace(() => assert.fail('No intent persisted: do not send')); add(p); await form(p).props.onSubmit(event); assert.ok(text(p.rerender()).includes('Synthetic storage unavailable')); }, broken);
  await environment(async saved => {
    saved.values.set(`capillaris-delivery-pending:${id(1)}`, '{broken');
    const p = workspace(() => assert.fail('Unreadable pending result: do not send')); add(p); await form(p).props.onSubmit(event);
    assert.equal(saved.values.size, 1); assert.ok(text(p.rerender()).includes('No se puede recuperar'));
  });
});

test('UI reversal belongs only to admin, requires reason/physical acknowledgment and preserves its key after timeout', async () => environment(async saved => {
  for (const role of ['receptionist', 'inventory_manager']) {
    const p = workspace(() => assert.fail('Must not reverse'), role, [receipt]);
    assert.equal(nodes(p.tree).some(n => n.type === 'Button' && n.props.children === 'Revertir entrega completa'), false);
  }
  const calls = [];
  const p = workspace(async (url, body, options) => { calls.push({ url, body, key: options.headers['Idempotency-Key'] }); throw new TypeError('Synthetic timeout'); }, 'admin', [receipt]);
  find(p.tree, n => n.props.children === 'Revertir entrega completa').props.onClick(); p.tree = p.rerender();
  await form(p, 1).props.onSubmit(event); assert.equal(calls.length, 0);
  find(p.tree, n => n.props.id === 'delivery-reversal-reason').props.onChange({ target: { value: 'Envases QA disponibles' } });
  find(p.tree, n => n.props.type === 'checkbox').props.onChange({ target: { checked: true } }); p.tree = p.rerender();
  await form(p, 1).props.onSubmit(event); p.tree = p.rerender();
  await find(p.tree, n => n.props.children === 'Reintentar operación pendiente').props.onClick();
  assert.deepEqual(calls[0], calls[1]); assert.equal(calls[0].url, `/deliveries/${receipt.id}/reversal`);
  assert.equal(calls[0].body.physicalStockConfirmed, true); assert.equal(saved.values.size, 1);
}));

test('pending intent validator rejects malformed references, fractional packages and false physical claims', () => {
  assert.equal(readDeliveryCommand(null), null);
  for (const body of [{ key: id(1), operation: 'confirm', body: { source: 'direct', lines: [{ productId: id(2), quantity: 1.5 }] } },
    { key: id(1), operation: 'confirm', body: { source: 'prescription', lines: [{ prescriptionItemId: id(2), quantity: 1 }] } },
    { key: id(1), operation: 'reverse', id: id(2), body: { reason: 'QA', physicalStockConfirmed: false } }]) assert.throws(() => readDeliveryCommand(JSON.stringify(body)));
});
