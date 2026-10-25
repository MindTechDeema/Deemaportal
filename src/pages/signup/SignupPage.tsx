import { Building2, Users, ShieldCheck, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <p className="text-3xl font-bold tracking-[0.16em] text-[#0c2f32]">REENO</p>
          <p className="mt-1 text-sm font-semibold text-teal-700">
            Recruitment Management Platform
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Join REENO</h1>
          <p className="mt-2 text-sm text-slate-600">
            Choose the account type that best describes you.
          </p>

          <div className="mt-7 space-y-4">
            <Link
              to="/signup/company"
              className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-teal-600 hover:bg-teal-50"
            >
              <Building2 className="size-7 shrink-0 text-teal-700" />
              <div className="flex-1">
                <h2 className="font-semibold text-slate-900">Register a Company</h2>
                <p className="mt-1 text-sm text-slate-600">
                  I'm registering my company as its administrator.
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-400" />
            </Link>

            <Link
              to="/signup/employee"
              className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-teal-600 hover:bg-teal-50"
            >
              <Users className="size-7 shrink-0 text-teal-700" />
              <div className="flex-1">
                <h2 className="font-semibold text-slate-900">Join as an Employee</h2>
                <p className="mt-1 text-sm text-slate-600">
                  My company is already registered with REENO.
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-400" />
            </Link>
          </div>

          <div className="mt-6 flex gap-3 rounded-xl bg-slate-50 p-4">
            <ShieldCheck className="size-5 shrink-0 text-teal-700" />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Approval required
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                All registrations require approval from the REENO
                administration team before platform access is granted.
              </p>
            </div>
          </div>

          <p className="mt-7 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-700 hover:underline">
              Sign In
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
