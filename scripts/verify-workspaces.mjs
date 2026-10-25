import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

// Exercise the actual services with a fluent Supabase stub. No accounts/data/network.
async function loadService(file, dependencies) {
  let source = readFileSync(new URL('../' + file, import.meta.url), 'utf8')
  source = source.replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  new Function('exports', ...Object.keys(dependencies), js)(exports, ...Object.values(dependencies))
  return exports
}
function database(responses) {
  const calls = []
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'user', email: 'admin@example.test', app_metadata: {}, user_metadata: {} } }, error: null }) }, from(table) {
    calls.push(['from', table])
    const response = responses.shift()
    assert.ok(response, 'unexpected database request')
    const query = new Proxy({}, { get(_, method) {
      if (method === 'then') return Promise.resolve(response).then.bind(Promise.resolve(response))
      return (...args) => { calls.push([method, ...args]); return query }
    } })
    return query
  } }
  return { client, calls }
}
const result = data => ({ data, error: null })

test('pending membership cannot fall back to an existing QSTP profile', async () => {
  const db = database([result({ company_id: 'company-a', role: 'company_admin', status: 'pending' })])
  const auth = await loadService('src/services/authService.ts', { requireSupabase: () => db.client })
  await assert.rejects(auth.getCurrentProfile(), /pending approval/)
  assert.equal(db.calls.some(c => c[0] === 'from' && c[1] === 'profiles'), false)
})
test('active company membership takes priority over legacy recruiter access', async () => {
  const db = database([result({ company_id: 'company-a', role: 'company_admin', status: 'active' }), result({ id: 'company-a', name: 'Company A', slug: 'company-a', status: 'active' })])
  const auth = await loadService('src/services/authService.ts', { requireSupabase: () => db.client })
  assert.equal((await auth.getCurrentProfile()).account_type, 'company')
})
test('existing QSTP recruiter without membership retains access', async () => {
  const db = database([result(null), result({ id: 'user', role: 'recruiter', is_active: true })])
  const auth = await loadService('src/services/authService.ts', { requireSupabase: () => db.client })
  assert.equal((await auth.getCurrentProfile()).account_type, 'qstp')
})
test('company create overrides caller supplied ownership', async () => {
  const db = database([result({ id: 'new-job' })])
  const jobs = await loadService('src/services/jobsService.ts', { requireSupabase: () => db.client, getCurrentProfile: async () => ({ account_type: 'company', company_id: 'company-a' }) })
  await jobs.createJob({ startup_id: 'qstp-startup', company_id: 'company-b', title: 'Role', slug: 'role', status: 'active' })
  const payload = db.calls.find(c => c[0] === 'insert')[1]
  assert.equal(payload.company_id, 'company-a')
  assert.equal(payload.startup_id, null)
  assert.equal(payload.created_by, 'user')
})
test('company job edit is constrained to its own company', async () => {
  const db = database([result(null)])
  const jobs = await loadService('src/services/jobsService.ts', { requireSupabase: () => db.client, getCurrentProfile: async () => ({ account_type: 'company', company_id: 'company-a' }) })
  await assert.rejects(jobs.updateJob('foreign-job', { status: 'draft' }), /do not have access/)
  assert.ok(db.calls.some(c => c[0] === 'eq' && c[1] === 'company_id' && c[2] === 'company-a'))
})
test('unknown company public route never falls back to QSTP jobs', async () => {
  const db = database([result(null)])
  const jobs = await loadService('src/services/jobsService.ts', { requireSupabase: () => db.client, getCurrentProfile: async () => null })
  await assert.rejects(jobs.getPublicJobs('unknown-company'), /not found/)
  assert.equal(db.calls.filter(c => c[0] === 'from' && c[1] === 'jobs').length, 0)
})
test('application detail query constrains the joined job workspace', async () => {
  const db = database([result(null)])
  const apps = await loadService('src/services/applicationsService.ts', { requireSupabase: () => db.client, getWorkspace: async () => ({ account_type: 'company', company_id: 'company-a' }), getRecruiterJobs: async () => [] })
  assert.equal(await apps.getApplicationById('foreign-app'), null)
  assert.ok(db.calls.some(c => c[0] === 'eq' && c[1] === 'job.company_id' && c[2] === 'company-a'))
})
test('file records cannot be requested for an inaccessible application', async () => {
  const db = database([result(null)])
  const apps = await loadService('src/services/applicationsService.ts', { requireSupabase: () => db.client, getWorkspace: async () => ({ account_type: 'company', company_id: 'company-a' }), getRecruiterJobs: async () => [] })
  await assert.rejects(apps.getApplicationFiles('foreign-app'), /access denied/)
  assert.equal(db.calls.some(c => c[0] === 'from' && c[1] === 'application_files'), false)
})

test('company-marked identity without a membership never queries recruiter profiles', async () => {
  const db = database([result(null)])
  db.client.auth.getUser = async () => ({ data: { user: { id: 'orphan', app_metadata: { account_type: 'company' } } }, error: null })
  const auth = await loadService('src/services/authService.ts', { requireSupabase: () => db.client })
  await assert.rejects(auth.getCurrentProfile(), /no active company membership/)
  assert.equal(db.calls.some(c => c[0] === 'from' && c[1] === 'profiles'), false)
})
test('bulk statuses use the atomic RPC and deduplicate application IDs', async () => {
  const calls=[]
  const client={rpc:async(name,args)=>{calls.push([name,args]);return {data:2,error:null}}}
  const apps=await loadService('src/services/applicationsService.ts',{requireSupabase:()=>client,getWorkspace:async()=>null})
  await apps.updateApplicationStatuses(['a','b','a'],'reviewing')
  assert.deepEqual(calls,[['update_workspace_application_statuses',{application_ids:['a','b'],new_status:'reviewing'}]])
})
