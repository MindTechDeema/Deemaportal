import { useEffect, useState } from 'react'
import { getRecruiterJobs } from '../../services/jobsService'
import { getApplications } from '../../services/applicationsService'
import type { JobWithStartup, ApplicationWithJob } from '../../types/database'
import { useAuth } from '../../contexts/useAuth'
import { ArrowRight, BriefcaseBusiness, CalendarPlus, UserRoundSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import ActiveJobs from '../../components/dashboard/ActiveJobs'
import ApplicationsByStartup from '../../components/dashboard/ApplicationsByStartup'
import KpiCards from '../../components/dashboard/KpiCards'
import RecentApplications from '../../components/dashboard/RecentApplications'

function DashboardPage() {
 const { profile } = useAuth()
 const isCompany = profile?.account_type === 'company'

 const [jobs, setJobs] = useState<JobWithStartup[]>([])
 const [applications, setApplications] = useState<ApplicationWithJob[]>([])
 const [error, setError] = useState('')
 const [loading, setLoading] = useState(true)
 useEffect(() => { let live = true; Promise.all([getRecruiterJobs(), getApplications()]).then(([j,a]) => { if(live) { setJobs(j); setApplications(a) } }).catch(e => { if(live) setError(e instanceof Error ? e.message : 'Unable to load dashboard.') }).finally(() => { if(live) setLoading(false) }); return () => { live = false } }, [profile?.id])
 if (loading) return <p role="status">Loading workspace?</p>
 if (error) return <p role="alert" className="text-rose-700">{error}</p>
 return (
    <section className="space-y-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">{isCompany ? profile.organization : 'QSTP Talent'}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Hiring overview</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            {isCompany ? 'Manage your company vacancies and candidate reviews.' : 'QSTP centrally manages internship vacancies and candidate reviews for startups across its ecosystem.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 min-[430px]:flex-row">
          <Link to="/applicants" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <UserRoundSearch aria-hidden="true" className="size-4" />
            View applicants
          </Link>
          <Link to="/jobs/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800">
            <CalendarPlus aria-hidden="true" className="size-4" />
            Create job
          </Link>
        </div>
      </div>

      <KpiCards jobs={jobs} applications={applications} />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <RecentApplications items={applications} />
        <ApplicationsByStartup applications={applications} isCompany={isCompany} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
              <BriefcaseBusiness aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold text-slate-900">Active jobs</h3>
              <p className="mt-0.5 text-sm text-slate-500">{isCompany ? 'Open vacancies in your company' : 'Open internship vacancies across QSTP startups'}</p>
            </div>
          </div>
          <Link to="/jobs" className="hidden items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 sm:inline-flex">
            View all jobs <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <ActiveJobs jobs={jobs} applications={applications} />
        <div className="border-t border-slate-100 p-4 sm:hidden">
          <Link to="/jobs" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-teal-700">
            View all jobs <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default DashboardPage
