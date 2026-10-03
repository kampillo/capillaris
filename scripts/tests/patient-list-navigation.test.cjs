const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { PATIENTS_PATH, readPatientListState, patientListHref, safePatientListReturn, patientContextHref } = require('../../apps/web/src/lib/patient-list-navigation');
const patient = 'ea052396-2322-4308-adf5-dd463ed73356';
const state = { query: 'QA + prueba & nombre? / Á', filter: 'lead', page: 3, sortBy: 'name', sortOrder: 'asc' };
const params = href => new URL(href, 'https://app.invalid').searchParams;

test('patient list round trip preserves exact search, filter, page, sort and order', () => {
  const href = patientListHref(state);
  assert.deepEqual(readPatientListState(params(href)), state);
  assert.equal(safePatientListReturn(href), href);
  for (const filter of ['all', 'active', 'evaluation', 'registered', 'lead', 'inactive', 'archived']) {
    const value = { ...state, filter };
    assert.deepEqual(readPatientListState(params(patientListHref(value))), value);
  }
});

test('invalid list controls fall back to valid defaults and never become request fields', () => {
  for (const page of ['0', '-1', '1.5', 'Infinity', '9007199254740992', '2x']) {
    const value = readPatientListState(new URLSearchParams({ tipoPaciente: 'unknown', sortBy: 'passwordHash', sortOrder: 'sideways', page }));
    assert.deepEqual(value, { query: '', filter: 'all', page: 1, sortBy: 'createdAt', sortOrder: 'desc' });
  }
});

test('return destinations reject external, executable, nested path and ambiguous URLs', () => {
  for (const value of [null, undefined, '', 'https://evil.invalid/dashboard/patients', '//evil.invalid', 'javascript:alert(1)', '/dashboard/patients/new', '/dashboard/patients/../settings', '/dashboard/patients-extra', '/dashboard/nursing', '/dashboard/patients#fragment', '/dashboard/patients\\evil', '/dashboard/patients\n?query=x']) {
    assert.equal(safePatientListReturn(value), PATIENTS_PATH);
  }
});

test('return destinations drop unknown and nested parameters without losing legitimate context', () => {
  const href = '/dashboard/patients?query=QA?value&tipoPaciente=lead&page=2&sortBy=name&sortOrder=asc&returnTo=https%3A%2F%2Fevil.invalid&auth_token=SYNTHETIC';
  const safe = safePatientListReturn(href);
  assert.equal(params(safe).get('query'), 'QA?value');
  assert.equal(params(safe).get('page'), '2');
  assert.equal(params(safe).has('returnTo'), false);
  assert.equal(params(safe).has('auth_token'), false);
});

test('patient tabs and capture areas carry the same safe list context back through the record', () => {
  const list = patientListHref(state);
  for (const href of [`${PATIENTS_PATH}/${patient}`, `${PATIENTS_PATH}/${patient}/history`, `${PATIENTS_PATH}/${patient}/prescriptions/new`, `/dashboard/nursing/${patient}`, `/dashboard/treatment-care/${patient}`]) {
    const entered = patientContextHref(href, list);
    const returnedContext = params(entered).get('returnTo');
    assert.equal(returnedContext, list);
    const record = patientContextHref(`${PATIENTS_PATH}/${patient}`, returnedContext);
    assert.equal(patientContextHref(PATIENTS_PATH, params(record).get('returnTo')), list);
  }
});

test('context preserves existing clinical query fields and leaves unrelated navigation unchanged', () => {
  const list = patientListHref(state);
  const href = patientContextHref(`${PATIENTS_PATH}/${patient}/history?historyId=fictitious`, list);
  assert.equal(params(href).get('historyId'), 'fictitious');
  assert.equal(params(href).get('returnTo'), list);
  assert.equal(patientContextHref('/dashboard/inventory', list), '/dashboard/inventory');
  assert.equal(params(patientContextHref(`${PATIENTS_PATH}/${patient}`, '//evil.invalid')).get('returnTo'), PATIENTS_PATH);
});
