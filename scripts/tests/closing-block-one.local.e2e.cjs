// Real HTTP/JWT/Prisma checks against a new synthetic loopback database only.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const url = new URL(process.env.CAPILLARIS_TEST_DATABASE_URL || 'invalid:');
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '55439');
assert.match(url.pathname, /^\/capillaris_closing_test(?:_\d+)?$/);
process.env.DATABASE_URL = url.href;
process.env.JWT_SECRET = 'only-for-disposable-loopback-tests';
process.env.NODE_ENV = 'test'; process.env.SMTP_HOST = ''; process.env.GOOGLE_CLIENT_ID = ''; process.env.GOOGLE_CLIENT_SECRET = '';
require('reflect-metadata'); require('ts-node').register({project:path.join(root,'apps/api/tsconfig.json'),transpileOnly:true});
const { NestFactory } = require('@nestjs/core'); const { ValidationPipe } = require('@nestjs/common');
const { PrismaClient } = require('@prisma/client'); const { AppModule } = require('../../apps/api/src/app.module');
const { PrismaExceptionFilter, PrismaValidationFilter } = require('../../apps/api/src/common/filters/prisma-exception.filter');
const { NotificationsService } = require('../../apps/api/src/modules/notifications/notifications.service');
const bcrypt = require('bcrypt'); const db = new PrismaClient(); let app, base; let checks=0;
const localPassword = 'Local-QA-Only-2026!';
const evidenceDir = path.join(root,'../qa-closing'); fs.mkdirSync(evidenceDir,{recursive:true});
async function response(account,method,route,body) {
  return fetch(base+route,{method,headers:{'Content-Type':'application/json',...(account?.token?{Authorization:`Bearer ${account.token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
async function request(account,method,route,body,expected=200) {
  const res=await response(account,method,route,body); const data=await res.json().catch(()=>null);
  assert.equal(res.status,expected,`${method} ${route}: ${res.status} ${res.status>=400?JSON.stringify(data):''}`);checks++;return data;
}
async function user(label,roles) {
  const roleRows=await Promise.all(roles.map(name=>db.role.upsert({where:{name},create:{name,displayName:name},update:{}})));
  const row=await db.user.create({data:{nombre:'Ficticio',apellido:label,email:`${label}@example.invalid`,passwordHash:await bcrypt.hash(localPassword,4),userRoles:{create:roleRows.map(role=>({roleId:role.id}))}}});
  const auth=await request(null,'POST','/auth/login',{email:row.email,password:localPassword});return {id:row.id,email:row.email,token:auth.accessToken,user:auth.user};
}
async function main() {
  assert.equal((await db.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public'")).length,0,'Refusing a non-empty test DB');
  execFileSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--schema=apps/api/prisma/schema.prisma'],{cwd:root,env:process.env,stdio:'inherit'});
  app=await NestFactory.create(AppModule,{logger:['error']}); app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true,transformOptions:{enableImplicitConversion:true}}));
  app.useGlobalFilters(new PrismaExceptionFilter(),new PrismaValidationFilter());
  app.enableCors({origin:['http://127.0.0.1:3300'],credentials:true}); await app.listen(process.argv.includes('--serve')?3301:0,'127.0.0.1'); base=`${await app.getUrl()}/api/v1`;
  const admin=await user('admin',['admin']);const doctor=await user('doctor',['doctor']);const reception=await user('reception',['receptionist']);const inventory=await user('inventory',['inventory_manager']);const nurse=await user('nurse',['nurse']);
  const patient=await request(reception,'POST','/patients',{nombre:'Ficticia',apellido:'Conciliación',email:'patient@example.invalid',celular:'+52 (55) 0000 0000',fechaNacimiento:'1990-02-01',edadApproximada:true,ciudad:'Ciudad ficticia',tipoPaciente:'active',notasInternas:'PRIVATE SYNTHETIC NOTE',driveFolderUrl:'https://drive.google.com/drive/u/0/folders/fake_QA_folder?resourcekey=fake_key&usp=sharing'},201);
  assert.equal(patient.celularNormalized,'525500000000'); assert.equal(patient.driveFolderUrl,'https://drive.google.com/drive/folders/fake_QA_folder?resourcekey=fake_key');
  const found=await request(reception,'GET','/patients/search?query=525500000000');assert.deepEqual(found.data.map(p=>p.id),[patient.id]);assert.equal('notasInternas' in found.data[0],false);
  for(const url of ['https://evil.invalid/drive/folders/fake','javascript:alert(1)','https://drive.google.com/file/d/fake/view']) await request(reception,'PUT',`/patients/${patient.id}`,{driveFolderUrl:url},400);
  await request(reception,'PUT',`/patients/${patient.id}`,{fechaNacimiento:'2026-02-31'},400);
  await request(reception,'PUT',`/patients/${patient.id}`,{celular:null,driveFolderUrl:null,ciudad:null});
  const cleared=await db.patient.findUniqueOrThrow({where:{id:patient.id}});assert.equal(cleared.celularNormalized,null);assert.equal(cleared.driveFolderUrl,null);assert.equal(cleared.edadApproximada,true);
  await request(reception,'PUT',`/patients/${patient.id}`,{celular:'+52 55 0000 0000',driveFolderUrl:'https://drive.google.com/drive/folders/fake_QA_folder?resourcekey=fake_key'});
  const minimal=await request(inventory,'GET',`/patients/${patient.id}`);assert.deepEqual(Object.keys(minimal).sort(),['apellido','celular','email','id','nombre']);
  for(const route of ['patients','procedures','appointments','prescriptions','sources','clinical']) await request(inventory,'GET',`/reports/${route}`,undefined,403);
  await request(inventory,'GET','/reports/inventory');await request(nurse,'GET','/patients',undefined,403);
  await request(doctor,'GET','/patients/export',undefined,403);await request(null,'GET','/patients/export',undefined,401);
  await request(admin,'GET','/patients?pageSize=0',undefined,400); await request(admin,'GET','/patients/search?pageSize=201',undefined,400);
  // More than a visible page, leading zeros and formula-looking text all survive as text.
  await db.patient.createMany({data:Array.from({length:26},(_,i)=>({nombre:i===0?'=HYPERLINK("fake")':'Ficticia',apellido:`Export${String(i).padStart(2,'0')}`,celular:'0012345',legacyId:i+1,tipoPaciente:'active'}))});
  await db.patient.create({data:{nombre:'Excluida',apellido:'Eliminada',tipoPaciente:'active',deletedAt:new Date()}});
  const exported=await response(admin,'GET','/patients/export?tipoPaciente=active&page=2&pageSize=1');assert.equal(exported.status,200);checks++;
  assert.match(exported.headers.get('content-type'),/spreadsheetml/);assert.equal(exported.headers.get('cache-control'),'no-store');
  const file=path.join(evidenceDir,'synthetic-patient-export.xlsx');fs.writeFileSync(file,Buffer.from(await exported.arrayBuffer()));
  execFileSync('python3',['-c',`import zipfile,xml.etree.ElementTree as E,sys
z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
for f in z.namelist(): E.fromstring(z.read(f))
r=E.fromstring(z.read('xl/worksheets/sheet2.xml'));rows=r.findall('s:sheetData/s:row',ns);assert len(rows)==28
text=z.read('xl/worksheets/sheet2.xml').decode();assert '0012345' in text and '=HYPERLINK' in text;assert '<f>' not in text and 'PRIVATE SYNTHETIC' not in text and 'Excluida' not in text
assert len(E.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',ns))==2
print('PASS XLSX: ZIP CRC/XML, 27 filtered rows beyond page, identifiers/leading zeros, inline text, no clinical notes')`,file],{stdio:'inherit'});
  const dates={patientId:patient.id,doctorId:doctor.id,startDatetime:'2026-10-03T10:00:00Z',endDatetime:'2026-10-03T11:00:00Z'};
  await request(admin,'POST','/appointments',{...dates,endDatetime:dates.startDatetime},400);await request(admin,'POST','/appointments',{...dates,status:'unknown'},400);
  const appointment=await request(admin,'POST','/appointments',dates,201); await request(admin,'PUT',`/appointments/${appointment.id}`,{startDatetime:'2026-10-03T12:00:00Z'},400);
  const product=await db.product.create({data:{name:'Ficticio',minStockAlert:5,stockBalance:{create:{currentQuantity:5}}}});
  assert.ok((await request(inventory,'GET','/inventory/low-stock')).some(p=>p.id===product.id));
  const exits=await Promise.all([1,2].map(()=>response(inventory,'POST','/inventory/movements',{productId:product.id,movementType:'salida',reason:'merma',quantity:4})));
  assert.deepEqual(exits.map(r=>r.status).sort(),[201,400]);checks+=2;assert.equal((await db.stockBalance.findUniqueOrThrow({where:{productId:product.id}})).currentQuantity,1);assert.equal(await db.stockMovement.count({where:{productId:product.id}}),1);
  await request(inventory,'POST','/inventory/movements',{productId:product.id,movementType:'ajuste',reason:'ajuste_manual',quantity:1},400);
  const prescription=await request(doctor,'POST','/prescriptions',{patientId:patient.id,doctorId:doctor.id,prescriptionDate:'2026-10-01',items:[{medicineName:'Ficticio',dosage:'1',requiresRefill:true,refillReminderDays:30}]},201);
  const item=prescription.items[0]; const updated=await request(doctor,'PUT',`/prescriptions/${prescription.id}`,{items:[{id:item.id,medicineName:item.medicineName,dosage:'2',requiresRefill:true,refillReminderDays:30}]});assert.equal(updated.items[0].id,item.id);assert.equal(updated.items[0].dispensed,false);
  await db.prescriptionItem.update({where:{id:item.id},data:{dispensed:true}});
  await request(doctor,'PUT',`/prescriptions/${prescription.id}`,{items:[]},400);await request(doctor,'PUT',`/prescriptions/${prescription.id}`,{items:[{id:item.id,medicineName:item.medicineName,dosage:'3'}]},400);
  await request(doctor,'PUT',`/prescriptions/${prescription.id}`,{items:[{id:item.id,medicineName:item.medicineName,dispensed:false}]},400);assert.equal((await db.prescriptionItem.findUniqueOrThrow({where:{id:item.id}})).dispensed,true);
  const reminder=await request(admin,'POST','/reminders',{patientId:patient.id,reminderType:'general',scheduledFor:'2020-01-01T00:00:00Z',channel:'email'},201);
  await request(admin,'POST','/reminders',{patientId:patient.id,reminderType:'general',scheduledFor:'not-a-date'},400);await request(admin,'POST','/reminders',{patientId:patient.id,reminderType:'general',scheduledFor:'2020-01-01',channel:'whatsapp'},400);await request(admin,'PUT',`/reminders/${reminder.id}`,{status:'sent'},400);
  await app.get(NotificationsService).processReminders();assert.equal((await db.reminder.findUniqueOrThrow({where:{id:reminder.id}})).status,'failed');
  const now=new Date();const month=now.toISOString().slice(0,7);const day1=`${month}-01`,day2=`${month}-02`;
  const a=await request(nurse,'POST',`/nursing/patients/${patient.id}/procedures`,{patientId:patient.id,procedureDate:day1,doctorIds:[doctor.id],cb1:10,cb2:20},201);
  const b=await request(nurse,'POST',`/nursing/patients/${patient.id}/procedures`,{patientId:patient.id,procedureDate:day2,doctorIds:[doctor.id],cb1:5,cb3:10},201);
  await request(admin,'POST',`/procedures/${a.id}/session`,{withId:b.id},201);
  await request(nurse,'PUT',`/nursing/procedures/${a.id}/participants`,{nurseIds:[nurse.id]});
  const report=await request(doctor,'GET',`/reports/procedures?startDate=${month}-01&endDate=${month}-28`);assert.equal(report.totalFollicles,45);assert.equal(report.totalProcedures,1);
  await request(doctor,'GET','/reports/procedures?startDate=bad',undefined,400);
  const oldToken=reception.token;await request(reception,'PUT','/auth/me',{nombre:'Ficticia Actualizada'});await request(reception,'PUT','/auth/me',{roleId:'00000000-0000-4000-8000-000000000000'},400);await request(reception,'PUT','/auth/me',{nombre:'  '},400);
  await request(reception,'PUT','/auth/password',{currentPassword:'wrong',newPassword:'New-Local-QA-Only-2026!'},401);
  await request(reception,'PUT','/auth/password',{currentPassword:localPassword,newPassword:'New-Local-QA-Only-2026!'});await request({token:oldToken},'GET','/auth/me',undefined,401);
  const relogin=await request(null,'POST','/auth/login',{email:reception.email,password:'New-Local-QA-Only-2026!'});reception.token=relogin.accessToken;
  await request(reception,'POST','/auth/logout');await request(reception,'GET','/auth/me',undefined,401);
  const oauth=await request(doctor,'GET','/google/auth');assert.equal(new URL(oauth.url).searchParams.get('state').length,43);assert.equal(await db.googleOAuthState.count(),1);await request(null,'GET',`/google/callback?code=fake&state=${admin.id}`,undefined,400);assert.equal(await db.googleToken.count(),0);
  const inactive=await request(admin,'DELETE',`/users/${reception.id}`);assert.equal('passwordHash' in inactive,false);const reactivated=await request(admin,'POST',`/users/${reception.id}/reactivate`,undefined,201);assert.equal('passwordHash' in reactivated,false);
  const audits=await db.auditLog.findMany();assert.ok(audits.some(a=>a.action==='EXPORT'));assert.ok(audits.some(a=>a.entityType==='patient' && a.userId===reception.id));assert.equal(JSON.stringify(audits).includes('$2b$'),false);
  const survivor=await db.patient.create({data:{nombre:'Ficticio',apellido:'Conservado',celular:'original',celularNormalized:'original'}});
  const absorbed=await db.patient.create({data:{nombre:'Ficticio',apellido:'Absorbido'}});
  await request(admin,'POST',`/patients/${survivor.id}/merge`,{absorbedId:absorbed.id,campos:{celular:'+52 55 1111 1111',fechaNacimiento:'1991-01-01',edadApproximada:true}},201);
  const mergeRow=await db.patient.findUniqueOrThrow({where:{id:absorbed.id}});assert.ok(mergeRow.mergedFieldSnapshot);
  assert.equal((await db.patient.findUniqueOrThrow({where:{id:survivor.id}})).celularNormalized,'525511111111');
  const undone=await request(admin,'POST',`/patients/${absorbed.id}/unmerge`,{},201);assert.equal(undone.demographicsRestored,true);
  const restored=await db.patient.findUniqueOrThrow({where:{id:survivor.id}});assert.equal(restored.celular,'original');assert.equal(restored.celularNormalized,'original');assert.equal(restored.fechaNacimiento,null);assert.equal(restored.edadApproximada,false);
  await request(admin,'POST',`/patients/${survivor.id}/merge`,{absorbedId:absorbed.id,campos:{email:'resolved@example.invalid'}},201);
  await request(admin,'PUT',`/patients/${survivor.id}`,{email:'later@example.invalid'});
  await request(admin,'POST',`/patients/${absorbed.id}/unmerge`,{},409);assert.ok((await db.patient.findUniqueOrThrow({where:{id:absorbed.id}})).deletedAt);
  await request(admin,'POST',`/patients/${survivor.id}/merge`,{absorbedId:patient.id,campos:{driveFolderUrl:'https://evil.invalid/drive/folders/fake'}},400);
  const legacy=await db.patient.create({data:{nombre:'Ficticio',apellido:'Fusión histórica',mergedIntoId:survivor.id,deletedAt:new Date()}});
  const legacyUndo=await request(admin,'POST',`/patients/${legacy.id}/unmerge`,{},201);assert.equal(legacyUndo.requiresManualReview,true);assert.equal(legacyUndo.demographicsRestored,false);
  const pendingState=await db.googleOAuthState.findFirstOrThrow();await db.googleOAuthState.update({where:{digest:pendingState.digest},data:{expiresAt:new Date(0)}});
  await request(null,'GET',`/google/callback?code=fake&state=${new URL(oauth.url).searchParams.get('state')}`,undefined,400);assert.equal(await db.googleToken.count(),0);
  fs.writeFileSync(path.join(evidenceDir,'fixtures.json'),JSON.stringify({base,patientId:patient.id,accounts:{admin,doctor,inventory,nurse},password:localPassword},null,2));
  fs.writeFileSync(path.join(evidenceDir,'result.json'),JSON.stringify({httpChecks:checks,status:'passed',xlsxRows:27,localDatabase:url.pathname,realExternalCalls:0},null,2));
  console.log(`PASS block one: ${checks} HTTP checks, real JWT/Prisma, migrations, concurrency, permissions, Drive, XLSX, follicles, recipes and reminders; synthetic DB only`);
  if(process.argv.includes('--serve')){console.log(`UI QA READY ${base}`);await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});}
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(async()=>{if(app)await app.close();await db.$disconnect();});
