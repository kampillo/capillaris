const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('reflect-metadata');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { AppointmentsService } = require('../../apps/api/src/modules/appointments/appointments.service');
const { PatientsService } = require('../../apps/api/src/modules/patients/patients.service');

test('dashboard queries the complete local day and nearest five upcoming appointments', async () => {
  const queries = [];
  const rows = Array.from({ length: 105 }, (_, i) => ({ id: String(i) }));
  const service = new AppointmentsService({ appointment: { findMany: async (query) => {
    queries.push(query);
    return query.take ? rows.slice(0, query.take) : rows;
  } } }, {});
  const result = await service.dashboard('2026-09-10T07:00:00Z', '2026-09-11T07:00:00Z');
  assert.equal(result.today.length, 105);
  assert.equal(result.upcoming.length, 5);
  assert.equal(queries[0].where.startDatetime.gte.toISOString(), '2026-09-10T07:00:00.000Z');
  assert.equal(queries[0].where.startDatetime.lt.toISOString(), '2026-09-11T07:00:00.000Z');
  assert.equal(queries[1].orderBy.startDatetime, 'asc');
  assert.deepEqual(queries[1].where.status.in, ['scheduled', 'confirmed', 'rescheduled']);
});

test('dashboard rejects invalid, reversed, missing and oversized date ranges before querying', async () => {
  const service = new AppointmentsService({ appointment: { findMany: () => assert.fail('Must not query') } }, {});
  for (const [start, end] of [[undefined, undefined], ['invalid', '2026-09-11'], ['2026-09-11', '2026-09-10'], ['2026-09-10', '2026-09-12']]) {
    await assert.rejects(service.dashboard(start, end), /Rango de día inválido/);
  }
});

test('patient totals remain separate from the five recent records', async () => {
  let query;
  const service = new PatientsService({ patient: { findUnique: async (args) => {
    query = args;
    return { id: 'patient', _count: { appointments: 12 }, appointments: Array(5).fill({}) };
  } }, procedureReport: { groupBy: async () => [] } });
  const result = await service.findOne('patient');
  assert.equal(query.include._count.select.appointments, true);
  assert.equal(query.include.appointments.take, 5);
  assert.equal(result._count.appointments, 12);
});

test('patient procedure count combines ungrouped reports and distinct multi-day sessions', async () => {
  let query;
  const service = new PatientsService({
    patient: { findUnique: async () => ({ id: 'patient', _count: { procedureReports: 10 } }) },
    procedureReport: { groupBy: async (args) => {
      query = args;
      return [
        { sessionGroupId: null, _count: { _all: 5 } },
        { sessionGroupId: 'two-days', _count: { _all: 2 } },
        { sessionGroupId: 'three-days', _count: { _all: 3 } },
      ];
    } },
  });
  const result = await service.findOne('patient');
  assert.deepEqual(query.where, { patientId: 'patient' });
  assert.deepEqual(query.by, ['sessionGroupId']);
  assert.equal(result.procedureCount, 7);
  assert.equal(result._count.procedureReports, 10);
});

test('patients without procedures have zero interventions', async () => {
  const service = new PatientsService({
    patient: { findUnique: async () => ({ id: 'patient' }) },
    procedureReport: { groupBy: async () => [] },
  });
  assert.equal((await service.findOne('patient')).procedureCount, 0);
});

test('missing or deleted patients do not query procedure groups', async () => {
  for (const patient of [null, { id: 'patient', deletedAt: new Date() }]) {
    const service = new PatientsService({
      patient: { findUnique: async () => patient },
      procedureReport: { groupBy: () => assert.fail('Must not query') },
    });
    await assert.rejects(service.findOne('patient'), /not found/);
  }
});
