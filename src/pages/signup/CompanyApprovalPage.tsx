
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { requireSupabase } from '../../lib/supabase'

type ApprovalAction = 'inspect' | 'approve' | 'deny'
type Decision = 'approved' | 'denied' | null

type ApprovalResponse = {
  success: boolean
  companyName?: string
  expiresAt?: string
  emailSent?: boolean
}

async function approvalRequest(
  action: ApprovalAction,
  token: string
): Promise<ApprovalResponse> {
  const { data, error } = await requireSupabase().functions.invoke(
    'approve-company',
    { body: { action, token } }
  )

  if (error) {
    let detail =
      'Unable to process this approval link. It may be expired or already used.'

    if (error.context instanceof Response) {
      const body = await error.context.json().catch(() => null)
      if (typeof body?.error === 'string') {
        detail = body.error
      }
    }

    throw new Error(detail)
  }

  if (!data?.success) {
    throw new Error('This approval link is invalid or expired.')
  }

  return data as ApprovalResponse
}

export default function CompanyApprovalPage() {
  const location = useLocation()

  const [token] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get('token') ?? ''
  )

  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [decision, setDecision] = useState<Decision>(null)
  const [confirmDeny, setConfirmDeny] = useState(false)
  const [emailSent, setEmailSent] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Remove the approval token from browser history and URLs.
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search
    )

    const previousPolicy =
      document.querySelector<HTMLMetaElement>('meta[name="referrer"]')

    const policy = previousPolicy ?? document.createElement('meta')
    const previousContent = policy.content

    policy.name = 'referrer'
    policy.content = 'no-referrer'

    if (!previousPolicy) document.head.append(policy)

    let live = true

    if (/^[0-9a-f]{64}$/.test(token)) {
      void approvalRequest('inspect', token)
        .then((data) => {
          if (live) setCompanyName(data.companyName ?? '')
        })
        .catch((reason) => {
          if (live) {
            setError(
              reason instanceof Error
                ? reason.message
                : 'Unable to load approval.'
            )
          }
        })
        .finally(() => {
          if (live) setLoading(false)
        })
    } else {
      void Promise.resolve().then(() => {
        if (live) {
          setError(
            'This approval link is invalid. Open the complete link from your approval email.'
          )
          setLoading(false)
        }
      })
    }

    return () => {
      live = false

      if (previousPolicy) {
        policy.content = previousContent
      } else {
        policy.remove()
      }
    }
  }, [token])

  const submitDecision = async (action: 'approve' | 'deny') => {
    if (submitting || !companyName || decision) return

    setSubmitting(true)
    setError('')

    try {
      const result = await approvalRequest(action, token)

      setDecision(action === 'approve' ? 'approved' : 'denied')
      setEmailSent(result.emailSent ?? null)
      setConfirmDeny(false)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : `Unable to ${action} company.`
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-7 text-center">
          <p className="text-3xl font-bold tracking-[0.16em] text-[#0c2f32]">
            REENO
          </p>
          <p className="mt-1 text-sm font-semibold text-teal-700">
            Recruitment Management Platform
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          {decision === 'approved' && (
            <CheckCircle2 className="mx-auto mb-5 size-12 text-teal-700" />
          )}

          {decision === 'denied' && (
            <XCircle className="mx-auto mb-5 size-12 text-rose-600" />
          )}

          <h1 className="text-2xl font-bold text-slate-900">
            {decision === 'approved'
              ? 'Company approved'
              : decision === 'denied'
                ? 'Company registration denied'
                : 'Company registration approval'}
          </h1>

          {loading ? (
            <p role="status" className="mt-5 text-slate-600">
              Loading registration…
            </p>
          ) : decision ? (
            <>
              <p className="mt-5 text-slate-600">
                {decision === 'approved'
                  ? `${companyName} is now active. Its administrator can sign in to the company workspace.`
                  : `${companyName} has been rejected. Its administrator account remains inactive.`}
              </p>

              {emailSent === true && (
                <p role="status" className="mt-4 text-sm text-teal-700">
                  Notification email submitted successfully.
                </p>
              )}

              {emailSent === false && (
                <div
                  role="alert"
                  className="mt-5 rounded-lg bg-amber-50 p-4 text-left text-sm text-amber-800"
                >
                  <AlertTriangle className="mb-2 size-5" />
                  The company decision was saved, but the notification
                  email could not be sent. It will require a retry.
                </div>
              )}
            </>
          ) : companyName ? (
            <>
              <p className="mt-5 text-slate-600">
                Review the registration for{' '}
                <strong>{companyName}</strong>.
              </p>

              {!confirmDeny ? (
                <div className="mt-7 space-y-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void submitDecision('approve')}
                    className="h-11 w-full rounded-lg bg-teal-700 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
                  >
                    {submitting ? 'Processing…' : 'Approve company'}
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setConfirmDeny(true)}
                    className="h-11 w-full rounded-lg border border-rose-300 bg-white font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    Deny company
                  </button>
                </div>
              ) : (
                <div className="mt-7 rounded-xl border border-rose-200 bg-rose-50 p-5">
                  <h2 className="font-bold text-rose-900">
                    Confirm rejection
                  </h2>

                  <p className="mt-2 text-sm text-rose-800">
                    Are you sure you want to deny {companyName}?
                    The company workspace will not be activated.
                  </p>

                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setConfirmDeny(false)}
                      className="h-11 flex-1 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void submitDecision('deny')}
                      className="h-11 flex-1 rounded-lg bg-rose-700 font-semibold text-white disabled:opacity-60"
                    >
                      {submitting ? 'Processing…' : 'Confirm deny'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {error && (
            <p role="alert" className="mt-5 text-sm text-rose-700">
              {error}
            </p>
          )}

          <Link
            to="/login"
            className="mt-7 inline-block text-sm font-semibold text-teal-700"
          >
            Back to Sign In
          </Link>
        </section>
      </div>
    </main>
  )
}
