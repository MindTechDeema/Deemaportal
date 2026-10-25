
import type { Session, User } from '@supabase/supabase-js'
import { requireSupabase } from '../lib/supabase'
import type { RecruiterProfile } from '../types/database'

export interface CompanyProfile {
  id: string
  full_name: string
  role: 'company_admin' | 'employee'
  organization: string
  is_active: boolean
  company_id: string
  company_slug: string
  account_type: 'company'
}

export type WorkspaceProfile =
  | (RecruiterProfile & { account_type: 'qstp' })
  | CompanyProfile

export interface SignInResult {
  user: User
  session: Session
  profile: WorkspaceProfile
}

function authMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback

  const detail = error.message.toLowerCase()

  if (detail.includes('invalid login credentials')) {
    return 'The email or password is incorrect.'
  }

  if (detail.includes('banned') || detail.includes('approval') || detail.includes('hook')) {
    return 'Your company registration is pending approval or your account is inactive. Contact REENO support if you have already been approved.'
  }

  if (detail.includes('fetch') || detail.includes('network')) {
    return 'Unable to reach the authentication service. Check your connection and try again.'
  }

  return fallback
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await requireSupabase().auth.getSession()

  if (error) {
    throw new Error(
      authMessage(error, 'Unable to restore your session. Please sign in again.')
    )
  }

  return data.session
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await requireSupabase().auth.getUser()

  if (error) {
    throw new Error(
      authMessage(error, 'Your session has expired. Please sign in again.')
    )
  }

  return data.user
}

export async function getCurrentProfile(): Promise<WorkspaceProfile> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  const supabase = requireSupabase()

  // Membership takes precedence over any legacy auto-created recruiter profile.
  const { data: membership, error: membershipError } = await supabase
    .from('company_memberships')
    .select('company_id, role, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    throw new Error('Unable to load your company membership.')
  }

  if (!membership) {
    if (user.app_metadata?.account_type === 'company' || user.app_metadata?.company_id || user.user_metadata?.account_type === 'company') {
      throw new Error('Your company registration is pending approval or no active company membership is available.')
    }
    // First, check for an existing QSTP recruiter.
    const { data: recruiterData, error: recruiterError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (recruiterError) {
      throw new Error('Unable to load your account profile. Please try again.')
    }

    if (recruiterData) {
      const recruiter = recruiterData as RecruiterProfile

      if (
        !recruiter.is_active ||
        !['recruiter', 'admin'].includes(recruiter.role)
      ) {
        throw new Error('This recruiter account is inactive or unauthorized.')
      }

      return {
        ...recruiter,
        account_type: 'qstp',
      }
    }


    throw new Error('Your company registration is pending approval or no active workspace is available.')
  }
  if (!['company_admin', 'employee'].includes(membership.role)) throw new Error('Your workspace role is not authorized.')
  if (membership.status !== 'active') throw new Error('Your company registration is pending approval or inactive.')

  // Company information is only readable after approval.
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, slug, status')
    .eq('id', membership.company_id)
    .maybeSingle()

  if (companyError) {
    throw new Error('Unable to verify your company approval status.')
  }

  if (!company || company.status !== 'active') {
    throw new Error(
      'Your company registration is pending approval or is not currently active.'
    )
  }

  return {
    id: user.id,
    full_name:
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : user.email ?? 'Company User',
    role: membership.role as 'company_admin' | 'employee',
    organization: company.name,
    is_active: true,
    company_id: company.id,
    company_slug: company.slug,
    account_type: 'company',
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<SignInResult> {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error || !data.user || !data.session) {
    throw new Error(
      authMessage(error, 'Unable to sign in. Please try again.')
    )
  }

  try {
    return {
      user: data.user,
      session: data.session,
      profile: await getCurrentProfile(),
    }
  } catch (reason) {
    await requireSupabase().auth.signOut()
    throw reason
  }
}

export async function signOut(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut()

  if (error) {
    throw new Error('Unable to sign out. Please try again.')
  }
}
