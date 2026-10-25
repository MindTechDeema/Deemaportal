import { useState } from 'react'
import { BriefcaseBusiness, Clock3, UserCheck, UsersRound, type LucideIcon } from 'lucide-react'

interface Kpi {
  label: string
  value: number
  supportingText: string
  icon: LucideIcon
}

function KpiCards({ jobs, applications }: { jobs: import('../../types/database').JobWithStartup[]; applications: import('../../types/database').ApplicationWithJob[] }) {
 const [now] = useState(() => Date.now())
 const kpis: Kpi[] = [
 { label: 'Active jobs', value: jobs.filter(j => j.status === 'active').length, supportingText: 'In your workspace', icon: BriefcaseBusiness },
 { label: 'Total applicants', value: applications.length, supportingText: 'In your workspace', icon: UsersRound },
 { label: 'Shortlisted', value: applications.filter(a => a.status === 'shortlisted').length, supportingText: 'Current shortlist', icon: UserCheck },
 { label: 'New this week', value: applications.filter(a => Date.parse(a.submitted_at) >= now - 7 * 86400000).length, supportingText: 'Last seven days', icon: Clock3 },
 ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map(({ label, value, supportingText, icon: Icon }) => (
        <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            </div>
            <span className="grid size-10 place-items-center rounded-lg bg-teal-50 text-teal-700">
              <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </span>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">{supportingText}</p>
        </article>
      ))}
    </div>
  )
}

export default KpiCards
