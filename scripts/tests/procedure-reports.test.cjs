const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('reflect-metadata');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { ReportsService } = require('../../apps/api/src/modules/reports/reports.service');

const doctor = id => ({ doctor: { id, nombre: id, apellido: 'Test' } });
const row = (id, date, group, follicles, doctors = [doctor('A')]) => ({
  id, patientId: 'p', procedureDate: new Date(date), sessionGroupId: group,
  totalFoliculos: follicles, doctors,
});
function service(rows) {
  function matches(row, where) {
    if (where.OR) return where.OR.some(w => matches(row, w));
    if (where.sessionGroupId) return where.sessionGroupId.in.includes(row.sessionGroupId);
    const date = where.procedureDate;
    return !date || ((!date.gte || row.procedureDate >= date.gte) && (!date.lte || row.procedureDate <= date.lte));
  }
  return new ReportsService({ procedureReport: {
    findMany: async ({ where }) => rows.filter(row => matches(row, where)),
  } });
}

test('a month-boundary intervention belongs entirely to the first-day month', async () => {
  const reports = service([
    row('a', '2026-01-31', 'g', 1000),
    row('b', '2026-02-01', 'g', 500, [doctor('A'), doctor('B')]),
    row('c', '2026-02-12', null, 200),
  ]);
  const january = await reports.getProceduresReport('2026-01-01', '2026-01-31');
  assert.equal(january.totalProcedures, 1);
  assert.equal(january.totalFollicles, 1500);
  assert.equal(january.averageFollicles, 1500);
  assert.deepEqual(january.byDoctor, [{ name: 'A Test', count: 1 }, { name: 'B Test', count: 1 }]);
  const february = await reports.getProceduresReport('2026-02-01', '2026-02-28');
  assert.equal(february.totalProcedures, 1);
  assert.equal(february.previousTotal, 1);
  assert.equal(february.totalFollicles, 200);
  assert.deepEqual(february.byDoctor, [{ name: 'A Test', count: 1 }]);
});

test('second day alone does not count; first day includes the full group', async () => {
  const reports = service([row('a', '2026-12-31', 'g', 100), row('b', '2027-01-01', 'g', 50)]);
  const second = await reports.getProceduresReport('2027-01-01', '2027-01-01');
  assert.equal(second.totalProcedures, 0);
  assert.equal(second.previousTotal, 1);
  assert.equal(second.totalFollicles, null);
  const first = await reports.getProceduresReport('2026-12-31', '2026-12-31');
  assert.equal(first.totalProcedures, 1);
  assert.equal(first.totalFollicles, 150);
});

test('ungrouped reports stay independent, missing follicle values stay null, zeros stay zero', async () => {
  const reports = service([row('a', '2026-01-01', null, null), row('b', '2026-01-01', null, 0)]);
  const result = await reports.getProceduresReport();
  assert.equal(result.totalProcedures, 2);
  assert.equal(result.previousTotal, null);
  assert.equal(result.totalFollicles, 0);
  assert.equal(result.averageFollicles, 0);
  const empty = await service([]).getProceduresReport();
  assert.equal(empty.totalProcedures, 0);
  assert.equal(empty.averageFollicles, null);
});

test('unbounded and one-sided filters count groups once and average per intervention', async () => {
  const reports = service([row('a', '2026-01-31', 'g', 100), row('b', '2026-02-01', 'g', 50), row('c', '2026-02-02', null, 50)]);
  const all = await reports.getProceduresReport();
  assert.equal(all.totalProcedures, 2);
  assert.equal(all.averageFollicles, 100);
  assert.equal((await reports.getProceduresReport('2026-02-01')).totalProcedures, 1);
  assert.equal((await reports.getProceduresReport(undefined, '2026-01-31')).totalFollicles, 150);
});

test('nursing participation is distinct per intervention, not per day or capturing user', async () => {
  const nurse = id => ({ nurse: { id, nombre: id, apellido: 'Nurse' } });
  const reports = service([
    { ...row('a', '2026-08-31', 'g', 100), nurses: [nurse('N1')], createdBy: 'capturer' },
    { ...row('b', '2026-09-01', 'g', 50), nurses: [nurse('N1'), nurse('N2')] },
    { ...row('c', '2026-09-05', null, 50), nurses: [nurse('N2')] },
  ]);
  assert.deepEqual((await reports.getProceduresReport('2026-08-01', '2026-08-31')).byNurse, [{ name: 'N1 Nurse', count: 1 }, { name: 'N2 Nurse', count: 1 }]);
  assert.deepEqual((await reports.getProceduresReport('2026-09-01', '2026-09-30')).byNurse, [{ name: 'N2 Nurse', count: 1 }]);
});
