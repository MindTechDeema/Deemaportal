import { useAuth } from '../../contexts/useAuth'
import { BriefcaseBusiness, MoreHorizontal } from 'lucide-react'
import type { JobWithStartup } from '../../types/database'
import { jobStatusDisplay, type JobStatusDisplay } from '../../types/database'
import { useNavigate } from 'react-router-dom'

interface JobsTableProps {
  jobs: JobWithStartup[]
  onClearFilters: () => void
}

const statusStyles: Record<JobStatusDisplay, string> = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Draft: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

function JobsTable({ jobs, onClearFilters }: JobsTableProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isCompany = profile?.account_type === 'company'
  if (jobs.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500"><BriefcaseBusiness aria-hidden="true" className="size-6" /></span>
        <h3 className="mt-4 font-semibold text-slate-900">No jobs found</h3>
        <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
        <button type="button" onClick={onClearFilters} className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Clear filters</button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>{['Job title', isCompany ? 'Company' : 'Startup', 'Location', 'Applicants', 'Deadline', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-5 py-3 sm:px-6">{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.id} className="transition-colors hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900 sm:px-6">{job.title}</td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-600 sm:px-6">{(job.startup?.name ?? job.company?.name ?? "Organization")}</td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-500 sm:px-6">{job.location}</td>
              <td className="px-5 py-4 font-semibold tabular-nums text-slate-700 sm:px-6">{job.application_count ?? 0}</td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-500 sm:px-6">{job.deadline ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${job.deadline}T00:00:00Z`)) : '—'}</td>
              <td className="px-5 py-4 sm:px-6"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[jobStatusDisplay[job.status]]}`}>{jobStatusDisplay[job.status]}</span></td>
              <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/jobs/${job.id}`) }} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">View</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/jobs/${job.id}/edit`) }} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">Edit</button>
                  <button type="button" aria-label={`More actions for ${job.title}`} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"><MoreHorizontal aria-hidden="true" className="size-5" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default JobsTable
