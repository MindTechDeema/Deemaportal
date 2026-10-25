
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requireSupabase } from '../../lib/supabase'

export default function CompanySignupPage() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [industry, setIndustry] = useState('')
  const [otherIndustry, setOtherIndustry] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) return

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError(
        `Password must contain:
• At least 8 characters
• One uppercase letter (A-Z)
• One lowercase letter (a-z)
• One number (0-9)
• One special character (!@#$%)`
      )
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const formData = new FormData(event.currentTarget)

    const companyName = String(formData.get('companyName') ?? '').trim()
    const website = String(formData.get('website') ?? '').trim()
    const fullName = String(formData.get('fullName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()

    const selectedIndustry =
      industry === 'Other' ? otherIndustry.trim() : industry.trim()

    if (!selectedIndustry) {
      setError('Please enter your company industry.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const { data, error: functionError } =
        await requireSupabase().functions.invoke('register-company', {
          body: {
            companyName,
            website,
            industry: selectedIndustry,
            fullName,
            email,
            password,
          },
        })

      if (functionError) {
        // Supabase returns an HTTP error for non-2xx responses.
        // Read the function's own message when available.
        let message = 'Unable to submit registration. Please try again.'

        const context = functionError.context

        if (context instanceof Response) {
          const responseBody = await context.json().catch(() => null)

          if (
            responseBody &&
            typeof responseBody.error === 'string'
          ) {
            message = responseBody.error
          }
        }

        throw new Error(message)
      }

      if (!data?.success) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'Registration could not be completed.'
        )
      }

      navigate('/signup/pending', {
        state: {
          submitted: true,
          preview: false,
          approvalEmailSent: data.approvalEmailSent !== false,
          companyName,
          email,
        },
      })
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'An unexpected error occurred. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20'

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-7 text-center">
          <p className="text-3xl font-bold tracking-[0.16em] text-[#0c2f32]">
            REENO
          </p>
          <p className="mt-1 text-sm font-semibold text-teal-700">
            Recruitment Management Platform
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Register Your Company
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Create your company administrator account.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <h2 className="font-semibold text-slate-900">
              Company Information
            </h2>

            <div>
              <label
                htmlFor="companyName"
                className="text-sm font-semibold text-slate-700"
              >
                Company Name
              </label>
              <input
                id="companyName"
                name="companyName"
                required
                minLength={2}
                maxLength={150}
                className={inputClass}
                placeholder="Company legal name"
              />
            </div>

            <div>
              <label
                htmlFor="website"
                className="text-sm font-semibold text-slate-700"
              >
                Company Website
              </label>
              <input
                id="website"
                name="website"
                type="url"
                maxLength={500}
                className={inputClass}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label
                htmlFor="industry"
                className="text-sm font-semibold text-slate-700"
              >
                Industry
              </label>

              <select
                id="industry"
                name="industry"
                required
                className={inputClass}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="" disabled>
                  Select industry
                </option>
                <option>Technology &amp; IT</option>
                <option>Engineering</option>
                <option>Construction</option>
                <option>Real Estate</option>
                <option>Education</option>
                <option>Healthcare</option>
                <option>Finance &amp; Banking</option>
                <option>Accounting</option>
                <option>Manufacturing</option>
                <option>Retail</option>
                <option>Hospitality</option>
                <option>Transportation</option>
                <option>Energy, Oil &amp; Gas</option>
                <option>Telecommunications</option>
                <option>Media &amp; Marketing</option>
                <option>Consulting &amp; Professional Services</option>
                <option>Other</option>
              </select>

              {industry === 'Other' && (
                <div className="mt-4">
                  <label
                    htmlFor="otherIndustry"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Please Specify Your Industry
                  </label>

                  <input
                    id="otherIndustry"
                    name="otherIndustry"
                    type="text"
                    required
                    maxLength={100}
                    value={otherIndustry}
                    onChange={(e) => setOtherIndustry(e.target.value)}
                    className={inputClass}
                    placeholder="Enter your company's industry"
                  />
                </div>
              )}
            </div>

            <hr className="border-slate-200" />

            <h2 className="font-semibold text-slate-900">
              Administrator Information
            </h2>

            <div>
              <label
                htmlFor="fullName"
                className="text-sm font-semibold text-slate-700"
              >
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                required
                minLength={2}
                maxLength={150}
                className={inputClass}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700"
              >
                Work Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="text-sm font-semibold text-slate-700"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Confirm your password"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="whitespace-pre-line text-sm text-red-600"
              >
                {error}
              </p>
            )}

            <p className="rounded-lg bg-teal-50 p-3 text-xs text-teal-900">
              Your registration will be submitted to REENO for approval.
              Your company workspace will become available once your
              registration has been approved.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg bg-teal-700 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting Registration...' : 'Continue'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link
              to="/signup"
              className="font-semibold text-teal-700 hover:underline"
            >
              Back to Sign Up
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
