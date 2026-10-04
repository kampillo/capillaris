const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

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

const fixture = {
  id: 'history-synthetic', patientId: 'patient-synthetic', createdAt: '2026-10-03T12:00:00.000Z', updatedAt: '2026-10-03T12:00:00.000Z',
  padecimientoActual: 'Motivo ficticio', personalesPatologicos: 'Antecedentes ficticios', diagnostico: 'Diagnóstico ficticio', tratamiento: 'Plan ficticio',
  inheritRelatives: { negados: false, hta: true, dm: false, ca: true, respiratorios: false, otros: 'Familia: dato ficticio' },
  nonPathologicalPersonal: { tabaquismo: false, alcoholismo: true, alergias: false, actFisica: true, otros: 'Hábitos ficticios' },
  previousTreatment: { negados: false, minoxidil: true, fue: false, finasteride: true, fuss: false, dutasteride: false, bicalutamida: false, otros: 'Previos ficticios' },
  physicalExploration: { fc: 0, ta: '120/80', fr: 18, temperatura: 36.5, peso: 72.4, talla: 170, tallaUnidad: 'cm', description: 'Hallazgos ficticios' },
};
const calls = { create: [], update: [], success: 0, cancel: 0, roles: [], fail: false, canWrite: true, histories: [fixture] };
const createMutation = { isPending: false, isError: false, error: null, mutateAsync: async value => { if (calls.fail) { createMutation.isError = true; createMutation.error = Error('Error sintético de guardado'); throw createMutation.error; } calls.create.push(value); } };
const updateMutation = { isPending: false, isError: false, error: null, mutateAsync: async value => { if (calls.fail) { updateMutation.isError = true; updateMutation.error = Error('Error sintético de guardado'); throw updateMutation.error; } calls.update.push(value); } };
const reset = () => {
  Object.assign(calls, { create: [], update: [], success: 0, cancel: 0, roles: [], fail: false, canWrite: true, histories: [fixture] });
  for (const mutation of [createMutation, updateMutation]) Object.assign(mutation, { isPending: false, isError: false, error: null });
};

const pagePath = path.resolve(__dirname, '../../apps/web/src/app/dashboard/patients/[id]/history/page.tsx');
const source = fs.readFileSync(pagePath, 'utf8');
// Expose internal components only in this in-memory test module, preserving the
// allowed exports of the Next page on disk. Dependencies are mocked before load.
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  + '\nexports.TestForm = HistoryForm; exports.TestView = HistoryView; exports.TestBMI = computeBMI;\n';
let hookHarness;
const loadPage = handlers => {
  const filename = handlers ? pagePath.replace('page.tsx', 'page.handlers.tsx') : pagePath;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  Module._load = function (request, parent, ...args) {
    if (request === '@/hooks/use-clinical') return {
      useCreateClinicalHistory: () => createMutation,
      useUpdateClinicalHistory: () => updateMutation,
      useClinicalHistoriesByPatient: () => ({ data: calls.histories, isLoading: false }),
    };
    if (request === '@/hooks/use-patients') return { usePatient: () => ({ data: { nombre: 'Paciente', apellido: 'Ficticio' } }) };
    if (request === '@/hooks/use-has-role') return { useHasRole: (...roles) => { calls.roles.push(roles); return calls.canWrite; } };
    if (request === '@/components/patients/patient-context-link') return { __esModule: true, default: props => React.createElement('a', props) };
    if (handlers && request === 'react' && parent.filename === filename) return {
      ...React,
      useState(initial) {
        const h = hookHarness;
        const slot = h.cursor++;
        if (!(slot in h.values)) h.values[slot] = typeof initial === 'function' ? initial() : initial;
        return [h.values[slot], value => { h.values[slot] = typeof value === 'function' ? value(h.values[slot]) : value; }];
      },
      useRef(initial) {
        const h = hookHarness;
        const slot = h.cursor++;
        if (!(slot in h.values)) h.values[slot] = { current: initial };
        return h.values[slot];
      },
      useEffect() {},
    };
    return originalLoad.call(this, request, parent, ...args);
  };
  try { loaded._compile(compiled, filename); } finally { Module._load = originalLoad; }
  return loaded.exports;
};
const real = loadPage(false);
const handlers = loadPage(true);
const formProps = existing => ({ patientId: 'patient-synthetic', existing, onSuccess: () => calls.success++, onCancel: () => calls.cancel++ });
const renderForm = props => renderToStaticMarkup(React.createElement(real.TestForm, props));
const nodes = node => React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : [];
const find = (tree, predicate) => { const node = nodes(tree).find(predicate); assert.ok(node, 'Expected control exists'); return node; };
const setup = existing => {
  const h = { cursor: 0, values: [] };
  const props = formProps(existing);
  const rerender = () => { hookHarness = h; h.cursor = 0; return handlers.TestForm(props); };
  return { tree: rerender(), rerender };
};
const change = (h, id, value) => find(h.rerender(), node => node.props.id === id && node.props.onChange).props.onChange({ target: { value } });
const submit = h => h.rerender().props.onSubmit({ preventDefault() {} });
const htmlOf = h => renderToStaticMarkup(h.rerender());
const clientPayload = history => {
  const { id, patientId, createdAt, updatedAt, ...payload } = history;
  return { patientId, ...payload };
};

// These tests execute actual form handlers and SSR markup without mounting a
// browser. Native focus, ResizeObserver geometry and responsive layout need UI QA.
test('eight sections keep labelled anchors, visible input labels, sticky navigation and measured fixed actions', () => {
  reset();
  const html = renderForm(formProps(fixture));
  for (const id of ['heredofamiliares', 'habitos', 'patologicos', 'previos', 'motivo', 'exploracion', 'diagnostico', 'plan']) {
    assert.ok(html.includes(`aria-labelledby="history-${id}-title"`));
    assert.ok(html.includes(`href="#history-${id}"`));
  }
  for (const id of ['history-ir_otros', 'history-np-otros', 'history-pt_otros', 'history-pathological-notes', 'history-reason-notes', 'history-pe-fc', 'history-pe-ta', 'history-pe-fr', 'history-pe-temperature', 'history-pe-weight', 'history-pe-height', 'history-pe-height-unit', 'history-pe-description', 'history-diagnosis-notes', 'history-plan-notes']) {
    assert.ok(html.includes(`for="${id}"`), `${id} has a visible label`);
    assert.ok(html.includes(`id="${id}"`), `${id} exists`);
  }
  assert.equal((html.match(/type="submit"/g) || []).length, 1);
  assert.ok(html.includes('sticky top-'));
  assert.ok(html.includes('fixed inset-x-0 bottom-0'));
  assert.ok(html.includes('padding-bottom:calc(136px + 1.5rem)'));
  assert.ok(!html.includes('PDF'));
});

test('create defaults are unchanged and do not infer a confirmed unit, diagnosis, plan or consent', async () => {
  reset();
  const h = setup();
  assert.ok(htmlOf(h).includes('Unidad sin confirmar'));
  await submit(h);
  assert.deepEqual(calls.create, [{
    patientId: 'patient-synthetic', padecimientoActual: undefined, personalesPatologicos: undefined, diagnostico: undefined, tratamiento: undefined,
    inheritRelatives: { negados: false, hta: false, dm: false, ca: false, respiratorios: false, otros: undefined },
    nonPathologicalPersonal: { tabaquismo: false, alcoholismo: false, alergias: false, actFisica: false, otros: undefined },
    previousTreatment: { negados: false, minoxidil: false, fue: false, finasteride: false, fuss: false, dutasteride: false, bicalutamida: false, otros: undefined },
  }]);
  assert.equal(calls.success, 1);
});

test('edit submits every existing value with zero, decimals, booleans and explicit unit preserved', async () => {
  reset();
  const h = setup(fixture);
  await submit(h);
  assert.deepEqual(calls.update, [{ id: fixture.id, ...clientPayload(fixture) }]);
  assert.deepEqual(calls.create, []);
  assert.equal(calls.success, 1);
});

test('all text and numeric controls remain editable and produce the same payload shape', async () => {
  reset();
  const h = setup(fixture);
  const entries = [
    ['history-pathological-notes', 'Patológicos editados'], ['history-reason-notes', 'Motivo editado'],
    ['history-diagnosis-notes', 'Diagnóstico editado'], ['history-plan-notes', 'Plan editado'],
    ['history-pe-fc', '70'], ['history-pe-ta', '110/70'], ['history-pe-fr', '16'],
    ['history-pe-temperature', '36.4'], ['history-pe-weight', '73.2'], ['history-pe-height', '1.71'],
    ['history-pe-height-unit', 'm'], ['history-pe-description', 'Descripción editada'], ['history-np-otros', 'Hábitos editados'],
  ];
  for (const [id, value] of entries) change(h, id, value);
  const family = find(h.rerender(), node => node.props.otrosKey === 'ir_otros');
  family.props.onToggle('__otros__:ir_otros:Familia: edición ficticia');
  const previous = find(h.rerender(), node => node.props.otrosKey === 'pt_otros');
  previous.props.onToggle('__otros__:pt_otros:Previos: edición ficticia');
  assert.ok(htmlOf(h).includes('Cambios sin guardar'));
  await submit(h);
  assert.deepEqual(calls.update[0], {
    id: fixture.id, patientId: fixture.patientId, personalesPatologicos: 'Patológicos editados', padecimientoActual: 'Motivo editado', diagnostico: 'Diagnóstico editado', tratamiento: 'Plan editado',
    inheritRelatives: { ...fixture.inheritRelatives, otros: 'Familia: edición ficticia' },
    nonPathologicalPersonal: { ...fixture.nonPathologicalPersonal, otros: 'Hábitos editados' },
    previousTreatment: { ...fixture.previousTreatment, otros: 'Previos: edición ficticia' },
    physicalExploration: { fc: 70, ta: '110/70', fr: 16, temperatura: 36.4, peso: 73.2, talla: 1.71, tallaUnidad: 'm', description: 'Descripción editada' },
  });
});

test('existing denied-all and text-append interactions preserve their semantics and dirty state', async () => {
  reset();
  const h = setup(fixture);
  find(h.rerender(), node => node.props.negadosKey === 'ir_negados').props.onNegadosAll();
  find(h.rerender(), node => node.props.negadosKey === 'pt_negados').props.onNegadosAll();
  find(h.rerender(), node => node.props.children === 'Revaloración' && node.props.onClick).props.onClick();
  await submit(h);
  const value = calls.update[0];
  assert.deepEqual(value.inheritRelatives, { negados: true, hta: false, dm: false, ca: false, respiratorios: false, otros: fixture.inheritRelatives.otros });
  assert.deepEqual(value.previousTreatment, { negados: true, minoxidil: false, fue: false, finasteride: false, fuss: false, dutasteride: false, bicalutamida: false, otros: fixture.previousTreatment.otros });
  assert.equal(value.padecimientoActual, 'Motivo ficticio\nRevaloración');
});

test('native validity feedback associates the error with its input and clears on correction', () => {
  reset();
  const h = setup(fixture);
  change(h, 'history-pe-weight', '72.45');
  h.rerender().props.onInvalidCapture({ target: { id: 'history-pe-weight', validationMessage: 'Usa un valor con un decimal' } });
  const invalid = htmlOf(h);
  assert.ok(/id="history-pe-weight"[^>]*aria-invalid="true"[^>]*aria-describedby="history-pe-weight-error"/.test(invalid));
  assert.ok(invalid.includes('id="history-pe-weight-error" role="alert"'));
  assert.ok(invalid.includes('Usa un valor con un decimal'));
  assert.ok(!find(h.rerender(), node => node.type === 'fieldset' && 'disabled' in node.props).props.disabled);
  change(h, 'history-pe-weight', '72.4');
  assert.ok(!htmlOf(h).includes('history-pe-weight-error'));
});

test('saving disables edits and actions; failure keeps draft and allows retry without asserting success', async () => {
  reset();
  updateMutation.isPending = true;
  const pending = renderForm(formProps(fixture));
  assert.ok(pending.includes('aria-busy="true"'));
  assert.ok(/<fieldset disabled=""/.test(pending));
  assert.ok(pending.includes('Guardando historia…'));
  updateMutation.isPending = false;
  const h = setup(fixture);
  change(h, 'history-reason-notes', 'Motivo ficticio editado');
  calls.fail = true;
  await submit(h);
  assert.equal(calls.success, 0);
  const failed = htmlOf(h);
  assert.ok(failed.includes('Error sintético de guardado'));
  assert.ok(failed.includes('Motivo ficticio editado'));
  assert.ok(failed.includes('Los datos siguen en el formulario'));
  calls.fail = false;
  updateMutation.isError = false;
  await submit(h);
  assert.equal(calls.update[0].padecimientoActual, 'Motivo ficticio editado');
  assert.equal(calls.success, 1);
});

test('unknown height unit remains null in payload and suppresses BMI; confirmed units retain calculation', async () => {
  reset();
  const history = { ...fixture, physicalExploration: { ...fixture.physicalExploration, tallaUnidad: null } };
  const h = setup(history);
  await submit(h);
  assert.equal(calls.update[0].physicalExploration.tallaUnidad, null);
  const html = renderToStaticMarkup(React.createElement(real.TestView, { history }));
  assert.ok(html.includes('(unidad sin confirmar)'));
  assert.ok(!html.includes('IMC'));
  assert.equal(real.TestBMI(72.4, 170, 'cm'), real.TestBMI(72.4, 1.7, 'm'));
  assert.equal(real.TestBMI(72.4, 170, null), null);
});

test('cancel calls only the existing cancel action; restoring values clears dirty state', () => {
  reset();
  const h = setup(fixture);
  change(h, 'history-reason-notes', 'Cambio ficticio');
  assert.ok(htmlOf(h).includes('Cambios sin guardar'));
  change(h, 'history-reason-notes', fixture.padecimientoActual);
  assert.ok(htmlOf(h).includes('Sin cambios pendientes'));
  find(h.rerender(), node => node.props.children === 'Cancelar').props.onClick();
  assert.equal(calls.cancel, 1);
  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.update, []);
});

test('page permissions and historical selection retain admin/doctor writing and read-only previous entries', () => {
  reset();
  const renderPage = () => renderToStaticMarkup(React.createElement(real.default, { params: { id: 'patient-synthetic' } }));
  const allowed = renderPage();
  assert.ok(allowed.includes('Editar'));
  assert.deepEqual(calls.roles[0], ['admin', 'doctor']);
  calls.canWrite = false;
  const readOnly = renderPage();
  assert.ok(!readOnly.includes('Editar'));
  assert.ok(!readOnly.includes('Nueva historia'));
  assert.ok(!readOnly.includes('Crear historia'));
  calls.canWrite = true;
  calls.histories = [fixture, { ...fixture, id: 'history-old', createdAt: '2026-09-01T00:00:00.000Z' }];
  hookHarness = { cursor: 0, values: [] };
  const tree = handlers.default({ params: { id: 'patient-synthetic' } });
  find(tree, node => node.props.onClick && node.props['aria-pressed'] === false).props.onClick();
  hookHarness.cursor = 0;
  const older = renderToStaticMarkup(handlers.default({ params: { id: 'patient-synthetic' } }));
  assert.ok(older.includes('historia anterior (solo lectura)'));
  assert.ok(!older.includes('Editar'));
});
