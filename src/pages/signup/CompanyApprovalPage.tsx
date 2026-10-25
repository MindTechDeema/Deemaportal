import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { requireSupabase } from '../../lib/supabase'

async function approvalRequest(action: 'inspect' | 'approve', token: string) {
  const { data, error } = await requireSupabase().functions.invoke('approve-company', { body: { action, token } })
  if (error) {
    let detail = 'Unable to process this approval link. It may be expired or already used.'
    if (error.context instanceof Response) { const body = await error.context.json().catch(() => null); if (typeof body?.error === 'string') detail = body.error }
    throw new Error(detail)
  }
  if (!data?.success) throw new Error('This approval link is invalid or expired.')
  return data as { success: boolean; companyName?: string; expiresAt?: string }
}

export default function CompanyApprovalPage() {
  const location = useLocation()
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    // Keep the bearer capability out of subsequent URLs/history/referrers.
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    const previousPolicy = document.querySelector<HTMLMetaElement>('meta[name="referrer"]')
    const policy = previousPolicy ?? document.createElement('meta')
    const previousContent = policy.content
    policy.name = 'referrer'; policy.content = 'no-referrer'
    if (!previousPolicy) document.head.append(policy)
    let live = true
    if (/^[0-9a-f]{64}$/.test(token)) {
      void approvalRequest('inspect', token).then(data => { if (live) setCompanyName(data.companyName ?? '') }).catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Unable to load approval.') }).finally(() => { if (live) setLoading(false) })
    } else {
      // Use a microtask so state transitions remain outside the effect body.
      void Promise.resolve().then(() => { if (live) { setError('This approval link is invalid. Open the complete link from your approval email.'); setLoading(false) } })
    }
    return () => { live = false; if (previousPolicy) policy.content = previousContent; else policy.remove() }
  }, [token])
  const approve = async () => {
    if (submitting || !companyName) return
    setSubmitting(true); setError('')
    try { await approvalRequest('approve', token); setApproved(true) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to approve company.') }
    finally { setSubmitting(false) }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12"><div className="w-full max-w-lg"><div className="mb-7 text-center"><p className="text-3xl font-bold tracking-[0.16em] text-[#0c2f32]">REENO</p><p className="mt-1 text-sm font-semibold text-teal-700">Recruitment Management Platform</p></div><section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
    {approved && <CheckCircle2 className="mx-auto mb-5 size-12 text-teal-700" />}
    <h1 className="text-2xl font-bold text-slate-900">{approved ? 'Company approved' : 'Company registration approval'}</h1>
    {loading ? <p role="status" className="mt-5 text-slate-600">Loading registration…</p> : approved ? <p className="mt-5 text-slate-600">{companyName} is now active. Its administrator can sign in to the company workspace.</p> : companyName && <><p className="mt-5 text-slate-600">Approve <strong>{companyName}</strong> and activate its administrator workspace?</p><button type="button" disabled={submitting} onClick={() => void approve()} className="mt-7 h-11 w-full rounded-lg bg-teal-700 font-semibold text-white disabled:opacity-60">{submitting ? 'Approving…' : 'Approve company'}</button></>}
    {error && <p role="alert" className="mt-5 text-sm text-rose-700">{error}</p>}
    <Link to="/login" className="mt-7 inline-block text-sm font-semibold text-teal-700">Back to Sign In</Link>
  </section></div></main>
}
