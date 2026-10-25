
import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'

interface LoginState {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
  accessError?: string
}

export default function LoginPage() {
  const { signIn, isAuthenticated, isLoading, authError } = useAuth()

  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LoginState | null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    try {
      await signIn(email, password)

      const from = state?.from
      const destination = from?.pathname
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : '/dashboard'

      navigate(destination, { replace: true })
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to sign in. Please try again.'
      )
    }
  }

  const visibleError = error || state?.accessError || authError

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const inputClass =
    'mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20'

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md">

        {/* REENO Branding */}
        <div className="mb-7 text-center">
          <p className="text-3xl font-bold tracking-[0.16em] text-[#0c2f32]">
            REENO
          </p>
          <p className="mt-1 text-sm font-semibold text-teal-700">
            Recruitment Management Platform
          </p>
        </div>

        {/* Login Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <h1 className="text-2xl font-bold text-slate-900">
            Welcome Back
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Sign in to your REENO workspace.
          </p>

          <form
            onSubmit={(event) => void submit(event)}
            className="mt-7 space-y-5"
          >

            {/* Email */}
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                placeholder="name@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-11 text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1 grid size-9 place-items-center rounded-md text-slate-500 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-teal-700"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                defaultChecked
                className="size-4 accent-teal-700"
              />
              Remember me
            </label>

            {/* Login Error */}
            {visibleError && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {visibleError}
              </p>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-lg bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-6 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-600">
              New to REENO?{' '}
              <Link
                to="/signup"
                className="font-semibold text-teal-700 hover:underline"
              >
                Create an Account
              </Link>
            </p>
          </div>

          {/* Approval Notice */}
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            New accounts require approval from the REENO administration team
            before access is granted.
          </p>

        </section>
      </div>
    </main>
  )
}
