import { useAuth } from '../../contexts/useAuth'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import JobsFilters from '../../components/jobs/JobsFilters'
import JobsSummary from '../../components/jobs/JobsSummary'
import JobsTable from '../../components/jobs/JobsTable'
import JobsTabs from '../../components/jobs/JobsTabs'
import type { JobStatus, StatusFilter } from '../../components/jobs/jobsData'
import { getRecruiterJobs } from '../../services/jobsService'
import { jobStatusDisplay, type JobWithStartup } from '../../types/database'

function JobsPage() {
 const { profile } = useAuth()
 const isCompany = profile?.account_type === 'company'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('All')
  const [startup, setStartup] = useState('All startups')
  const [jobs, setJobs] = useState<JobWithStartup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadJobs = useCallback(async () => {
    setLoading(true); setError('')
    try { setJobs(await getRecruiterJobs()) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load jobs.') } finally { setLoading(false) }
  }, [])

  useEffect(() => { getRecruiterJobs().then(setJobs).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load jobs.')).finally(() => setLoading(false)) }, [])

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    return jobs.filter((job) => {
      const matchesSearch = !query || job.title.toLocaleLowerCase().includes(query) || (job.startup?.name ?? job.company?.name ?? "Organization").toLocaleLowerCase().includes(query)
      const matchesStatus = status === 'All' || jobStatusDisplay[job.status] === status
      const matchesStartup = startup === 'All startups' || (job.startup?.name ?? job.company?.name ?? "Organization") === startup
      return matchesSearch && matchesStatus && matchesStartup
    })
  }, [jobs, search, startup, status])
  const counts = useMemo(() => ({ all: jobs.length, active: jobs.filter((job) => job.status === 'active').length, draft: jobs.filter((job) => job.status === 'draft').length, closed: jobs.filter((job) => job.status === 'closed').length }), [jobs])
  const startups = useMemo(() => [...new Set(jobs.map((job) => (job.startup?.name ?? job.company?.name ?? "Organization")))].sort(), [jobs])

  const clearFilters = () => {
    setSearch('')
    setStatus('All')
    setStartup('All startups')
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">{isCompany ? profile.organization : 'QSTP Talent'}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Jobs</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{isCompany ? 'Manage opportunities for your company.' : 'Manage internship opportunities published on behalf of QSTP startups.'}</p>
        </div>
        <Link to="/jobs/new" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
          <Plus aria-hidden="true" className="size-4" />
          Create job
        </Link>
      </div>

      <JobsSummary counts={counts} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <JobsTabs value={status} onChange={(value: JobStatus | 'All') => setStatus(value)} />
        <JobsFilters search={search} status={status} startup={startup} startups={startups} onSearchChange={setSearch} onStatusChange={setStatus} onStartupChange={setStartup} />
        {loading ? <div className="px-5 py-16 text-center text-sm font-semibold text-slate-500" role="status">Loading jobs…</div> : error ? <div className="px-5 py-16 text-center"><h3 className="font-semibold text-slate-900">Jobs could not be loaded</h3><p className="mx-auto mt-2 max-w-xl text-sm text-rose-700">{error}</p><button type="button" onClick={() => void loadJobs()} className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Retry</button></div> : <JobsTable jobs={filteredJobs} onClearFilters={clearFilters} />}
      </div>
    </section>
  )
}

export default JobsPage
