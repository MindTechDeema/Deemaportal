import { getCurrentProfile } from './authService'

import { requireSupabase } from '../lib/supabase'
import type {
  CreateJobInput,
  JobStatus,
  JobWithStartup,
  Startup,
} from '../types/database'

export const jobSelect = '*, startup:startups(*), company:companies(id,name,slug)'

const message = (operation: string, detail?: string) =>
  `Unable to ${operation}${detail ? `: ${detail}` : '. Please try again.'}`

type Workspace =
  | { account_type: 'qstp' }
  | { account_type: 'company'; company_id: string }

export async function getWorkspace(): Promise<Workspace> {
 const profile = await getCurrentProfile()
 return profile.account_type === 'company' ? { account_type: 'company', company_id: profile.company_id } : { account_type: 'qstp' }
}

export async function getStartups(): Promise<Startup[]> {
  const workspace = await getWorkspace()

  if (workspace.account_type === 'company') {
    return []
  }

  const { data, error } = await requireSupabase()
    .from('startups')
    .select('*')
    .order('name')

  if (error) {
    throw new Error(message('load startups', error.message))
  }

  return (data ?? []) as Startup[]
}

export async function getRecruiterJobs(): Promise<JobWithStartup[]> {
  const workspace = await getWorkspace()

  let query = requireSupabase()
    .from('jobs')
    .select('*, startup:startups(*), company:companies(id,name,slug), applications(count)')

  if (workspace.account_type === 'company') {
    query = query.eq('company_id', workspace.company_id)
  } else {
    query = query.is('company_id', null)
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  })

  if (error) {
    throw new Error(message('load jobs', error.message))
  }

  return ((data ?? []) as (JobWithStartup & { applications: { count: number }[] })[]).map(({ applications, ...job }) => ({ ...job, application_count: applications?.[0]?.count ?? 0 }))
}

export async function getPublicJobs(companySlug?: string): Promise<JobWithStartup[]> {
  const company = companySlug ? await getPublicCompany(companySlug) : null
  if (companySlug && !company) throw new Error('Company careers page not found.')
  let query = requireSupabase().from('jobs').select(jobSelect)
  query = company ? query.eq('company_id', company.id) : query.is('company_id', null)
  const { data, error } = await query
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(message('load jobs', error.message))
  }

  return (data ?? []) as JobWithStartup[]
}

export async function getPublicJobBySlug(
  slug: string, companySlug?: string
): Promise<JobWithStartup | null> {
  const company = companySlug ? await getPublicCompany(companySlug) : null
  if (companySlug && !company) throw new Error('Company careers page not found.')
  let query = requireSupabase().from('jobs').select(jobSelect)
  query = company ? query.eq('company_id', company.id) : query.is('company_id', null)
  const { data, error } = await query
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throw new Error(message('load this job', error.message))
  }

  return data as JobWithStartup | null
}

export async function getJobById(
  id: string
): Promise<JobWithStartup | null> {
  const workspace = await getWorkspace()

  let query = requireSupabase()
    .from('jobs')
    .select(jobSelect)
    .eq('id', id)

  if (workspace.account_type === 'company') {
    query = query.eq('company_id', workspace.company_id)
  } else {
    query = query.is('company_id', null)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(message('load this job', error.message))
  }

  return data as JobWithStartup | null
}

// Explicit fields prevent runtime payloads from changing creator/tenant columns.
function jobFields(input: CreateJobInput): CreateJobInput {
 return { startup_id: input.startup_id, title: input.title, slug: input.slug, department: input.department, location: input.location, employment_type: input.employment_type, work_arrangement: input.work_arrangement, deadline: input.deadline, openings: input.openings, description: input.description, qualifications: input.qualifications, requirements: input.requirements, status: input.status, screening_questions: input.screening_questions }
}

export async function createJob(
  input: CreateJobInput
): Promise<JobWithStartup> {
  const workspace = await getWorkspace()

  const { data: userData, error: userError } =
    await requireSupabase().auth.getUser()

  if (userError || !userData.user) {
    throw new Error('You must be signed in to create a job.')
  }

  const payload: CreateJobInput & { company_id: string | null; created_by?: string } = {
    ...jobFields(input),
    created_by: userData.user.id,
    published_at:
      input.status === 'active'
        ? (input.published_at ?? new Date().toISOString())
        : null,
    ...(workspace.account_type === 'company'
      ? {
          startup_id: null,
          company_id: workspace.company_id,
        }
      : {
          company_id: null,
        }),
  }

  const { data, error } = await requireSupabase()
    .from('jobs')
    .insert(payload)
    .select(jobSelect)
    .single()

  if (error) {
    if (error.code === '42501') {
      throw new Error(
        'Your account is not authorized to create jobs in this workspace.'
      )
    }

    throw new Error(
      'Unable to create the job. Check the job details and try again.'
    )
  }

  return data as JobWithStartup
}

export async function updateJob(
  id: string,
  input: CreateJobInput
): Promise<JobWithStartup> {
  const workspace = await getWorkspace()

  const { data: userData, error: userError } =
    await requireSupabase().auth.getUser()

  if (userError || !userData.user) {
    throw new Error('You must be signed in to update a job.')
  }

  const payload: CreateJobInput & { company_id: string | null; created_by?: string } = {
    ...jobFields(input),
    published_at:
      input.status === 'active'
        ? (input.published_at ?? new Date().toISOString())
        : null,
    ...(workspace.account_type === 'company'
      ? {
          startup_id: null,
          company_id: workspace.company_id,
        }
      : {
          company_id: null,
        }),
  }

  let query = requireSupabase()
    .from('jobs')
    .update(payload)
    .eq('id', id)

  if (workspace.account_type === 'company') {
    query = query.eq('company_id', workspace.company_id)
  } else {
    query = query.is('company_id', null)
  }

  const { data, error } = await query
    .select(jobSelect)
    .maybeSingle()

  if (error) {
    if (error.code === '42501') {
      throw new Error(
        'Your account is not authorized to update jobs in this workspace.'
      )
    }

    throw new Error(
      'Unable to update the job. Check the job details and try again.'
    )
  }

  if (!data) {
    throw new Error(
      'This job no longer exists or you do not have access to it.'
    )
  }

  return data as JobWithStartup
}

export async function updateJobStatus(
  id: string,
  status: JobStatus
): Promise<JobWithStartup> {
  const workspace = await getWorkspace()

  const changes = {
    status,
    published_at:
      status === 'active' ? new Date().toISOString() : null,
  }

  let query = requireSupabase()
    .from('jobs')
    .update(changes)
    .eq('id', id)

  if (workspace.account_type === 'company') {
    query = query.eq('company_id', workspace.company_id)
  } else {
    query = query.is('company_id', null)
  }

  const { data, error } = await query
    .select(jobSelect)
    .maybeSingle()

  if (error) {
    throw new Error(message('update the job status', error.message))
  }

  if (!data) {
    throw new Error('Job not found or access denied.')
  }

  return data as JobWithStartup
}

export async function getPublicCompany(slug: string) {
 const { data, error } = await requireSupabase().from('companies').select('id,name,slug').eq('slug', slug).eq('status', 'active').maybeSingle()
 if (error) throw new Error('Unable to load company careers.')
 return data as { id: string; name: string; slug: string } | null
}
export const careersPath = (slug?: string) => slug ? '/companies/' + encodeURIComponent(slug) + '/careers' : '/careers'
