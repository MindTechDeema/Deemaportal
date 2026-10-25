import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

// PostgreSQL fixtures exist only inside this disposable WASM instance. This
// script cannot connect to Supabase and never creates real Auth accounts/data.
const db = new PGlite()
let legacyApprovalDefinition
const sql = file => readFileSync(new URL('../supabase/' + file, import.meta.url), 'utf8')
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12,'0')
const hash = value => createHash('sha256').update(value).digest('hex')
const qstp = id(1), userA = id(2), userB = id(3), pendingUser = id(4)
const companyA = id(10), companyB = id(11), pendingCompany = id(12), startup = id(20)
const jobQ = id(30), jobA = id(31), jobB = id(32), draftB = id(33)
const appQ = id(40), appA = id(41), appB = id(42)
const fileQ = `applications/${appQ}/${'c'.repeat(64)}/resume/qstp.pdf`
const fileA = `applications/${appA}/${'a'.repeat(64)}/resume/a.pdf`
const fileB = `applications/${appB}/${'b'.repeat(64)}/cover-letter/b.pdf`
async function as(role, uid, action) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid ?? ''])
  await db.exec(`set role ${role}`)
  try { return await action() } finally { await db.exec('reset role') }
}
const rows = async statement => (await db.query(statement)).rows
before(async () => {
 await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin;
 create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', banned_until timestamptz, updated_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,storage,extensions to anon,authenticated,service_role,supabase_auth_admin;
 grant execute on function auth.uid() to public;
 create table storage.buckets(id text primary key, public boolean not null default false,name text,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text, unique(bucket_id,name));
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
 create function storage.extension(name text) returns text language sql immutable as $$ select (regexp_match(name,'[.]([^./]+)$'))[1] $$;
 -- PGlite has core sha256 but not pgcrypto. These two test-only shims let the
 -- unchanged application RPCs exercise their token logic without an extension.
 create function extensions.digest(value text,algorithm text) returns bytea language sql immutable as $$ select sha256(convert_to(value,'UTF8')) $$;
 create function extensions.gen_random_bytes(size integer) returns bytea language sql volatile as $$ select decode(string_agg(replace(gen_random_uuid()::text,'-',''),''),'hex') from generate_series(1,(size+15)/16) $$;
 alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated,service_role;
 grant all on storage.objects,storage.buckets to anon,authenticated,service_role;
 insert into storage.buckets(id,public) values('application-files',true);
 `)
 for (const file of ['20260731000000_create_startups_and_jobs.sql','20260731010000_add_recruiter_auth.sql','20260731020000_add_job_screening_questions.sql','20260731030000_create_candidate_applications.sql']) {
   await db.exec(sql('migrations/'+file).replace('create extension if not exists pgcrypto;',''))
 }
 // Existing QSTP identity is provisioned by the original trigger before upgrade.
 await db.query('insert into auth.users(id,email) values($1,$2)',[qstp,'qstp@fixture.invalid'])
 // Live company constraints and the service-only legacy RPC exist before upgrade.
 await db.exec(readFileSync(new URL('./fixtures/live-company-schema.sql',import.meta.url),'utf8'))
 legacyApprovalDefinition=(await rows("select pg_get_functiondef('public.process_company_approval(text,text)'::regprocedure) as body"))[0].body
 await db.exec(sql('migrations/20261023000000_company_registration_backend.sql'))
 // Simulate deployed private columns, explicit column grants and unsafe old
 // permissive policies. New restrictive guards must still contain them.
 await db.exec(`
 alter table public.companies add column email text;
 grant select(email) on public.companies to anon,authenticated;
 grant update(job_id) on public.applications to authenticated;
 create policy fixture_legacy_jobs on public.jobs for all to authenticated using(true) with check(true);
 create policy fixture_legacy_applications on public.applications for all to anon,authenticated using(true) with check(true);
 create policy fixture_legacy_files on public.application_files for all to anon,authenticated using(true) with check(true);
 create policy fixture_legacy_storage on storage.objects for all to anon,authenticated using(true) with check(true);
 `)
 for (const file of ['20261024000000_complete_workspace_isolation.sql','20261024010000_workspace_application_updates.sql','20261024020000_company_auth_integration_guard.sql']) await db.exec(sql('migrations/'+file))
 await db.exec(sql('workspace_access_token_hook.sql'))
 for (const [uid,email] of [[userA,'a@fixture.invalid'],[userB,'b@fixture.invalid'],[pendingUser,'pending@fixture.invalid']]) await db.query("insert into auth.users(id,email,raw_app_meta_data,banned_until) values($1,$2,'{\"account_type\":\"company\"}',now()+interval '100 years')",[uid,email])
 await db.query("insert into public.companies(id,name,slug,status) values($1,'A','company-a','active'),($2,'B','company-b','active'),($3,'Pending','pending','pending')",[companyA,companyB,pendingCompany])
 for (const [uid,cid,status] of [[userA,companyA,'active'],[userB,companyB,'active'],[pendingUser,pendingCompany,'invited']]) await db.query("insert into public.company_memberships(company_id,user_id,role,status) values($1,$2,'company_admin',$3)",[cid,uid,status])
 await db.query("insert into public.startups(id,name,slug) values($1,'QSTP Startup','qstp-startup')",[startup])
 for (const [jid,cid,sid,creator,status] of [[jobQ,null,startup,qstp,'active'],[jobA,companyA,null,userA,'active'],[jobB,companyB,null,userB,'active'],[draftB,companyB,null,userB,'draft']]) await db.query("insert into public.jobs(id,company_id,startup_id,created_by,title,slug,location,employment_type,description,status) values($1::uuid,$2,$3,$4,'Role',$1::uuid::text,'Qatar','Internship','Description',$5)",[jid,cid,sid,creator,status])
 for (const [aid,jid] of [[appQ,jobQ],[appA,jobA],[appB,jobB]]) await db.query("insert into public.applications(id,job_id,full_name,email,upload_token_hash) values($1,$2,'Fixture','candidate@fixture.invalid',$3)",[aid,jid,hash(aid===appA?'a'.repeat(64):aid===appQ?'c'.repeat(64):'b'.repeat(64))])
 for (const [aid,path,type] of [[appQ,fileQ,'resume'],[appA,fileA,'resume'],[appB,fileB,'cover_letter']]) { await db.query("insert into public.application_files(application_id,file_type,storage_path,original_filename,mime_type,file_size) values($1,$2,$3,'file.pdf','application/pdf',100)",[aid,type,path]); await db.query("insert into storage.objects(bucket_id,name) values('application-files',$1)",[path]) }
})
after(async () => { await db.close() })

test('all prepared migrations execute in PostgreSQL and make the file bucket private', async () => {
 assert.equal((await rows("select public from storage.buckets where id='application-files'"))[0].public,false)
})
test('company signup never receives a QSTP profile; existing QSTP profile survives', async () => {
 assert.deepEqual((await rows('select id from public.profiles')).map(r=>r.id),[qstp])
})
test('company A reads its applicants/files and no company B or QSTP applicants', async () => {
 await as('authenticated',userA,async()=> {
  assert.deepEqual((await rows('select id from public.applications')).map(r=>r.id),[appA])
  assert.deepEqual((await rows('select storage_path from public.application_files')).map(r=>r.storage_path),[fileA])
  assert.deepEqual((await rows('select name from storage.objects')).map(r=>r.name),[fileA])
 })
})
test('company A cannot read company B draft or mutate a public foreign job', async () => {
 await as('authenticated',userA,async()=> {
  assert.equal((await rows(`select id from public.jobs where id='${draftB}'`)).length,0)
  assert.equal((await rows(`update public.jobs set title='Forged' where id='${jobB}' returning id`)).length,0)
  await assert.rejects(db.exec(`insert into public.jobs(company_id,title,slug,location,employment_type,description,status,created_by) values('${companyB}','Forged','forged','Qatar','Internship','x','draft','${userA}')`),/row-level security/)
  await assert.rejects(db.exec(`update public.jobs set company_id='${companyB}' where id='${jobA}'`),/ownership|row-level security/)
 })
})
test('atomic status RPC rejects mixed-company IDs without partial changes', async () => {
 await as('authenticated',userA,async()=> {
  await assert.rejects(db.query("select public.update_workspace_application_statuses($1,'reviewing')",[[appA,appB]]),/ACCESS_DENIED/)
  assert.equal((await rows(`select status from public.applications where id='${appA}'`))[0].status,'new')
  assert.equal((await db.query("select public.update_workspace_application_statuses($1,'reviewing') as count",[[appA]])).rows[0].count,1)
  await assert.rejects(db.exec(`update public.applications set job_id='${jobB}' where id='${appA}'`),/permission denied/)
 })
})
test('QSTP retains its private applicants but cannot access company applicants or drafts', async () => {
 await as('authenticated',qstp,async()=> {
  assert.deepEqual((await rows('select id from public.applications')).map(r=>r.id),[appQ])
  assert.equal((await rows(`select id from public.jobs where id='${draftB}'`)).length,0)
  assert.equal((await rows(`update public.jobs set title='Forged' where id='${jobA}' returning id`)).length,0)
 })
})
test('legacy accidental recruiter profile cannot bypass pending company gating', async () => {
 await db.query("insert into public.profiles(id,full_name) values($1,'Legacy profile')",[pendingUser])
 await as('authenticated',pendingUser,async()=> {
  assert.equal((await rows('select public.is_active_recruiter() as allowed'))[0].allowed,false)
  assert.equal((await rows('select id from public.applications')).length,0)
  assert.equal((await rows(`update public.company_memberships set status='active' where user_id='${pendingUser}' returning user_id`)).length,0)
 })
})
test('anonymous public RPC accepts published jobs but rejects drafts and inactive companies', async () => {
 await as('anon',null,async()=> {
  assert.equal((await rows('select id from public.applications')).length,0)
  assert.equal((await rows('select id from public.application_files')).length,0)
  assert.equal((await rows('select id from storage.objects')).length,0)
  const payload = {job_id:jobA,full_name:'Candidate',email:'rpc@fixture.invalid'}
  const receipt = (await db.query('select * from public.submit_application($1::jsonb)',[JSON.stringify(payload)])).rows[0]
  assert.ok(receipt.application_id); assert.match(receipt.upload_token,/^[0-9a-f]{64}$/)
  const path = `applications/${receipt.application_id}/${receipt.upload_token}/resume/upload.pdf`
  await db.query("insert into storage.objects(bucket_id,name) values('application-files',$1)",[path])
  await assert.rejects(db.query('select * from public.submit_application($1::jsonb)',[JSON.stringify({...payload,job_id:draftB})]),/JOB_NOT_ACTIVE/)
  await assert.rejects(db.exec(`insert into public.applications(job_id,full_name,email,upload_token_hash) values('${jobA}','Forged','forged@fixture.invalid','hash')`),/row-level security/)
 })
 await db.query("update public.companies set status='suspended' where id=$1",[companyB])
 await as('anon',null,async()=>{ await assert.rejects(db.query('select * from public.submit_application($1::jsonb)',[JSON.stringify({job_id:jobB,full_name:'Candidate',email:'inactive@fixture.invalid'})]),/JOB_NOT_ACTIVE/) })
 await db.query("update public.companies set status='active' where id=$1",[companyB])
})
test('approval functions and registration ledger cannot be accessed by browser roles', async () => {
 await as('authenticated',userA,async()=>{
  await assert.rejects(db.query('select * from public.reeno_inspect_company_approval($1)',[hash('token')]),/permission denied/)
  await assert.rejects(db.exec('select * from public.reeno_company_registrations'),/permission denied/)
  await assert.rejects(db.exec('select email from public.companies'),/permission denied/)
 })
})
test('approval is bound to one company, single-use, and atomically activates membership and Auth identity', async () => {
 const uid=id(80), token=hash('approval-token')
 await db.query("insert into auth.users(id,email,raw_app_meta_data,banned_until) values($1,'approve@fixture.invalid','{\"account_type\":\"company\"}',now()+interval '100 years')",[uid])
 const cid=await as('service_role',null,async()=>(await db.query("select public.reeno_register_company($1,'Approve','approve-fixture','Admin','approve@fixture.invalid',null,'Technology',$2) as id",[uid,token])).rows[0].id)
 await as('service_role',null,async()=> {
  assert.equal((await db.query('select * from public.reeno_inspect_company_approval($1)',[token])).rows.length,1)
  assert.equal((await db.query('select public.reeno_approve_company($1) as id',[token])).rows[0].id,cid)
  await assert.rejects(db.query('select public.reeno_approve_company($1)',[token]),/INVALID_OR_EXPIRED_APPROVAL/)
 })
 assert.equal((await db.query('select banned_until from auth.users where id=$1',[uid])).rows[0].banned_until,null)
 assert.equal((await db.query('select status from public.company_memberships where user_id=$1',[uid])).rows[0].status,'active')
 assert.equal((await db.query('select status from public.companies where id=$1',[pendingCompany])).rows[0].status,'pending')
})
test('Auth hook blocks pending members even with an accidental recruiter profile', async () => {
 await as('supabase_auth_admin',null,async()=> {
  const blocked=(await db.query('select public.workspace_access_token_hook($1::jsonb) as result',[JSON.stringify({user_id:pendingUser,claims:{}})])).rows[0].result
  assert.equal(blocked.error.http_code,403)
  const accepted=(await db.query('select public.workspace_access_token_hook($1::jsonb) as result',[JSON.stringify({user_id:qstp,claims:{sub:qstp}})])).rows[0].result
  assert.equal(accepted.claims.sub,qstp)
 })
})

test('expired approval is rejected without activating its company or membership', async () => {
 const uid=id(81), token=hash('expired-token')
 await db.query("insert into auth.users(id,email,raw_app_meta_data,banned_until) values($1,'expired@fixture.invalid','{\"account_type\":\"company\"}',now()+interval '100 years')",[uid])
 const cid=await as('service_role',null,async()=>(await db.query("select public.reeno_register_company($1,'Expired','expired-fixture','Admin','expired@fixture.invalid',null,'Technology',$2) as id",[uid,token])).rows[0].id)
 await db.query("update public.reeno_company_registrations set expires_at=now()-interval '1 minute' where company_id=$1",[cid])
 await as('service_role',null,async()=>{await assert.rejects(db.query('select public.reeno_approve_company($1)',[token]),/INVALID_OR_EXPIRED_APPROVAL/)})
 assert.equal((await db.query('select status from public.companies where id=$1',[cid])).rows[0].status,'pending')
 assert.notEqual((await db.query('select banned_until from auth.users where id=$1',[uid])).rows[0].banned_until,null)
})
test('company-marked orphan identities cannot use an accidental QSTP profile',async()=>{
 const uid=id(82)
 await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'orphan@fixture.invalid','{\"account_type\":\"company\"}')",[uid])
 await db.query("insert into public.profiles(id,full_name) values($1,'Orphan')",[uid])
 await as('authenticated',uid,async()=>{ assert.equal((await rows('select public.is_active_recruiter() as allowed'))[0].allowed,false);assert.equal((await rows('select id from public.applications')).length,0) })
})
test('registration throttling has an atomic five-attempt window',async()=>{
 await as('service_role',null,async()=>{for(let i=0;i<6;i++){const response=await db.query('select public.reeno_check_registration_limit($1) as allowed',[hash('rate-test')]);assert.equal(response.rows[0].allowed,i<5)}})
})

test('reissuing an expired approval invalidates the old token without activating the company', async () => {
 const cid=(await rows("select company_id from public.reeno_company_registrations where email='expired@fixture.invalid'"))[0].company_id
 const replacement=hash('replacement-token')
 await as('service_role',null,async()=>{
  await db.query('select * from public.reeno_rotate_company_approval($1,$2)',[cid,replacement])
  assert.equal((await db.query('select * from public.reeno_inspect_company_approval($1)',[replacement])).rows.length,1)
  await assert.rejects(db.query('select public.reeno_approve_company($1)',[hash('expired-token')]),/INVALID_OR_EXPIRED_APPROVAL/)
 })
 assert.equal((await db.query('select status from public.companies where id=$1',[cid])).rows[0].status,'pending')
})

test('reapplying the prepared migrations preserves existing records and approval state', async () => {
 const snapshot=()=>rows('select (select count(*) from public.jobs) as jobs,(select count(*) from public.applications) as applications,(select count(*) from public.profiles) as profiles,(select count(*) from public.companies) as companies,(select count(*) from public.reeno_company_registrations where approved_at is not null) as approved')
 const before=await snapshot()
 for(const file of ['20261023000000_company_registration_backend.sql','20261024000000_complete_workspace_isolation.sql','20261024010000_workspace_application_updates.sql']) await db.exec(sql('migrations/'+file))
 assert.deepEqual(await snapshot(),before)
})

test('application RPC rejects executable profile URLs before storing the application', async()=>{
 await as('anon',null,async()=>{await assert.rejects(db.query('select * from public.submit_application($1::jsonb)',[JSON.stringify({job_id:jobA,full_name:'Candidate',email:'unsafe-link@fixture.invalid',linkedin_url:'javascript:alert(1)'})]),/INVALID_APPLICATION_URL/)})
 assert.equal((await rows("select id from public.applications where email='unsafe-link@fixture.invalid'")).length,0)
})

test('metadata-only company signups and conflicting QSTP markers never create recruiter profiles', async()=>{
 assert.equal((await rows("select count(*)::integer as count from pg_proc where pronamespace='public'::regnamespace and proname='handle_new_auth_user'"))[0].count,1)
 for(const [uid,appMetadata,userMetadata] of [
  [id(90),{}, {account_type:'company',full_name:'Legacy Company'}],
  [id(91),{account_type:'qstp'}, {account_type:'company',full_name:'Company Opt Out'}],
  [id(92),{}, {account_type:'qstp',role:'admin',full_name:'Untrusted Recruiter'}],
  [id(93),{company_id:companyA,account_type:'qstp'}, {full_name:'Company Identity'}]
 ]) {
  await db.query('insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values($1,$2,$3::jsonb,$4::jsonb)',[uid,uid+'@fixture.invalid',JSON.stringify(appMetadata),JSON.stringify(userMetadata)])
  assert.equal((await db.query('select id from public.profiles where id=$1',[uid])).rows.length,0)
 }
})
test('trusted QSTP provisioning preserves the full name and ignores user-editable admin roles',async()=>{
 const uid=id(94)
 await db.query('insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values($1,$2,$3::jsonb,$4::jsonb)',[uid,'trusted-qstp@fixture.invalid',JSON.stringify({account_type:'qstp'}),JSON.stringify({full_name:'Trusted Recruiter',role:'admin'})])
 const profile=(await db.query('select full_name,role,is_active from public.profiles where id=$1',[uid])).rows[0]
 assert.deepEqual(profile,{full_name:'Trusted Recruiter',role:'recruiter',is_active:true})
 await as('authenticated',uid,async()=>{assert.equal((await rows('select public.is_active_recruiter() as allowed'))[0].allowed,true)})
})
test('the access token hook denies legacy user-metadata-only company identities with accidental profiles',async()=>{
 const uid=id(90)
 await db.query("insert into public.profiles(id,full_name) values($1,'Accidental Legacy Recruiter')",[uid])
 await as('supabase_auth_admin',null,async()=>{
  const response=(await db.query('select public.workspace_access_token_hook($1::jsonb) as result',[JSON.stringify({user_id:uid,claims:{}})])).rows[0].result
  assert.equal(response.error.http_code,403)
 })
 await as('authenticated',uid,async()=>{assert.equal((await rows('select public.is_active_recruiter() as allowed'))[0].allowed,false)})
})

test('prepared migrations preserve the legacy token table, RPC body and existing permissions',async()=>{
 assert.deepEqual(await rows('select id,token_hash from public.company_approval_tokens'),[])
 const definition=(await rows("select pg_get_functiondef('public.process_company_approval(text,text)'::regprocedure) as body"))[0].body
 assert.equal(definition,legacyApprovalDefinition)
 assert.ok(definition.includes('p_token_hash text, p_decision text'))
 const privileges=(await rows("select has_function_privilege('anon','public.process_company_approval(text,text)','execute') as anon,has_function_privilege('authenticated','public.process_company_approval(text,text)','execute') as authenticated,has_function_privilege('service_role','public.process_company_approval(text,text)','execute') as service_role"))[0]
 assert.deepEqual(privileges,{anon:false,authenticated:false,service_role:true})
})

test('incompatible existing columns abort the first migration before any changes',async()=>{
 const isolated=new PGlite()
 try {
  await isolated.exec("create table public.companies(id text primary key,name text,slug text,status text)")
  await assert.rejects(isolated.exec(sql('migrations/20261023000000_company_registration_backend.sql')),/REENO_SCHEMA_MISMATCH: incompatible type for companies.id/)
  await isolated.exec('rollback')
  assert.equal((await isolated.query("select to_regclass('public.company_memberships') as relation")).rows[0].relation,null)
 } finally {await isolated.close()}
})
test('unexpected required registration columns fail closed without changing records',async()=>{
 await db.exec("alter table public.companies add column legacy_required_field text not null default 'existing'; alter table public.companies alter column legacy_required_field drop default")
 const before=(await rows('select count(*)::integer as count from public.companies'))[0].count
 try {
  await assert.rejects(db.exec(sql('migrations/20261023000000_company_registration_backend.sql')),/REENO_SCHEMA_MISMATCH: registration requires defaults for companies.legacy_required_field/)
  await db.exec('rollback')
  assert.equal((await rows('select count(*)::integer as count from public.companies'))[0].count,before)
 } finally {await db.exec('alter table public.companies drop column legacy_required_field')}
})
test('existing enums must contain the exact required registration status labels',async()=>{
 const isolated=new PGlite()
 try {
  await isolated.exec("create type public.legacy_company_status as enum ('pending_approval','active'); create table public.companies(id uuid primary key default gen_random_uuid(),name text,slug text,status public.legacy_company_status)")
  await assert.rejects(isolated.exec(sql('migrations/20261023000000_company_registration_backend.sql')),/REENO_SCHEMA_MISMATCH: companies.status enum lacks/)
  await isolated.exec('rollback')
 } finally {await isolated.close()}
})
test('single compatibility query is read-only and tolerates missing migration history',async()=>{
 await db.exec('begin read only')
 try {
  const result=(await db.query(sql('workspace_compatibility_check.sql'))).rows[0].reeno_compatibility_report
  assert.equal(result.migration_history_present,false)
  assert.ok(result.functions.some(f=>f.signature==='process_company_approval(text,text)'))
  assert.ok(result.columns.some(c=>c.table==='public.companies'&&c.name==='id'))
 } finally {await db.exec('rollback')}
})

test('QSTP storage reads include its own resume and exclude both companies',async()=>{
 await as('authenticated',qstp,async()=>{assert.deepEqual((await rows('select name from storage.objects')).map(r=>r.name),[fileQ])})
})
test('company B storage reads include its own cover letter and exclude QSTP and company A',async()=>{
 await as('authenticated',userB,async()=>{assert.deepEqual((await rows('select name from storage.objects')).map(r=>r.name),[fileB])})
})
test('the named legacy storage policy now explicitly checks QSTP job ownership',async()=>{
 const policy=(await rows("select qual from pg_policies where schemaname='storage' and tablename='objects' and policyname='recruiters read application files'"))[0].qual
 assert.ok(policy.includes('company_id IS NULL'))
 assert.ok(policy.includes('storage_path = objects.name'))
})
test('invalid upload capabilities are denied for anonymous and authenticated callers',async()=>{
 for(const [role,uid] of [['anon',null],['authenticated',userA]]) await as(role,uid,async()=>{
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('application-files',$1)",['applications/'+appQ+'/'+'d'.repeat(64)+'/resume/forged.pdf']),/row-level security/)
 })
})

 test('live application constraint permits technical assessment after migration',async()=>{
 await as('authenticated',userA,async()=>assert.equal((await db.query("select public.update_workspace_application_statuses($1,'technical_assessment') as count",[[appA]])).rows[0].count,1))
 })
 test('active employees retain own workspace file reads without administrative writes',async()=>{
 const employee=id(96);
 await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'employee@fixture.invalid','{\"account_type\":\"company\"}')",[employee]);
 await db.query("insert into public.company_memberships(company_id,user_id,role,status) values($1,$2,'employee','active')",[companyA,employee]);
 await as('authenticated',employee,async()=>{
 assert.equal((await rows(`select count(*)::integer as count from public.applications a join public.jobs j on j.id=a.job_id where j.company_id is distinct from '${companyA}'::uuid`))[0].count,0);
 assert.ok((await rows('select id from public.applications')).some(r=>r.id===appA));
 assert.deepEqual((await rows('select name from storage.objects')).map(r=>r.name),[fileA]);
 assert.equal((await rows(`update public.applications set status='hired' where id='${appA}' returning id`)).length,0);
 await assert.rejects(db.query("select public.update_workspace_application_statuses($1,'hired')",[[appA]]),/ACCESS_DENIED/);
 });
 })

test('legacy tokens survive migration reapplication and retain expiry and single-use behavior',async()=>{
 const cid=id(97),expired=id(98);
 await db.query("insert into public.companies(id,name,slug,status) values($1,'Legacy','legacy-token-fixture','pending'),($2,'Expired legacy','expired-legacy-token-fixture','pending')",[cid,expired]);
 await db.query("insert into public.company_approval_tokens(company_id,token_hash,expires_at) values($1,'legacy-valid',now()+interval '1 hour'),($2,'legacy-expired',now()-interval '1 hour')",[cid,expired]);
 await db.exec(sql('migrations/20261023000000_company_registration_backend.sql'));
 assert.equal((await rows('select count(*)::integer as count from public.company_approval_tokens'))[0].count,2);
 await as('service_role',null,async()=>{
 assert.equal((await rows("select public.process_company_approval('legacy-expired','approved') as result"))[0].result,'invalid_or_expired_token');
 assert.equal((await rows("select public.process_company_approval('legacy-valid','approved') as result"))[0].result,'approved');
 assert.equal((await rows("select public.process_company_approval('legacy-valid','approved') as result"))[0].result,'invalid_or_expired_token');
 });
 assert.equal((await db.query('select status from public.companies where id=$1',[expired])).rows[0].status,'pending');
})
