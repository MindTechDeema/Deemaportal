import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

function evaluate(file, dependencies) {
 const source = readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm,'').replace(/^Deno\.serve\([^\n]+\)\s*$/gm,'')
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
 const exports={};new Function('exports',...Object.keys(dependencies),js)(exports,...Object.values(dependencies));return exports
}
const environment={APP_ORIGIN:'https://reeno.fixture.invalid',SUPABASE_URL:'https://supabase.fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-key',RESEND_API_KEY:'fixture-mail',APPROVAL_EMAIL_FROM:'approvals@fixture.invalid',APPROVAL_EMAIL_TO:'supervisor@fixture.invalid'}
function setup(options={}) {
 const calls=[]
 const client={
  rpc:async(name,args)=>{calls.push([name,args]);if(name==='reeno_check_registration_limit')return {data:options.rateLimited?false:true,error:null};if(name==='reeno_register_company')return {data:options.registrationFails?null:'fixture-company',error:options.registrationFails?{message:'private database details'}:null};if(name==='reeno_inspect_company_approval')return {data:[{company_name:'Company A',expires_at:'2026-10-26T00:00:00Z'}],error:null};if(name==='reeno_approve_company')return {error:null};throw new Error('Unexpected RPC '+name)},
  auth:{admin:{createUser:async payload=>{calls.push(['createUser',payload]);return options.existingEmail?{data:{user:null},error:{message:'User already exists'}}:{data:{user:{id:'new-identity'}},error:null}},deleteUser:async uid=>{calls.push(['deleteUser',uid]);return {error:null}}}},
  from:name=>({update:payload=>({eq:async(key,value)=>{calls.push(['update',name,payload,key,value]);return {error:null}}})})
 }
 const shared=evaluate('supabase/functions/_shared/company.ts',{createClient:()=>client,Deno:{env:{get:key=>(options.environment ?? environment)[key]}}})
 const fetch=async(url,init)=>{calls.push(['mail',url,JSON.parse(init.body)]);return new Response('{}',{status:options.mailFails?503:200})}
 return {calls,shared,register:evaluate('supabase/functions/register-company/index.ts',{...shared,fetch}).handleRegisterCompany,approve:evaluate('supabase/functions/approve-company/index.ts',shared).handleApproveCompany}
}
const request=(body,method='POST',origin=environment.APP_ORIGIN)=>new Request('https://supabase.fixture.invalid/functions/v1/company',{method,headers:{Origin:origin,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})})
const registration={companyName:'Company A',fullName:'Admin A',email:'admin@fixture.invalid',industry:'Technology',website:'https://company.fixture.invalid',password:'StrongPassword123!'}

test('registration creates a banned company identity and hashes its approval capability',async()=>{
 const {register,calls,shared}=setup();const response=await register(request({...registration,role:'admin',status:'active',company_id:'foreign'}));assert.equal(response.status,200)
 const creation=calls.find(c=>c[0]==='createUser')[1];assert.equal(creation.app_metadata.account_type,'company');assert.deepEqual(creation.user_metadata,{account_type:'company',full_name:registration.fullName});assert.equal(creation.ban_duration,'876000h')
 const saved=calls.find(c=>c[0]==='reeno_register_company')[1];assert.equal(saved.admin_id,'new-identity');assert.match(saved.approval_hash,/^[0-9a-f]{64}$/);assert.equal(saved.role,undefined)
 const mail=calls.find(c=>c[0]==='mail')[2];const approvalUrl=new URL(mail.text.match(/https:[^\s]+#token=[0-9a-f]{64}/)[0]);assert.equal(approvalUrl.origin,environment.APP_ORIGIN);assert.equal(approvalUrl.pathname,'/signup/approve');
 const token=mail.text.match(/#token=([0-9a-f]{64})/)[1];assert.equal(await shared.sha256(token),saved.approval_hash)
 const body=await response.json();assert.deepEqual(body,{success:true,approvalEmailSent:true});assert.equal(JSON.stringify(body).includes(token),false)
})
test('registration does not adopt or modify an existing email identity',async()=>{
 const {register,calls}=setup({existingEmail:true});assert.equal((await register(request(registration))).status,400)
 assert.equal(calls.some(c=>c[0]==='reeno_register_company'||c[0]==='deleteUser'),false)
})
test('failed registration cleans up only its newly created identity',async()=>{
 const {register,calls}=setup({registrationFails:true});const response=await register(request(registration));assert.equal(response.status,503)
 assert.deepEqual(calls.find(c=>c[0]==='deleteUser'),['deleteUser','new-identity']);assert.equal((await response.text()).includes('private database details'),false)
})
test('mail failure leaves the registration pending and explicitly reports notification failure',async()=>{
 const {register,calls}=setup({mailFails:true});const response=await register(request(registration));assert.deepEqual(await response.json(),{success:true,approvalEmailSent:false})
 assert.equal(calls.some(c=>c[0]==='reeno_approve_company'||c[0]==='deleteUser'),false)
})
test('rate limited and invalid registrations create no Auth identity',async()=>{
 for(const options of [{rateLimited:true},{}]) {const {register,calls}=setup(options);const body=options.rateLimited?registration:{...registration,website:'javascript:alert(1)'};assert.ok((await register(request(body))).status>=400);assert.equal(calls.some(c=>c[0]==='createUser'),false)}
})
test('GET requests and email link scanners cannot approve a company',async()=>{
 const {approve,calls}=setup();assert.equal((await approve(request(null,'GET'))).status,405);assert.equal(calls.length,0)
})
test('inspection is read-only and approval ignores a forged company ID',async()=>{
 const {approve,calls,shared}=setup();const token='a'.repeat(64)
 assert.equal((await approve(request({action:'inspect',token}))).status,200);assert.equal(calls.some(c=>c[0]==='reeno_approve_company'),false)
 assert.equal((await approve(request({action:'approve',token,companyId:'foreign-company'}))).status,200)
 assert.deepEqual(calls.find(c=>c[0]==='reeno_approve_company')[1],{approval_hash:await shared.sha256(token)})
})
test('invalid tokens and cross-origin approval requests are rejected before database access',async()=>{
 const {approve,calls}=setup();assert.equal((await approve(request({action:'approve',token:'short'}))).status,400)
 assert.equal((await approve(request({action:'approve',token:'a'.repeat(64)},'POST','https://foreign.fixture.invalid'))).status,403);assert.equal(calls.length,0)
})
test('body-size validation bounds streamed requests without relying on Content-Length',async()=>{
 const {shared}=setup();await assert.rejects(shared.readBody(request({large:'x'.repeat(17000)})),/too large/)
})

 test('both trusted origins receive preflight without credentials or backend configuration',async()=>{
 for(const origin of ['http://localhost:5173','https://reeno.vercel.app']) {
 const {register,approve,calls}=setup({environment:{}});
 for(const handler of [register,approve]) {
 const response=await handler(new Request('https://supabase.fixture.invalid/functions/v1/company',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,x-client-info,apikey,content-type'}}));
 assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 assert.equal(response.headers.get('Vary'),'Origin');
 for(const header of ['authorization','x-client-info','apikey','content-type']) assert.ok(response.headers.get('Access-Control-Allow-Headers').includes(header));
 assert.ok(response.headers.get('Access-Control-Allow-Methods').includes('POST'));
 }
 assert.equal(calls.length,0);
 }
 })
 test('trusted origins receive CORS on registration success and all handler error paths',async()=>{
 for(const origin of ['http://localhost:5173','https://reeno.vercel.app']) {
 for(const [options,body,status] of [[{},registration,200],[{environment:{}},registration,503],[{environment:{...environment,APP_ORIGIN:'bad-url'}},registration,500],[{}, {...registration,password:'weak'},400],[{rateLimited:true},registration,429],[{registrationFails:true},registration,503],[{existingEmail:true},registration,400]]) {
 const {register}=setup(options);const response=await register(request(body,'POST',origin));
 assert.equal(response.status,status);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 }
 const {register}=setup();const response=await register(request(null,'GET',origin));assert.equal(response.status,405);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 }
 })
 test('untrusted origins are rejected without reflecting an allow-origin header',async()=>{
 const {register,calls}=setup();
 for(const origin of ['https://foreign.fixture.invalid','https://reeno.vercel.app.attacker.invalid','http://localhost:5174','null']) {
 for(const method of ['OPTIONS','POST']) {
 const response=await register(request(registration,method,origin));assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
 }
 }
 assert.equal(calls.length,0);
 })
