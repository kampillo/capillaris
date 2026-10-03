// Real Nest/JWT/Prisma/audit integration test. Only a dedicated EMPTY loopback DB.
// Run with CAPILLARIS_TEST_DATABASE_URL; --serve retains synthetic fixtures for UI QA.
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const testUrl = new URL(process.env.CAPILLARIS_TEST_DATABASE_URL || 'invalid:');
assert.equal(testUrl.hostname, '127.0.0.1');
assert.equal(testUrl.pathname, '/capillaris_enfermeria_test');
assert.equal(testUrl.port, '55439');
process.env.DATABASE_URL = testUrl.href;
process.env.JWT_SECRET = 'only-for-disposable-loopback-tests';
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = '';
require('reflect-metadata');
require('ts-node').register({project:path.join(root,'apps/api/tsconfig.json'),transpileOnly:true});
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { PrismaClient } = require('@prisma/client');
const { AppModule } = require('../../apps/api/src/app.module');
const bcrypt = require('bcrypt');
const db = new PrismaClient();
let app;
let base;
const localPassword = 'Local-QA-Only-2026!';
async function request(token, method, route, body, expected = 200) {
  const response = await fetch(`${base}${route}`, {method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body === undefined ? {} : {body:JSON.stringify(body)})});
  const result = await response.json().catch(()=>null);
  assert.equal(response.status, expected, `${method} ${route}: ${response.status} ${response.status >= 400 ? JSON.stringify(result) : ''}`);
  return result;
}
async function user(label, roles) {
  const roleRows = await Promise.all(roles.map(name=>db.role.upsert({where:{name},create:{name,displayName:name},update:{}})));
  const row = await db.user.create({data:{nombre:'Ficticio',apellido:label,email:`${label}@example.invalid`,passwordHash:await bcrypt.hash(localPassword, 4),userRoles:{create:roleRows.map(role=>({roleId:role.id}))}}});
  const auth = await request(null,'POST','/auth/login',{email:row.email,password:localPassword});
  return {...row,token:auth.accessToken};
}
async function main() {
  const existing = await db.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  assert.equal(existing.length, 0, 'Refusing non-empty test database');
  execFileSync(path.join(root,'node_modules/.bin/prisma'),['migrate','deploy','--schema=apps/api/prisma/schema.prisma'],{cwd:root,env:process.env,stdio:'inherit'});
  app = await NestFactory.create(AppModule,{logger:['error']});
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true,transformOptions:{enableImplicitConversion:true}}));
  app.enableCors({origin:['http://127.0.0.1:3300','http://localhost:3300'],credentials:true});
  await app.listen(process.argv.includes('--serve') ? 3301 : 0,'127.0.0.1');
  base = `${await app.getUrl()}/api/v1`;
  const admin = await user('admin',['admin']);
  const nurse = await user('nurse',['nurse']);
  const colleague = await user('nurse2',['nurse']);
  const therapist = await user('treatments',['treatment_staff']);
  const doctor = await user('doctor',['doctor']);
  const mixed = await user('mixed',['admin','treatment_staff']);
  const patient = await db.patient.create({data:{nombre:'Ficticia',apellido:'Prueba Clínica',fechaNacimiento:new Date('1990-01-02'),notasInternas:'PRIVATE DO NOT EXPOSE',email:'patient@example.invalid'}});
  const other = await db.patient.create({data:{nombre:'Ficticio',apellido:'Otro'}});
  const deleted = await db.patient.create({data:{nombre:'Ficticio',apellido:'Eliminado',deletedAt:new Date()}});
  const types = await Promise.all(['PRP','DUT','MICRO'].map((code,orden)=>db.treatmentType.create({data:{code,name:code,orden}})));
  const zone = await db.hairType.create({data:{name:'Frontal'}});
  for (const account of [nurse,therapist,mixed]) {
    for (const route of ['/patients','/appointments','/inventory','/reports/procedures','/users','/catalog/doctors','/clinical-histories','/prescriptions','/micropigmentations','/hairmedicines']) await request(account.token,'GET',route,undefined,403);
    await request(account.token,'POST','/patients',{},403);
    await request(account.token,'POST','/auth/register',{},403);
  }
  await request(nurse.token,'GET','/treatment-care/patients?query=Ficticia',undefined,403);
  await request(therapist.token,'GET','/nursing/patients?query=Ficticia',undefined,403);
  await request(mixed.token,'GET','/nursing/patients?query=Ficticia',undefined,403);
  await request(null,'GET','/nursing/patients?query=Ficticia',undefined,401);
  console.log('PASS HTTP: isolated and mixed roles deny unrelated modules and anonymous access');
  for (const [account,area] of [[nurse,'nursing'],[therapist,'treatment-care']]) {
    assert.deepEqual(await request(account.token,'GET',`/${area}/patients`),[]);
    const list = await request(account.token,'GET',`/${area}/patients?query=Ficticia%20Clínica`);
    assert.deepEqual(list.map(p=>p.id),[patient.id]);
    assert.deepEqual(Object.keys(list[0]).sort(),['apellido','edadApproximada','fechaNacimiento','id','nombre']);
    await request(account.token,'GET',`/${area}/patients/${deleted.id}`,undefined,404);
  }
  assert.equal(await db.nursingAssignment.count(),0);
  const reports = [];
  for (const [date,account] of [['2090-08-31',nurse],['2090-09-01',colleague]]) {
    const r = await request(account.token,'POST',`/nursing/patients/${patient.id}/procedures`,{patientId:patient.id,procedureDate:date,doctorIds:[doctor.id],cb1:2,cb2:3,totalFoliculos:5},201);
    reports.push(r.id);
    assert.equal(await db.procedureReportNurse.count({where:{procedureId:r.id}}),0, 'Access is not participation');
    await request(account.token,'PUT',`/nursing/procedures/${r.id}/participants`,{nurseIds:[account.id]});
  }
  await request(admin.token,'POST',`/procedures/${reports[0]}/session`,{withId:reports[1]},201);
  await request(colleague.token,'PUT',`/nursing/patients/${patient.id}/procedures/${reports[0]}`,{descripcion:'Edición ficticia por compañera',doctorIds:[doctor.id]});
  const first = await db.procedureReport.findUniqueOrThrow({where:{id:reports[0]},include:{nurses:true,doctors:true}});
  assert.equal(first.createdBy,nurse.id); assert.equal(first.updatedBy,colleague.id);
  assert.equal(first.sessionDay,1); assert.deepEqual(first.nurses.map(n=>n.nurseId),[nurse.id]); assert.equal(first.doctors[0].doctorId,doctor.id);
  const second = await db.procedureReport.findUniqueOrThrow({where:{id:reports[1]},include:{nurses:true}});
  assert.equal(second.sessionGroupId,first.sessionGroupId); assert.equal(second.sessionDay,2); assert.deepEqual(second.nurses.map(n=>n.nurseId),[colleague.id]);
  await request(nurse.token,'PUT',`/nursing/patients/${other.id}/procedures/${reports[0]}`,{},404);
  await request(nurse.token,'PUT',`/nursing/patients/${patient.id}/procedures/${reports[0]}`,{procedureDate:'2090-09-03'},400);
  await request(nurse.token,'PUT',`/nursing/procedures/${reports[0]}/participants`,{nurseIds:[therapist.id]},400);
  await request(nurse.token,'PUT',`/nursing/patients/${patient.id}/procedures/${reports[0]}`,{createdBy:admin.id},400);
  await request(nurse.token,'POST',`/nursing/patients/${patient.id}/assignments`,{nurseId:nurse.id},404);
  await db.user.update({where:{id:nurse.id},data:{isActive:false}});
  await request(colleague.token,'PUT',`/nursing/procedures/${reports[0]}/participants`,{nurseIds:[nurse.id]});
  await request(nurse.token,'GET','/auth/me',undefined,401);
  const surgery = await request(colleague.token,'GET',`/nursing/patients/${patient.id}`);
  const read = surgery.procedures.find(p=>p.id===reports[0]);
  assert.equal(read.capturedBy.id,nurse.id); assert.equal(read.editedBy.id,colleague.id);
  assert.equal('email' in surgery.patient,false); assert.equal('email' in read.capturedBy,false);
  assert.equal(surgery.nurses.some(n=>n.id===nurse.id),false);
  console.log('PASS SQL+HTTP: unassigned surgery create/edit, day-specific participants, authors, grouping, inactive history and account revocation');
  const created = await request(therapist.token,'POST',`/treatment-care/patients/${patient.id}/treatments`,{
    patientId:patient.id,fecha:'2090-09-01',treatmentTypeIds:types.map(t=>t.id),zonaIds:[zone.id],realizadoPorId:therapist.id,sesionNumero:4,descripcion:'Aplicación ficticia',comentarios:'No clínico',duracion:45,dilucion:'prueba',
  },201);
  assert.deepEqual(Object.keys(created),['id']);
  await request(therapist.token,'PUT',`/treatment-care/patients/${patient.id}/treatments/${created.id}`,{fecha:'2090-09-02',comentarios:'Editado',duracion:null,zonaIds:[],treatmentTypeIds:[types[2].id],realizadoPorId:doctor.id});
  const treatment = await db.treatment.findUniqueOrThrow({where:{id:created.id},include:{tipos:true,zonas:true}});
  assert.equal(treatment.createdBy,therapist.id); assert.equal(treatment.updatedBy,therapist.id); assert.equal(treatment.realizadoPorId,doctor.id);
  assert.equal(treatment.sesionNumero,4); assert.equal(treatment.fecha.toISOString().slice(0,10),'2090-09-02'); assert.equal(treatment.duracion,null);
  assert.equal(treatment.zonas.length,0); assert.equal(treatment.tipos[0].treatmentTypeId,types[2].id);
  for (const body of [{createdBy:admin.id},{patientId:other.id},{sesionNumero:0},{diagnostico:'forged'},{fecha:null}]) await request(therapist.token,'PUT',`/treatment-care/patients/${patient.id}/treatments/${created.id}`,body,400);
  await request(therapist.token,'PUT',`/treatment-care/patients/${other.id}/treatments/${created.id}`,{},404);
  await request(therapist.token,'PUT',`/treatment-care/patients/${patient.id}/treatments/${created.id}`,{realizadoPorId:colleague.id},400);
  await request(therapist.token,'DELETE',`/treatments/${created.id}`,undefined,403);
  await db.treatmentType.update({where:{id:types[2].id},data:{activo:false}});
  await request(therapist.token,'PUT',`/treatment-care/patients/${patient.id}/treatments/${created.id}`,{treatmentTypeIds:[types[2].id]});
  const history = await request(therapist.token,'GET',`/treatment-care/patients/${patient.id}`);
  assert.equal(history.treatments[0].tipos[0].treatmentType.code,'MICRO');
  assert.equal(history.treatments[0].capturedBy.id,therapist.id);
  assert.equal('email' in history.treatments[0].realizadoPor,false); assert.equal('notasInternas' in history.patient,false);
  for (const [entityType,entityId] of [['procedureReport',reports[0]],['treatment',created.id]]) {
    const audits = await db.auditLog.findMany({where:{entityType,entityId}});
    assert.ok(audits.some(a=>a.action==='CREATE' && a.userId));
    assert.ok(audits.some(a=>a.action==='UPDATE' && a.userId));
  }
  console.log('PASS SQL+HTTP: PRP/DUT/MICRO, session >3, edit/clear, responsible vs author, minimum data, audit attribution, no delete/diagnosis/ownership bypass');
  if (process.argv.includes('--serve')) {
    await db.user.update({where:{id:nurse.id},data:{isActive:true}});
    await db.treatmentType.update({where:{id:types[2].id},data:{activo:true}});
    console.log(`UI QA READY at ${base}; synthetic patient ${patient.id}; local-only users nurse@example.invalid and treatments@example.invalid`);
    await new Promise(resolve=>{ process.once('SIGINT',resolve); process.once('SIGTERM',resolve); });
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{ if(app)await app.close();await db.$disconnect(); });
