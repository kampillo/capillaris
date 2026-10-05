const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, setup, nodes, find, emptyQuery, noopMutation, event } = require('./form-test-harness.cjs');

test('treatment deletion requires explicit confirmation; cancellation and failure preserve the card', async () => {
  const calls = [];
  let fail = false;
  const mutation = { isPending: false, mutateAsync: async id => { calls.push(id); if (fail) throw Error('Synthetic failure'); } };
  const { TarjetaTratamiento } = load('apps/web/src/app/dashboard/patients/[id]/treatments/page.tsx', {
    '@/hooks/use-clinical': { useDeleteTreatment: () => mutation },
  }, 'export { TarjetaTratamiento };');
  const p = setup(TarjetaTratamiento, { tratamiento: { id: 'qa-treatment', fecha: '2026-10-04', tipos: [], zonas: [] }, patientId: 'qa-patient', puedeBorrar: true });
  find(p.tree, n => n.props['aria-label'] === 'Eliminar tratamiento').props.onClick();
  assert.equal(calls.length, 0);
  let tree = p.rerender();
  assert.equal(find(tree, n => n.type === 'Dialog').props.open, true);
  find(tree, n => n.props.children === 'Conservar tratamiento').props.onClick();
  assert.equal(find(p.rerender(), n => n.type === 'Dialog').props.open, false);
  assert.equal(calls.length, 0);
  find(tree, n => n.props['aria-label'] === 'Eliminar tratamiento').props.onClick();
  fail = true;
  await find(p.rerender(), n => n.props.children === 'Sí, eliminar tratamiento').props.onClick();
  assert.deepEqual(calls, ['qa-treatment']);
  tree = p.rerender();
  assert.equal(find(tree, n => n.type === 'Dialog').props.open, true);
  assert.ok(nodes(tree).some(n => n.props.role === 'alert'));
  mutation.isPending = true;
  tree = p.rerender();
  assert.equal(find(tree, n => n.props.children === 'Conservar tratamiento').props.disabled, true);
  find(tree, n => n.type === 'Dialog').props.onOpenChange(false);
  assert.equal(find(p.rerender(), n => n.type === 'Dialog').props.open, true);
});

test('prescriptions filter and count by patient before pagination; frontend requests that patient', async () => {
  const all = Array.from({ length: 130 }, (_, i) => ({ id: `qa-rx-${i}`, patientId: i < 100 ? 'qa-other' : 'qa-target' }));
  const queries = [];
  const { PrescriptionsService } = load('apps/api/src/modules/prescriptions/prescriptions.service.ts');
  const match = where => all.filter(rx => !where.patientId || rx.patientId === where.patientId);
  const svc = new PrescriptionsService({ prescription: {
    findMany: async q => { queries.push(q); return match(q.where).slice(q.skip, q.skip + q.take); },
    count: async q => match(q.where).length,
  } });
  const first = await svc.findAll(1, 20, 'qa-target');
  const second = await svc.findAll(2, 20, 'qa-target');
  assert.equal(first.data.length, 20); assert.equal(second.data.length, 10);
  assert.equal(first.meta.total, 30); assert.equal(first.meta.totalPages, 2);
  assert.equal(second.data[0].id, 'qa-rx-120');
  assert.deepEqual(queries[1].where, { patientId: 'qa-target' });
  let args;
  const { default: Page } = load('apps/web/src/app/dashboard/patients/[id]/prescriptions/page.tsx', {
    '@/hooks/use-patients': { usePatient: () => ({ data: { nombre: 'QA', apellido: 'Ficticio' } }) },
    '@/hooks/use-prescriptions': { usePrescriptions: (...a) => { args = a; return { data: first, isLoading: false }; } },
  });
  const p = setup(Page, { params: { id: 'qa-target' } });
  assert.deepEqual(args, [1, 20, 'qa-target']);
  find(p.tree, n => n.props.children === 'Siguiente').props.onClick();
  p.rerender(); assert.deepEqual(args, [2, 20, 'qa-target']);
  const global = await svc.findAll(); assert.equal(global.meta.total, 130);
});

test('prescription pager can return from an empty page after the total shrinks', () => {
  let result = { data: [], meta: { page: 1, total: 30, totalPages: 2 } };
  const { default: Page } = load('apps/web/src/app/dashboard/patients/[id]/prescriptions/page.tsx', {
    '@/hooks/use-patients': { usePatient: () => ({ data: { nombre: 'QA', apellido: 'Ficticio' } }) },
    '@/hooks/use-prescriptions': { usePrescriptions: () => ({ data: result, isLoading: false }) },
  });
  const p = setup(Page, { params: { id: 'qa-target' } });
  find(p.tree, n => n.props.children === 'Siguiente').props.onClick();
  result = { data: [], meta: { page: 2, total: 20, totalPages: 1 } };
  const tree = p.rerender();
  assert.ok(nodes(tree).some(n => n.props.children === 'No hay recetas en esta página. Vuelve a la anterior.'));
  const previous = find(tree, n => n.props.children === 'Anterior');
  assert.equal(previous.props.disabled, false);
  previous.props.onClick(); assert.equal(p.state[0], 1);
});

test('editing user profile preserves all roles when role selection is unchanged', async () => {
  let payload;
  const user = { id: 'qa-user', nombre: 'Nombre QA', apellido: 'Ficticio', email: 'qa@example.invalid', isActive: true, createdAt: '2026-10-04', roles: [{ id: 'qa-role-1', name: 'nurse' }, { id: 'qa-role-2', name: 'treatment_staff' }] };
  const { default: Page } = load('apps/web/src/app/dashboard/settings/users/page.tsx', {
    '@/hooks/use-users': { useUsers: () => ({ data: [user], isLoading: false }), useCreateUser: noopMutation, useUpdateUser: () => ({ isPending: false, mutateAsync: async p => { payload = p; } }), useDeleteUser: noopMutation, useReactivateUser: noopMutation },
    '@/hooks/use-roles': { useRoles: () => ({ data: user.roles }) },
  });
  const p = setup(Page, {}, [false, null, null, user]);
  p.state[13] = 'Nombre QA cambiado';
  await find(p.rerender(), n => n.props.onClick && n.props.children === 'Guardar').props.onClick();
  assert.equal(payload.data.nombre, 'Nombre QA cambiado');
  assert.equal(Object.hasOwn(payload.data, 'roleId'), false);
  const roleIds = ['qa-role-1', 'qa-role-2'];
  const privateUser = () => ({ ...user, passwordHash: 'fake-only', deletedAt: null, userRoles: roleIds.map(id => ({ role: { id, name: id, displayName: id } })) });
  const tx = { user: { update: async () => ({}), findUniqueOrThrow: async () => privateUser() }, userRole: { deleteMany: async () => assert.fail('Must not replace roles'), create: async () => assert.fail('Must not replace roles') } };
  const { UsersService } = load('apps/api/src/modules/users/users.service.ts');
  const svc = new UsersService({ user: { findUnique: async () => privateUser() }, $transaction: fn => fn(tx) });
  assert.deepEqual((await svc.update(payload.id, payload.data)).roles.map(r => r.id), roleIds);
});

test('product zero threshold persists, cleared optional fields are explicit and section identity stays stable', async () => {
  let payload;
  const { ProductForm } = load('apps/web/src/components/inventory/product-form.tsx');
  const p = setup(ProductForm, { defaultValues: { name: 'QA', minStockAlert: 0, description: 'Anterior QA', sku: 'SKU-QA', content: 12, unitPrice: 5 }, onSubmit: data => { payload = data; } });
  const section = nodes(p.tree).find(n => typeof n.type === 'function' && n.props.children);
  find(p.tree, n => n.type === 'Textarea' && n.props.value === 'Anterior QA').props.onChange({ target: { value: '' } });
  // Existing named state slots model clearing fields without a browser.
  p.state[1] = ''; p.state[3] = ''; p.state[4] = '';
  const tree = p.rerender();
  assert.equal(nodes(tree).find(n => typeof n.type === 'function' && n.props.children).type, section.type);
  await tree.props.onSubmit(event);
  assert.equal(payload.minStockAlert, 0);
  assert.equal(payload.description, ''); assert.equal(payload.sku, null);
  assert.equal(payload.content, null); assert.equal(payload.unitPrice, null);
});

test('consultation edit clears scalar values, date and nullable booleans; omitted updates stay omitted', async () => {
  let payload;
  const { ConsultationForm } = load('apps/web/src/app/dashboard/patients/[id]/consultations/page.tsx', {
    '@/hooks/use-clinical': { useCreateConsultation: noopMutation, useUpdateConsultation: () => ({ mutateAsync: async p => { payload = p; } }), useDonorZones: emptyQuery, useVariants: emptyQuery, useDoctors: emptyQuery },
  }, 'export { ConsultationForm };');
  const p = setup(ConsultationForm, { patientId: 'qa-patient', consultation: { id: 'qa-consultation', doctorId: 'qa-doctor', consultationDate: '2026-10-04', comentarios: 'Texto QA', caspa: true, fechaSugeridaTransplante: '2026-10-05' }, onSuccess() {}, onCancel() {} });
  p.state[0] = { ...p.state[0], comentarios: '', caspa: undefined, fechaSugeridaTransplante: '' };
  await find(p.rerender(), n => n.type === 'form').props.onSubmit(event);
  assert.equal(payload.comentarios, ''); assert.equal(payload.caspa, null); assert.equal(payload.fechaSugeridaTransplante, null);
  assert.deepEqual(payload.donorZoneIds, []); assert.deepEqual(payload.variantIds, []);
  const { MedicalConsultationsService } = load('apps/api/src/modules/medical-consultations/medical-consultations.service.ts');
  const updates = [];
  const service = new MedicalConsultationsService({ medicalConsultation: { findUnique: async () => ({ id: 'qa-consultation' }), update: async args => { updates.push(args.data); return {}; } } });
  await service.update('qa-consultation', { fechaSugeridaTransplante: null, caspa: null, comentarios: '' });
  assert.equal(updates[0].fechaSugeridaTransplante, null); assert.equal(updates[0].caspa, null);
  await service.update('qa-consultation', { comentarios: 'Nuevo QA' });
  assert.equal(updates[1].fechaSugeridaTransplante, undefined);
});

test('appointment range crosses midnight and sends explicit instants independent of server timezone', () => {
  const { appointmentRange } = load('apps/web/src/lib/appointment-range.ts');
  const oldTZ = process.env.TZ;
  try {
    process.env.TZ = 'America/Mexico_City';
    const range = appointmentRange('2026-10-04', '17:45', 480);
    assert.equal(range.endDate, '2026-10-05'); assert.equal(range.endTime, '01:45');
    assert.equal(range.startDatetime, '2026-10-04T23:45:00.000Z');
    const { AppointmentsService } = load('apps/api/src/modules/appointments/appointments.service.ts');
    const svc = new AppointmentsService({}, {});
    process.env.TZ = 'UTC'; const a = svc.dateValues(range.startDatetime, range.endDatetime);
    process.env.TZ = 'America/Mexico_City'; const b = svc.dateValues(range.startDatetime, range.endDatetime);
    assert.equal(a.startDatetime.toISOString(), b.startDatetime.toISOString()); assert.equal(a.durationMinutes, 480);
    assert.equal(appointmentRange('2026-02-31', '10:00', 45), null);
    assert.equal(appointmentRange('2026-10-04', '25:00', 45), null);
  } finally { if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ; }
});

test('product save guard rejects duplicate submits, locks cancel and retains draft after failure', async () => {
  const { ProductForm } = load('apps/web/src/components/inventory/product-form.tsx');
  let reject; let calls = 0;
  const pending = new Promise((_, no) => { reject = no; });
  const p = setup(ProductForm, { defaultValues: { name: 'QA' }, onCancel() {}, onSubmit: () => { calls++; return pending; } });
  const name = find(p.tree, n => n.props.id === 'product-name');
  name.props.onChange({ target: { value: 'QA cambiado' } });
  const tree = p.rerender();
  const handler = tree.props.onSubmit;
  const first = handler(event); const second = handler(event);
  assert.equal(calls, 1);
  const saving = p.rerender();
  assert.equal(saving.props['aria-busy'], true);
  assert.equal(find(saving, n => n.type === 'fieldset').props.disabled, true);
  const actions = find(saving, n => typeof n.type === 'function' && n.type.name === 'FormActions');
  const actionTree = actions.type(actions.props);
  assert.equal(find(actionTree, n => n.props.children === 'Cancelar').props.disabled, true);
  reject(Error('Fallo ficticio')); await Promise.all([first, second]);
  const failed = p.rerender();
  assert.equal(find(failed, n => n.props.id === 'product-name').props.value, 'QA cambiado');
  assert.ok(nodes(failed).some(n => n.props.role === 'alert' && n.props.children === 'Fallo ficticio'));
  assert.equal(find(failed, n => n.type === 'fieldset').props.disabled, false);
});

test('prescription edit preserves IDs and dispensing flag; clearable item fields and notes are explicit', async () => {
  let payload;
  const { PrescriptionForm } = load('apps/web/src/components/prescriptions/prescription-form.tsx', {
    '@/hooks/use-patients': { usePatients: () => ({ data: { data: [] } }) },
    '@/hooks/use-clinical': { useDoctors: emptyQuery }, '@/hooks/use-inventory': { useMedicines: emptyQuery },
  });
  const p = setup(PrescriptionForm, { isEdit: true, lockPatient: true, defaultValues: { patientId: 'qa-patient', doctorId: 'qa-doctor', prescriptionDate: '2026-10-04', notas: 'Notas QA', items: [{ id: 'qa-item', dispensed: true, medicineName: 'QA ficticio', quantity: 1, dosage: null, frequency: null, durationDays: null, instructions: null, productId: null }] }, onSubmit: data => { payload = data; } });
  assert.ok(nodes(p.tree).some(n => n.type === 'fieldset' && n.props.disabled === true));
  find(p.tree, n => n.props.id === 'rx-notes').props.onChange({ target: { value: '' } });
  await p.rerender().props.onSubmit(event);
  assert.equal(payload.notas, ''); assert.equal(payload.items[0].id, 'qa-item');
  assert.equal(Object.hasOwn(payload.items[0], 'dosage'), false);
  assert.equal(Object.hasOwn(payload.items[0], 'productId'), false);
  assert.equal(Object.hasOwn(payload.items[0], 'dispensed'), false);
  assert.equal(find(p.tree, n => n.props.id === 'rx-date').props.disabled, true);
});

test('editing notes preserves legacy dispensing values exactly and editable item fields still clear', async () => {
  let payload;
  const { PrescriptionForm } = load('apps/web/src/components/prescriptions/prescription-form.tsx', {
    '@/hooks/use-patients': { usePatients: () => ({ data: { data: [] } }) },
    '@/hooks/use-clinical': { useDoctors: emptyQuery }, '@/hooks/use-inventory': { useMedicines: emptyQuery },
  });
  const old = { id: 'qa-dispensed', dispensed: true, medicineName: '  QA ficticio  ', dosage: '', frequency: '', durationDays: null, quantity: 1, instructions: '', productId: null, requiresRefill: false };
  const p = setup(PrescriptionForm, { isEdit: true, lockPatient: true, defaultValues: { patientId: 'qa-patient', doctorId: 'qa-doctor', prescriptionDate: '2026-10-04', notas: 'Notas QA', items: [old] }, onSubmit: data => { payload = data; } });
  find(p.tree, n => n.props.id === 'rx-notes').props.onChange({ target: { value: 'Notas QA actualizadas' } });
  await p.rerender().props.onSubmit(event);
  assert.deepEqual(payload.items, [{ id: old.id, medicineName: old.medicineName }]);
  const { PrescriptionsService } = load('apps/api/src/modules/prescriptions/prescriptions.service.ts');
  let saved;
  const tx = { $queryRaw: async () => [], prescriptionItem: { findMany: async () => [old], update: async () => assert.fail('Dispensed item must not be written') }, prescription: { findUnique: async () => ({ id: 'qa-rx', items: [old] }), update: async args => { saved = args.data; return {}; } } };
  const service = new PrescriptionsService({ prescription: { findUnique: async () => ({ id: 'qa-rx' }) }, $transaction: fn => fn(tx) });
  await service.update('qa-rx', { notas: payload.notas, items: payload.items });
  assert.equal(saved.notas, 'Notas QA actualizadas');
  const { prescriptionItemPayload } = load('apps/web/src/lib/prescription-items.ts');
  assert.equal(prescriptionItemPayload({ id: 'qa-editable', medicineName: 'QA', dosage: '', frequency: '', instructions: '' }).dosage, null);
});

test('four forms have associated controls, unique IDs, section navigation and one action group', () => {
  const cases = [
    ['apps/web/src/components/inventory/product-form.tsx', 'ProductForm', { onSubmit() {}, showInitialStock: true }, {}],
    ['apps/web/src/components/prescriptions/prescription-form.tsx', 'PrescriptionForm', { onSubmit() {} }, { '@/hooks/use-patients': { usePatients: () => ({ data: { data: [] } }) }, '@/hooks/use-clinical': { useDoctors: emptyQuery }, '@/hooks/use-inventory': { useMedicines: emptyQuery } }],
    ['apps/web/src/app/dashboard/patients/[id]/consultations/page.tsx', 'ConsultationForm', { patientId: 'qa', onSuccess() {}, onCancel() {} }, { '@/hooks/use-clinical': { useCreateConsultation: noopMutation, useUpdateConsultation: noopMutation, useDonorZones: emptyQuery, useVariants: emptyQuery, useDoctors: emptyQuery } }],
    ['apps/web/src/app/dashboard/patients/[id]/procedures/page.tsx', 'ProcedureForm', { patientId: 'qa', onSuccess() {}, onCancel() {} }, { '@/hooks/use-clinical': { useCreateProcedure: noopMutation, useDoctors: emptyQuery, useHairTypes: emptyQuery, useOperatingRooms: emptyQuery } }],
  ];
  for (const [file, name, props, mocks] of cases) {
    const module = load(file, mocks, ['ConsultationForm', 'ProcedureForm'].includes(name) ? `export { ${name} };` : '');
    const p = setup(module[name], props);
    const all = nodes(p.tree), ids = all.map(n => n.props.id).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, `${name}: unique IDs`);
    for (const label of all.filter(n => n.type === 'Label')) {
      assert.ok(label.props.htmlFor, `${name}: associated label`);
      assert.ok(ids.includes(label.props.htmlFor), `${name}: label target exists`);
    }
    const intro = find(p.tree, n => typeof n.type === 'function' && n.type.name === 'FormIntro');
    for (const section of intro.props.sections) assert.ok(ids.includes(section.id), `${name}: navigation target ${section.id}`);
    assert.equal(all.filter(n => typeof n.type === 'function' && n.type.name === 'FormActions').length, 1);
  }
});

test('reports announce loading/failure and retry failed queries instead of rendering empty charts', () => {
  for (const loading of [true, false]) {
    let retried = 0;
    const mocks = Object.fromEntries(['Patients', 'Procedures', 'Appointments', 'Prescriptions', 'Inventory', 'Sources', 'Clinical'].map(kind => [`use${kind}Report`, () => ({ data: undefined, isLoading: loading, isError: !loading, refetch: () => { retried++; } })]));
    const { default: Page } = load('apps/web/src/app/dashboard/reports/page.tsx', { '@/hooks/use-dashboard': mocks });
    const p = setup(Page, {});
    assert.equal(nodes(p.tree).some(n => typeof n.type === 'function' && n.type.name === 'EmptyChart'), false);
    const feedback = find(p.tree, n => typeof n.type === 'function' && n.type.name === 'QueryFeedback');
    const state = feedback.type(feedback.props);
    assert.equal(state.props.role, loading ? 'status' : 'alert');
    if (!loading) { find(state, n => n.props.children === 'Reintentar').props.onClick(); assert.equal(retried, 7); }
  }
});

test('stock saving locks cancellation, reports pending state to dialog owner and only closes on success', async () => {
  let resolve; let closes = 0; const states = [];
  const pending = new Promise(yes => { resolve = yes; });
  const { StockMovementForm } = load('apps/web/src/components/inventory/stock-movement-form.tsx', { '@/hooks/use-inventory': { useCreateStockMovement: () => ({ isPending: false, mutateAsync: () => pending }) } });
  const p = setup(StockMovementForm, { productId: 'qa-product', onDone: () => { closes++; }, onCancel() {}, onSavingChange: state => states.push(state) });
  find(p.tree, n => n.props.id === 'stock-quantity').props.onChange({ target: { value: '2' } });
  const saving = p.rerender().props.onSubmit(event);
  assert.deepEqual(states, [true]); assert.equal(closes, 0);
  const tree = p.rerender(); assert.equal(find(tree, n => n.type === 'fieldset').props.disabled, true);
  const actions = find(tree, n => typeof n.type === 'function' && n.type.name === 'FormActions');
  assert.equal(find(actions.type(actions.props), n => n.props.children === 'Cancelar').props.disabled, true);
  resolve(); await saving; assert.deepEqual(states, [true, false]); assert.equal(closes, 1);
});

test('procedure form keeps numeric/text clinical payload, zero counts and catalog selections intact', async () => {
  let payload;
  const { ProcedureForm } = load('apps/web/src/app/dashboard/patients/[id]/procedures/page.tsx', {
    '@/hooks/use-clinical': { useCreateProcedure: () => ({ mutateAsync: async data => { payload = data; } }), useDoctors: emptyQuery, useHairTypes: emptyQuery, useOperatingRooms: emptyQuery },
  }, 'export { ProcedureForm };');
  const p = setup(ProcedureForm, { patientId: 'qa-patient', onSuccess() {}, onCancel() {} });
  p.state[0] = { ...p.state[0], procedureDate: '2026-10-04', cb1: '0', cb2: '12', cb3: '3', totalFoliculos: '0', punchSize: '0.8', doctorIds: ['qa-doctor'], hairTypeIds: ['qa-zone'], descripcion: 'Nota ficticia', anestExtAdrenalina: '0.5', anestImpLidocaina: '1%' };
  await p.rerender().props.onSubmit(event);
  assert.equal(payload.cb1, 0); assert.equal(payload.cb2, 12); assert.equal(payload.totalFoliculos, 0); assert.equal(payload.punchSize, 0.8);
  assert.deepEqual(payload.doctorIds, ['qa-doctor']); assert.deepEqual(payload.hairTypeIds, ['qa-zone']);
  assert.equal(payload.descripcion, 'Nota ficticia'); assert.equal(payload.anestExtAdrenalina, 0.5); assert.equal(payload.anestImpLidocaina, '1%');
});

test('disabled scalp selection ignores pointer and keyboard input while saving', () => {
  const { ZONE_LAYOUT } = load('apps/web/src/components/clinic/scalp-zones.ts');
  const { ScalpZonePicker } = load('apps/web/src/components/clinic/scalp-zone-picker.tsx');
  let changes = 0;
  const tree = ScalpZonePicker({ zones: [{ id: 'qa-zone', name: Object.keys(ZONE_LAYOUT)[0] }], value: [], disabled: true, onChange: () => { changes++; } });
  const control = find(tree, n => n.props.role === 'checkbox');
  assert.equal(control.props['aria-disabled'], true); assert.equal(control.props.tabIndex, -1);
  control.props.onClick(); control.props.onKeyDown({ key: 'Enter', preventDefault() {} });
  assert.equal(changes, 0);
});

test('API validators accept explicit clearing of nullable fields and still reject invalid values', () => {
  const { validateSync } = require('class-validator');
  const { UpdateProductDto } = load('apps/api/src/modules/products/dto/update-product.dto.ts');
  const product = Object.assign(new UpdateProductDto(), { sku: null, content: null, unitPrice: null, minStockAlert: 0 });
  assert.equal(validateSync(product).length, 0);
  product.minStockAlert = -1; assert.ok(validateSync(product).length > 0);
  const { UpdateMedicalConsultationDto } = load('apps/api/src/modules/medical-consultations/dto/update-medical-consultation.dto.ts');
  const consultation = Object.assign(new UpdateMedicalConsultationDto(), { caspa: null, grasa: null, fechaSugeridaTransplante: null, comentarios: '' });
  assert.equal(validateSync(consultation).length, 0);
  consultation.caspa = 'invalid'; assert.ok(validateSync(consultation).length > 0);
});
