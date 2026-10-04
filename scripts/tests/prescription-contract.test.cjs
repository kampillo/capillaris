const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('reflect-metadata');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { ValidationPipe } = require('@nestjs/common');
const { CreatePrescriptionDto } = require('../../apps/api/src/modules/prescriptions/dto/create-prescription.dto');
const { UpdatePrescriptionDto } = require('../../apps/api/src/modules/prescriptions/dto/update-prescription.dto');
const { load, setup, find, emptyQuery, event } = require('./form-test-harness.cjs');

// Real DTOs, decorator metadata and Nest validation with the options in main.ts.
// Form/hooks/service sources run with UI and storage doubles; no application
// bootstrap, network, existing records, credentials or database are accessed.
const pipe = new ValidationPipe({
  whitelist: true, transform: true, forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: true },
});
const ids = {
  patient: '11111111-1111-4111-8111-111111111111',
  doctor: '22222222-2222-4222-8222-222222222222',
  prescription: '33333333-3333-4333-8333-333333333333',
  dispensed: '44444444-4444-4444-8444-444444444444',
  editable: '55555555-5555-4555-8555-555555555555',
};
const identity = { patientId: ids.patient, doctorId: ids.doctor, prescriptionDate: '2026-10-04' };
const wireBody = data => JSON.parse(JSON.stringify(data));
const validate = (metatype, body) => pipe.transform(wireBody(body), { type: 'body', metatype });
const form = () => load('apps/web/src/components/prescriptions/prescription-form.tsx', {
  '@/hooks/use-patients': { usePatients: () => ({ data: { data: [] } }) },
  '@/hooks/use-clinical': { useDoctors: emptyQuery },
  '@/hooks/use-inventory': { useMedicines: emptyQuery },
}).PrescriptionForm;
const hooks = api => load('apps/web/src/hooks/use-prescriptions.ts', {
  '@tanstack/react-query': { useMutation: options => options, useQueryClient: () => ({ invalidateQueries() {} }) },
  '@/lib/api': { api },
});

test('real prescription update validation rejects creation fields and invalid nested item IDs', async () => {
  await assert.rejects(validate(UpdatePrescriptionDto, { ...identity, notas: 'QA' }), error => {
    assert.equal(error.getStatus(), 400);
    assert.deepEqual(error.getResponse().message, [
      'property patientId should not exist',
      'property doctorId should not exist',
      'property prescriptionDate should not exist',
    ]);
    return true;
  });
  await assert.rejects(validate(UpdatePrescriptionDto, {
    items: [{ id: 'invalid-synthetic-id', medicineName: 'QA' }],
  }), error => error.getStatus() === 400);
});

test('edited notes pass the real update boundary and preserve identity, item IDs and dispensed history', async () => {
  const history = { id: ids.dispensed, dispensed: true, medicineName: '  QA histórico  ', dosage: '', frequency: '', durationDays: null, instructions: '', productId: null, quantity: 1, requiresRefill: false };
  const editable = { id: ids.editable, dispensed: false, medicineName: 'QA editable', dosage: '5 mg', quantity: 1, requiresRefill: false };
  const state = { id: ids.prescription, ...identity, notas: 'Notas QA anteriores', status: 'active', items: [history, editable] };
  const historyBefore = structuredClone(history);
  const writes = [];
  const tx = {
    prescriptionItem: {
      findMany: async () => state.items,
      update: async ({ where, data }) => {
        assert.equal(where.id, ids.editable);
        writes.push(where.id);
        Object.assign(editable, data);
      },
      create: async () => assert.fail('Editing existing items must preserve their IDs'),
      deleteMany: async () => assert.fail('Both existing items must be retained'),
    },
    prescription: { update: async ({ data }) => { Object.assign(state, data); return state; } },
  };
  const { PrescriptionsService } = load('apps/api/src/modules/prescriptions/prescriptions.service.ts');
  const service = new PrescriptionsService({
    prescription: { findUnique: async () => state },
    $transaction: fn => fn(tx),
  });
  let body;
  let completed = false;
  const mutation = hooks({ put: async (url, data) => {
    assert.equal(url, `/prescriptions/${ids.prescription}`);
    body = wireBody(data);
    const dto = await validate(UpdatePrescriptionDto, body);
    return service.update(ids.prescription, dto);
  } }).useUpdatePrescription();
  const p = setup(form(), {
    isEdit: true, lockPatient: true, defaultValues: state,
    onSubmit: async data => { await mutation.mutationFn({ id: ids.prescription, data }); completed = true; },
  });
  find(p.tree, n => n.props.id === 'rx-notes').props.onChange({ target: { value: 'Notas QA corregidas' } });
  find(p.tree, n => n.type === 'Input' && n.props.id?.endsWith('-dosage') && n.props.value === '5 mg').props.onChange({ target: { value: '' } });
  await p.rerender().props.onSubmit(event);
  assert.equal(completed, true);
  for (const key of Object.keys(identity)) assert.equal(Object.hasOwn(body, key), false, `${key} belongs only to creation`);
  assert.equal(state.notas, 'Notas QA corregidas');
  for (const [key, value] of Object.entries(identity)) assert.equal(state[key], value);
  assert.deepEqual(history, historyBefore);
  assert.deepEqual(body.items[0], { id: ids.dispensed, medicineName: history.medicineName });
  assert.deepEqual(writes, [ids.editable]);
  assert.equal(editable.id, ids.editable);
  assert.equal(editable.dosage, null);
  assert.equal(Object.hasOwn(body.items[0], 'dispensed'), false);
});

test('creation still sends patient, doctor and date and passes the real create boundary', async () => {
  let body;
  let completed = false;
  const mutation = hooks({ post: async (url, data) => {
    assert.equal(url, '/prescriptions');
    body = wireBody(data);
    return validate(CreatePrescriptionDto, body);
  } }).useCreatePrescription();
  const p = setup(form(), {
    lockPatient: true,
    defaultValues: { ...identity, notas: 'Notas QA nuevas', items: [{ medicineName: 'QA ficticio', quantity: 1 }] },
    onSubmit: async data => { await mutation.mutationFn(data); completed = true; },
  });
  await p.tree.props.onSubmit(event);
  assert.equal(completed, true);
  assert.equal(body.patientId, ids.patient);
  assert.equal(body.doctorId, ids.doctor);
  assert.equal(body.prescriptionDate, '2026-10-04T00:00:00.000Z');
  assert.equal(body.notas, 'Notas QA nuevas');
  assert.equal(body.items[0].medicineName, 'QA ficticio');
  assert.equal(Object.hasOwn(body.items[0], 'id'), false);
});
