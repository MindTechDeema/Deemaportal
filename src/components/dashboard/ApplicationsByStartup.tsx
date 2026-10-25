import { Building2 } from 'lucide-react'

function ApplicationsByStartup({ applications, isCompany }: { applications: import('../../types/database').ApplicationWithJob[]; isCompany: boolean }) {
 const counts = new Map<string, number>()
 applications.forEach(a => { const name = isCompany ? a.job.title : a.job.startup?.name ?? 'Organization'; counts.set(name, (counts.get(name) ?? 0) + 1) })
 const startupApplications = [...counts].map(([name, count]) => ({ name, count, width: 100 * count / Math.max(1, ...counts.values()) }))
  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
            <Building2 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">Applications by {isCompany ? 'job' : 'startup'}</h3>
            <p className="mt-0.5 text-sm text-slate-500">Current applicant distribution</p>
          </div>
        </div>
      </div>
      <div className="space-y-6 px-5 py-6 sm:px-6">
        {startupApplications.map(({ name, count, width }) => (
          <div key={name}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="truncate font-medium text-slate-700">{name}</span>
              <span className="font-semibold tabular-nums text-slate-900">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-600" style={{ width: `${width}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

export default ApplicationsByStartup
