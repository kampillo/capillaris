const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const rhf = require('react-hook-form');

require('ts-node').register({
  project: path.resolve(__dirname, '../../apps/api/tsconfig.json'),
  transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx' },
});
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  const target = request.startsWith('@/') ? path.resolve(__dirname, '../../apps/web/src', request.slice(2)) : request;
  return originalResolve.call(this, target, parent, ...args);
};
const formPath = path.resolve(__dirname, '../../apps/web/src/components/patients/patient-form');
const { PatientForm } = require(formPath);
const { patientSchema, patientFormOptions } = require(`${formPath}-config`);

// Real server rendering, real resolver/form control and actual component handlers.
// The small hook adapter below lets us exercise those handlers without a DOM.
// It does not claim browser layout, React lifecycle or keyboard interaction QA.
let harness;
const originalLoad = Module._load;
const originalFormModule = require.cache[require.resolve(formPath)];
delete require.cache[require.resolve(formPath)];
Module._load = function (request, parent, ...args) {
  if (request === 'react-hook-form' && parent.filename === require.resolve(formPath)) {
    return {
      ...rhf,
      useForm(options) {
        if (!harness.model) {
          harness.state = { isDirty: false, isSubmitting: false, errors: {} };
          harness.model = rhf.createFormControl(options);
          harness.unsubscribe = harness.model.subscribe({
            formState: { isDirty: true, isSubmitting: true, errors: true },
            callback: state => Object.assign(harness.state, state),
          });
        }
        return { ...harness.model, formState: harness.state };
      },
    };
  }
  return originalLoad.call(this, request, parent, ...args);
};
const { PatientForm: HandlerForm } = require(formPath);
Module._load = originalLoad;
require.cache[require.resolve(formPath)] = originalFormModule;

const fixture = {
  nombre: 'Paciente QA', apellido: 'Ficticio', email: 'qa@example.invalid', celular: '+52 55 0000 0000',
  direccion: 'Dirección ficticia', fechaNacimiento: '1990-03-01', edadApproximada: true,
  driveFolderUrl: 'https://drive.google.com/drive/folders/QA_fake_only', genero: 'otro',
  estadoCivil: 'soltero', ocupacion: 'otro', tipoPaciente: 'active', origenCanal: 'referido',
  referidoPor: 'Referencia ficticia', ciudad: 'Ciudad QA', estado: 'Estado QA', pais: 'Mexico',
  consentDataProcessing: true, consentMarketing: false, notasInternas: 'Sólo prueba local, sin expediente real',
};
const render = props => renderToStaticMarkup(React.createElement(PatientForm, { onSubmit() {}, ...props }));
const nodes = node => {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(nodes)];
};
const find = (tree, predicate) => {
  const node = nodes(tree).find(predicate);
  assert.ok(node, 'Expected control exists');
  return node;
};
const setupHandlers = props => {
  harness = {};
  const formProps = { onSubmit() {}, ...props };
  const tree = HandlerForm(formProps);
  return { tree, model: harness.model, state: harness.state, rerender: () => HandlerForm(formProps), cleanup: () => harness.unsubscribe() };
};

// Page hooks are replaced at import time. No API client, network or database
// is loaded; the actual page submit callbacks build the captured payloads.
const calls = { created: [], updated: [], routes: [], roles: [], fail: false };
const createMutation = { isPending: false, isError: false, mutateAsync: async data => { if (calls.fail) throw Error('Synthetic failure'); calls.created.push(data); } };
const updateMutation = { isPending: false, isError: false, mutateAsync: async data => { if (calls.fail) throw Error('Synthetic failure'); calls.updated.push(data); } };
Module._load = function (request, parent, ...args) {
  if (request === 'next/navigation') return { useRouter: () => ({ push: href => calls.routes.push(href) }) };
  if (request === '@/hooks/use-patients') return {
    useCreatePatient: () => createMutation, useUpdatePatient: () => updateMutation,
    usePatient: () => ({ data: { ...fixture, fechaNacimiento: '1990-03-01T00:00:00.000Z' }, isLoading: false }),
  };
  if (request === '@/hooks/use-has-role') return { useRequireRole: (...roles) => { calls.roles.push(roles); return true; } };
  if (request === '@/components/patients/patient-context-link') return {
    __esModule: true, default: props => React.createElement('a', props),
    usePatientContextHref: href => `${href}?returnTo=synthetic-list-context`,
  };
  return originalLoad.call(this, request, parent, ...args);
};
const NewPage = require('../../apps/web/src/app/dashboard/patients/new/page').default;
const EditPage = require('../../apps/web/src/app/dashboard/patients/[id]/edit/page').default;
Module._load = originalLoad;
const pageForm = tree => find(tree, node => node.type === PatientForm).props;
const resetCalls = () => { for (const key of ['created', 'updated', 'routes', 'roles']) calls[key] = []; calls.fail = false; };

test('new patient renders five named sections, labelled inputs and one primary submit; consent is initially off', () => {
  const html = render({ onCancel() {}, submitLabel: 'Crear paciente' });
  for (const id of ['patient-identidad', 'patient-direccion', 'patient-clasificacion', 'patient-documentos', 'patient-notas']) {
    assert.ok(html.includes(`aria-labelledby="${id}-title"`));
    assert.ok(html.includes(`href="#${id}"`));
  }
  for (const id of ['nombre', 'apellido', 'email', 'celular', 'fechaNacimiento', 'edadApproximada', 'direccion', 'ciudad', 'estado', 'pais', 'referidoPor', 'driveFolderUrl', 'notasInternas']) {
    assert.ok(html.includes(`for="${id}"`), `${id} has a label`);
    assert.ok(html.includes(`id="${id}"`), `${id} has a control`);
  }
  assert.equal((html.match(/type="submit"/g) || []).length, 1);
  assert.equal((html.match(/role="switch" aria-checked="false"/g) || []).length, 2);
  assert.ok(html.includes('aria-describedby="driveFolderUrl-help"'));
  assert.ok(html.includes('aria-required="true"'));
});

test('edit model preserves every supplied field; rendering shows DOB and distinct consent values', () => {
  const html = render({ defaultValues: fixture, submitLabel: 'Actualizar paciente' });
  const h = setupHandlers({ defaultValues: fixture });
  assert.deepEqual(h.model.getValues(), fixture);
  h.cleanup();
  // Registered uncontrolled inputs receive their defaults when their refs mount.
  // SSR only proves the watched DOB/consent display; hydration is not tested.
  assert.ok(html.includes('1 de marzo, 1990'));
  assert.ok(html.includes('id="edadApproximada"'));
  assert.equal((html.match(/role="switch" aria-checked="true"/g) || []).length, 1);
  assert.equal((html.match(/role="switch" aria-checked="false"/g) || []).length, 1);
  assert.ok(html.includes('Sin cambios pendientes'));
});

test('saving locks controls and announces progress; a save error retains the populated form', () => {
  const saving = render({ defaultValues: fixture, isLoading: true, onCancel() {} });
  assert.ok(saving.includes('aria-busy="true"'));
  assert.ok(/<fieldset disabled=""/.test(saving));
  assert.ok(saving.includes('Guardando paciente…'));
  assert.equal((saving.match(/type="submit"/g) || []).length, 1);
  const failed = render({ defaultValues: fixture, submitError: 'Error sintético de guardado' });
  assert.ok(failed.includes('role="alert"'));
  assert.ok(failed.includes('Error sintético de guardado'));
  assert.ok(failed.includes('id="nombre"'));
  assert.ok(failed.includes('role="switch" aria-checked="true"'));
  assert.ok(failed.includes('Los datos siguen en el formulario'));
});

test('validation feedback associates each invalid control with its visible error', async () => {
  const h = setupHandlers();
  renderToStaticMarkup(React.createElement(HandlerForm, { onSubmit() {} }));
  await h.model.handleSubmit(() => assert.fail('Invalid form must not submit'))();
  const html = renderToStaticMarkup(React.createElement(HandlerForm, { onSubmit() {} }));
  assert.ok(/id="nombre"[^>]*aria-invalid="true"[^>]*aria-describedby="nombre-error"/.test(html));
  assert.ok(/id="apellido"[^>]*aria-invalid="true"[^>]*aria-describedby="apellido-error"/.test(html));
  assert.ok(html.includes('id="nombre-error" role="alert"'));
  assert.ok(html.includes('El nombre es requerido'));
  h.cleanup();
});

test('actual choice and date handlers mark changes; new consent remains absent until explicitly selected', () => {
  const h = setupHandlers();
  assert.equal(h.model.getValues('consentDataProcessing'), undefined);
  assert.equal(h.model.getValues('consentMarketing'), undefined);
  find(h.tree, node => node.props.children === 'Instagram' && node.props.onClick).props.onClick();
  find(h.tree, node => node.props.children === 'Estados Unidos' && node.props.onClick).props.onClick();
  find(h.tree, node => node.props.id === 'fechaNacimiento' && node.props.onChange).props.onChange('1990-03-01');
  assert.equal(h.model.getValues('origenCanal'), 'instagram');
  assert.equal(h.model.getValues('pais'), 'Estados Unidos');
  assert.equal(h.model.getValues('fechaNacimiento'), '1990-03-01');
  assert.equal(h.state.isDirty, true);
  assert.ok(nodes(h.rerender()).some(node => node.props.role === 'status' && node.props.children === 'Cambios sin guardar'));
  find(h.tree, node => node.props.id === 'consentMarketing' && node.props.onClick).props.onClick();
  assert.equal(h.model.getValues('consentMarketing'), true);
  assert.equal(h.model.getValues('consentDataProcessing'), undefined);
  h.cleanup();
});

test('edit consent handler changes exactly one value and can return to the original clean state', () => {
  const h = setupHandlers({ defaultValues: fixture });
  find(h.tree, node => node.props.id === 'consentDataProcessing' && node.props.onClick).props.onClick();
  assert.equal(h.model.getValues('consentDataProcessing'), false);
  assert.equal(h.model.getValues('consentMarketing'), false);
  assert.equal(h.state.isDirty, true);
  find(h.rerender(), node => node.props.id === 'consentDataProcessing' && node.props.onClick).props.onClick();
  assert.deepEqual(h.model.getValues(), fixture);
  assert.equal(h.state.isDirty, false);
  h.cleanup();
});

test('actual resolver blocks missing names, malformed email and Drive links; it focuses the first invalid registered field', async () => {
  const model = rhf.createFormControl(patientFormOptions());
  const focused = [];
  const unsubscribe = model.subscribe({ formState: { errors: true }, callback() {} });
  for (const name of ['nombre', 'apellido', 'email', 'driveFolderUrl']) {
    model.register(name).ref({ name, type: 'text', value: model.getValues(name) || '', focus: () => focused.push(name) });
  }
  let submissions = 0;
  let errors;
  await model.handleSubmit(() => { submissions++; }, value => { errors = value; })();
  assert.equal(submissions, 0);
  assert.equal(errors.nombre.message, 'El nombre es requerido');
  assert.equal(errors.apellido.message, 'El apellido es requerido');
  assert.equal(focused[0], 'nombre');
  model.setValue('nombre', fixture.nombre);
  model.setValue('apellido', fixture.apellido);
  model.setValue('email', 'invalid');
  model.setValue('driveFolderUrl', 'https://example.invalid/folder');
  focused.length = 0;
  await model.handleSubmit(() => { submissions++; }, value => { errors = value; })();
  assert.equal(submissions, 0);
  assert.equal(errors.email.message, 'Email inválido');
  assert.equal(errors.driveFolderUrl.message, 'Usa el enlace HTTPS de una carpeta de Google Drive');
  assert.equal(focused[0], 'email');
  unsubscribe();
});

test('first invalid field remains enabled when the actual resolver requests focus', async () => {
  const h = setupHandlers();
  const attempts = [];
  for (const name of ['nombre', 'apellido']) {
    h.model.register(name).ref({
      name, type: 'text', value: '',
      focus() {
        const fieldset = find(h.rerender(), node => node.type === 'fieldset' && 'disabled' in node.props);
        attempts.push({ name, disabled: fieldset.props.disabled, validating: h.state.isSubmitting });
      },
    });
  }
  await h.model.handleSubmit(() => assert.fail('Invalid form must not submit'))();
  assert.deepEqual(attempts[0], { name: 'nombre', disabled: false, validating: true });
  h.cleanup();
});

test('async submit announces saving and keeps edited values after failure for retry', async () => {
  const h = setupHandlers({ defaultValues: fixture });
  h.model.setValue('celular', '+52 55 1111 1111', { shouldDirty: true });
  let rejectSave;
  let signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  assert.ok(patientSchema.safeParse(h.model.getValues()).success);
  const pending = h.model.handleSubmit(() => new Promise((resolve, reject) => { rejectSave = reject; signalStarted(); }))();
  // Wait only for the actual resolver; there is no timer, network or database.
  await started;
  assert.ok(rejectSave);
  assert.equal(h.state.isSubmitting, true);
  assert.ok(find(h.rerender(), node => node.props.type === 'submit').props.disabled);
  rejectSave(Error('Synthetic failure'));
  await assert.rejects(pending, /Synthetic failure/);
  assert.equal(h.state.isSubmitting, false);
  assert.equal(h.state.isDirty, true);
  assert.equal(h.model.getValues('celular'), '+52 55 1111 1111');
  let retry;
  await h.model.handleSubmit(value => { retry = value; })();
  assert.equal(retry.celular, '+52 55 1111 1111');
  assert.equal(retry.consentDataProcessing, true);
  assert.equal(retry.consentMarketing, false);
  h.cleanup();
});

test('actual create page payload keeps false booleans, omits blanks and anchors DOB without changing roles', async () => {
  resetCalls();
  const form = pageForm(NewPage());
  await form.onSubmit(patientSchema.parse({ ...fixture, email: '', referidoPor: '', consentDataProcessing: false, consentMarketing: false }));
  const expected = { ...fixture, fechaNacimiento: '1990-03-01T00:00:00.000Z', consentDataProcessing: false };
  delete expected.email;
  delete expected.referidoPor;
  assert.deepEqual(calls.created, [expected]);
  assert.deepEqual(calls.routes, ['/dashboard/patients']);
  assert.deepEqual(calls.roles, [['admin', 'doctor', 'receptionist']]);
});

test('actual edit page preserves all defaults, null clearing, explicit consent and contextual return', async () => {
  resetCalls();
  const form = pageForm(EditPage({ params: { id: 'synthetic-patient' } }));
  assert.deepEqual(form.defaultValues, fixture);
  await form.onSubmit(patientSchema.parse({ ...fixture, email: '', celular: '', driveFolderUrl: '', fechaNacimiento: '', consentDataProcessing: false }));
  assert.deepEqual(calls.updated, [{ id: 'synthetic-patient', data: { ...fixture, email: null, celular: null, driveFolderUrl: null, fechaNacimiento: null, consentDataProcessing: false } }]);
  assert.deepEqual(calls.routes, ['/dashboard/patients/synthetic-patient?returnTo=synthetic-list-context']);
  assert.deepEqual(calls.roles, [['admin', 'doctor', 'receptionist']]);
});

test('actual create/edit callbacks do not navigate when the fake mutation fails', async () => {
  resetCalls();
  calls.fail = true;
  await pageForm(NewPage()).onSubmit(fixture);
  await pageForm(EditPage({ params: { id: 'synthetic-patient' } })).onSubmit(fixture);
  assert.deepEqual(calls.created, []);
  assert.deepEqual(calls.updated, []);
  assert.deepEqual(calls.routes, []);
  calls.fail = false;
});

test('cancel and back return to their existing destinations without submitting a dirty form', () => {
  resetCalls();
  const newTree = NewPage();
  const newProps = pageForm(newTree);
  const h = setupHandlers(newProps);
  h.model.setValue('nombre', 'Cambio ficticio sin guardar', { shouldDirty: true });
  assert.equal(h.state.isDirty, true);
  find(h.rerender(), node => node.props.children === 'Cancelar' && node.props.onClick).props.onClick();
  assert.equal(find(newTree, node => node.props.href === '/dashboard/patients').props.href, '/dashboard/patients');
  h.cleanup();
  const editTree = EditPage({ params: { id: 'synthetic-patient' } });
  pageForm(editTree).onCancel();
  assert.ok(nodes(editTree).some(node => node.props.href === '/dashboard/patients/synthetic-patient'));
  assert.deepEqual(calls.routes, ['/dashboard/patients', '/dashboard/patients/synthetic-patient?returnTo=synthetic-list-context']);
  assert.deepEqual(calls.created, []);
  assert.deepEqual(calls.updated, []);
});
