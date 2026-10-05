const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('reflect-metadata');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { Reflector } = require('@nestjs/core');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const { RolesGuard } = require('../../apps/api/src/common/guards/roles.guard');
const { DeliveriesController, FulfillmentController } = require('../../apps/api/src/modules/deliveries/deliveries.controller');
const { PrescriptionsController } = require('../../apps/api/src/modules/prescriptions/prescriptions.controller');
const { InventoryController } = require('../../apps/api/src/modules/inventory/inventory.controller');
const { CreateDeliveryDto, ReverseDeliveryDto } = require('../../apps/api/src/modules/deliveries/dto/delivery.dto');
const { InventoryService } = require('../../apps/api/src/modules/inventory/inventory.service');
const { restrictedWorkspace } = require('../../apps/web/src/lib/roles');
const guard = new RolesGuard(new Reflector());
const can = (Controller, method, roles) => guard.canActivate({ getHandler: () => Controller.prototype[method], getClass: () => Controller, switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }) });
const uuid = '11111111-1111-4111-8111-111111111111';

test('actual route metadata grants receipt/inventory confirmation, admin-only reversal and no broader clinical/write access', () => {
  for (const role of ['admin', 'receptionist', 'inventory_manager', 'doctor', 'nurse', 'treatment_staff', 'unknown']) {
    for (const method of ['create', 'get', 'list', 'search']) assert.equal(can(DeliveriesController, method, [role]), ['admin', 'receptionist', 'inventory_manager'].includes(role), `${role}:${method}`);
    assert.equal(can(DeliveriesController, 'reverse', [role]), role === 'admin', `${role}:reverse`);
    assert.equal(can(FulfillmentController, 'get', [role]), ['admin', 'doctor', 'receptionist', 'inventory_manager'].includes(role));
  }
  assert.equal(can(PrescriptionsController, 'findOne', ['inventory_manager']), false);
  assert.equal(can(PrescriptionsController, 'update', ['receptionist']), false);
  assert.equal(can(InventoryController, 'createMovement', ['receptionist']), false);
  assert.equal(can(DeliveriesController, 'create', []), false);
  for (const roles of [['admin', 'nurse'], ['inventory_manager', 'treatment_staff'], ['receptionist', 'nurse', 'treatment_staff']]) {
    for (const method of ['create', 'reverse', 'list', 'search', 'get']) assert.equal(can(DeliveriesController, method, roles), false);
    assert.equal(can(FulfillmentController, 'get', roles), false);
    assert.equal(restrictedWorkspace(roles, '/dashboard/deliveries').allowed, false);
  }
});

test('real DTO pipeline rejects payments, fractions, empty lines and false/string physical acknowledgments', () => {
  const validate = (Class, body) => validateSync(plainToInstance(Class, body, { enableImplicitConversion: true }), { whitelist: true, forbidNonWhitelisted: true });
  const valid = { source: 'direct', lines: [{ productId: uuid, quantity: 2 }] };
  assert.equal(validate(CreateDeliveryDto, valid).length, 0);
  for (const body of [{ ...valid, amount: 50 }, { ...valid, paymentMethod: 'cash' }, { ...valid, lines: [] }, { ...valid, lines: [{ productId: uuid, quantity: 0 }] }, { ...valid, lines: [{ productId: uuid, quantity: 1.2 }] }, { ...valid, lines: [{ productId: uuid, quantity: 1, unitPrice: 20 }] }]) assert.ok(validate(CreateDeliveryDto, body).length);
  assert.equal(validate(ReverseDeliveryDto, { reason: 'Envases físicamente disponibles', physicalStockConfirmed: true }).length, 0);
  for (const value of [false, 'false', 'true', 1, null, undefined]) assert.ok(validate(ReverseDeliveryDto, { reason: 'QA', physicalStockConfirmed: value }).length, String(value));
});

test('generic stock command cannot forge a delivery reference or act as its reversal', async () => {
  const service = new InventoryService({ product: { findUnique: () => assert.fail('Reject before storage access') } });
  await assert.rejects(service.createMovement({ productId: uuid, relatedEntityType: 'delivery', relatedEntityId: uuid, movementType: 'entrada', reason: 'devolucion', quantity: 1 }, uuid), e => e.getStatus() === 400);
});
