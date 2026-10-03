const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('reflect-metadata');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { procedureTotals, normalizeDriveFolderUrl } = require('@capillaris/shared');
const { patientValues } = require('../../apps/api/src/modules/patients/patient-values');
const { ReportsService } = require('../../apps/api/src/modules/reports/reports.service');
const { NotificationsService } = require('../../apps/api/src/modules/notifications/notifications.service');
const { GoogleCalendarService } = require('../../apps/api/src/modules/google-calendar/google-calendar.service');
const { requireJwtSecret } = require('../../apps/api/src/config/jwt.config');
const { JwtStrategy } = require('../../apps/api/src/modules/auth/strategies/jwt.strategy');
const { maskSensitive } = require('../../apps/api/src/common/audit/sensitive-fields');

test('Drive link rejects non-folders, credentials, foreign hosts and protocols; keeps access resourcekey', () => {
  assert.equal(normalizeDriveFolderUrl('https://drive.google.com/drive/u/0/folders/fake_Folder-1?usp=sharing&resourcekey=fake-key'), 'https://drive.google.com/drive/folders/fake_Folder-1?resourcekey=fake-key');
  assert.equal(normalizeDriveFolderUrl(''), null);
  for (const url of ['javascript:alert(1)', 'http://drive.google.com/drive/folders/fake', 'https://drive.google.com.evil.invalid/drive/folders/fake', 'https://user@drive.google.com/drive/folders/fake', 'https://drive.google.com/file/d/fake/view', 'https://drive.google.com:8443/drive/folders/fake']) assert.throws(() => normalizeDriveFolderUrl(url));
});
test('phone capture and clear maintain normalized search values, without inferring country', () => {
  assert.deepEqual(patientValues({ celular: '+52 (55) 0000 0000' }), { celular: '+52 (55) 0000 0000', celularNormalized: '525500000000' });
  assert.deepEqual(patientValues({ celular: '' }), { celular: null, celularNormalized: null });
  assert.deepEqual(patientValues({ celular: null }), { celular: null, celularNormalized: null });
});
test('DOB conversion rejects rollover/future dates and preserves explicit approximate quality', () => {
  const result = patientValues({ fechaNacimiento: '1990-03-01', edadApproximada: true });
  assert.equal(result.fechaNacimiento.toISOString(), '1990-03-01T00:00:00.000Z'); assert.equal(result.edadApproximada, true);
  for (const fechaNacimiento of ['2026-02-31','2090-01-01','not-a-date']) assert.throws(() => patientValues({ fechaNacimiento }));
});
test('follicles distinguish missing/zero/manual/CB and weight hairs by count', () => {
  assert.deepEqual(procedureTotals({}), { follicles: null, hairs: null, coefficient: null, source: null });
  assert.equal(procedureTotals({ cb1: 0 }).follicles, 0);
  assert.deepEqual(procedureTotals({ cb1: 10, cb2: 20, cb3: 30, cb4: 40 }), { follicles: 100, hairs: 300, coefficient: 3, source: 'cb' });
  assert.equal(procedureTotals({ cb1: 100, totalFoliculos: 0 }).follicles, 0);
  assert.equal(procedureTotals({ cb1: 100, totalFoliculos: 500 }).follicles, 500);
});
test('report includes last-day timestamps, excludes next day and uses fallback inside two-day intervention', async () => {
  const rows = [{ id:'a', patientId:'p', procedureDate:new Date('2026-09-30T20:00Z'), sessionGroupId:'g', totalFoliculos:null, cb1:10, cb2:20, doctors:[] }, { id:'b',patientId:'p',procedureDate:new Date('2026-10-01T10:00Z'),sessionGroupId:'g',totalFoliculos:40,doctors:[] }];
  const service = new ReportsService({ procedureReport: { findMany: async ({where}) => where.sessionGroupId ? rows : rows.filter(row => (where.OR ?? [where]).some(w => (!w.procedureDate.gte || row.procedureDate >= w.procedureDate.gte) && (!w.procedureDate.lt || row.procedureDate < w.procedureDate.lt))) } });
  const result = await service.getProceduresReport('2026-09-01','2026-09-30');
  assert.equal(result.totalFollicles,70); assert.equal(result.totalProcedures,1); assert.equal(result.proceduresWithFollicles,1);
  const next = await service.getProceduresReport('2026-10-01','2026-10-01'); assert.equal(next.totalProcedures,0);
  await assert.rejects(service.getProceduresReport('bad','2026-09-30'), e => e.getStatus() === 400);
});
test('JWT must be configured and accepts only current token version and current roles', async () => {
  for (const value of [undefined,'','short']) assert.throws(() => requireJwtSecret(value));
  const row = { id:'u',email:'qa@example.invalid',isActive:true,deletedAt:null,authVersion:2,userRoles:[{role:{name:'nurse'}}] };
  const strategy = new JwtStrategy({get:()=> 'synthetic-only-not-used-in-production'}, {user:{findUnique:async()=>row}});
  await assert.rejects(strategy.validate({sub:'u',authVersion:1}), e => e.getStatus() === 401);
  assert.deepEqual((await strategy.validate({sub:'u',authVersion:2,roles:['admin']})).roles,['nurse']);
});
test('audit masks credential fields in conditions and retains timestamps', () => {
  const date = new Date('2026-01-01'); const result = maskSensitive({ where:{passwordHash:'FAKE_HASH'},data:{newPassword:'FAKE_PASSWORD',createdAt:date,digest:'FAKE_DIGEST'} });
  assert.equal(result.where.passwordHash,'***'); assert.equal(result.data.newPassword,'***'); assert.equal(result.data.digest,'***'); assert.equal(result.data.createdAt,date.toISOString());
});
test('OAuth states bind to initiating user, expire and cannot be replayed or replaced by a user ID', async () => {
  let saved; let claimed = false; let exchanges = 0; let linked;
  const service = new GoogleCalendarService({get:()=>undefined}, {
    googleOAuthState:{deleteMany:async({where})=>{ if (!where.digest) return {count:0}; if(claimed) return {count:0}; claimed=true; return {count:1}; },create:async({data})=>{saved=data;},findUnique:async()=>saved},
    user:{findUnique:async()=>({isActive:true,deletedAt:null})},googleToken:{upsert:async args=>{linked=args.where.userId;}}
  });
  service.oauth2Client = {generateAuthUrl:args=>`https://accounts.google.com?state=${args.state}`,getToken:async()=>{exchanges++;return {tokens:{access_token:'FAKE_TOKEN'}};}};
  const url = new URL(await service.getAuthUrl('initiator')); const state=url.searchParams.get('state');
  assert.equal(state.length,43);assert.equal(saved.userId,'initiator');assert.notEqual(saved.digest,state);
  await assert.rejects(service.handleCallback('fake-code','other-user'));assert.equal(exchanges,0);
  await service.handleCallback('fake-code',state);assert.equal(linked,'initiator');
  await assert.rejects(service.handleCallback('fake-code',state));assert.equal(exchanges,1);
});
test('missing SMTP fails due email and unsupported WhatsApp instead of reporting sent; duplicate claims skip', async () => {
  const fixture = {id:'r',status:'pending',channel:'email',reminderType:'general',patientId:'p',patient:{email:'qa@example.invalid',nombre:'Ficticia',apellido:'Prueba'}};
  const updates=[]; let canClaim=true;
  const service = new NotificationsService({reminder:{findMany:async()=>[fixture],updateMany:async()=>({count:canClaim?1:0}),update:async({data})=>updates.push(data)}});
  service.transporter=null;
  await service.processReminders();assert.equal(updates.at(-1).status,'failed');assert.equal(updates.some(row=>row.status==='sent'),false);
  fixture.channel='whatsapp';await service.processReminders();assert.equal(updates.at(-1).status,'failed');
  const before=updates.length;canClaim=false;await service.processReminders();assert.equal(updates.length,before);
});
