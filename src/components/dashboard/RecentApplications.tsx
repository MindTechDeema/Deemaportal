import { Link } from 'react-router-dom'
import { UsersRound } from 'lucide-react'

function RecentApplications({ items }: { items: import('../../types/database').ApplicationWithJob[] }) {
 const applications = items.slice(0, 6).map(a => ({ id: a.id, name: a.full_name, initials: a.full_name.split(' ').map(n => n[0]).slice(0,2).join(''), internship: a.job.title, startup: a.job.startup?.name ?? a.job.company?.name, applied: new Date(a.submitted_at).toLocaleDateString(), status: a.status }))
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
            <UsersRound aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">Recent applications</h3>
            <p className="mt-0.5 text-sm text-slate-500">Latest candidates across active vacancies</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {['Applicant', 'Job', 'Organization', 'Applied', 'Status', 'Action'].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((application) => (
              <tr key={application.name} className="transition-colors hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{application.initials}</span>
                    <span className="font-medium text-slate-900">{application.name}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{application.internship}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{application.startup}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-500">{application.applied}</td>
                <td className="whitespace-nowrap px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-teal-50 text-teal-700`}>{application.status}</span></td>
                <td className="px-5 py-4"><Link to={`/applicants/${application.id}`} className="font-semibold text-teal-700">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

export default RecentApplications
