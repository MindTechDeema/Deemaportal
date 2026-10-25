
import { Link, useLocation } from 'react-router-dom'

export default function PendingApprovalPage() {
  const location = useLocation()
  const isPreview = location.state?.preview === true
  const submitted = location.state?.submitted === true
  const companyName = typeof location.state?.companyName === 'string' ? location.state.companyName : 'Your company'
  const notificationPending = submitted && location.state?.approvalEmailSent === false

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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <span className="text-3xl text-teal-700" aria-hidden="true">
              ✓
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Registration Approval
          </h1>

          <p className="mt-4 text-slate-600">
            {submitted ? companyName + ' registration has been submitted.' : isPreview ? 'This is a preview of the registration confirmation page.' : 'Company registrations require REENO approval.'}
          </p>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="font-semibold text-amber-900">
              Approval Required
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              {isPreview ? 'When employee registration is enabled, requests will require approval.' : 'The REENO administration team will review your request. Your administrator can sign in only after the company has been approved.'}
            </p>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            {isPreview
              ? 'Preview mode: No account has been created and no request has been submitted.'
              : notificationPending ? 'Your registration is saved, but the approval notification could not be delivered. Contact REENO support; please do not register again.' : submitted ? 'Your account is pending approval. You do not need to submit another registration.' : 'Register your company to request access.'}
          </p>

          <Link
            to="/login"
            className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-lg bg-teal-700 font-semibold text-white hover:bg-teal-800"
          >
            Back to Sign In
          </Link>

          <Link
            to="/signup"
            className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:underline"
          >
            Back to Registration
          </Link>
        </section>
      </div>
    </main>
  )
}
