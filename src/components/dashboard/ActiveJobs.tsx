function ActiveJobs({ jobs, applications }: { jobs: import('../../types/database').JobWithStartup[]; applications: import('../../types/database').ApplicationWithJob[] }) {
 const activeJobs = jobs.filter(j => j.status === 'active').map(j => ({ title: j.title, startup: j.startup?.name ?? j.company?.name, applicants: applications.filter(a => a.job_id === j.id).length, deadline: j.deadline ?? 'No deadline' }))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {['Job title', 'Organization', 'Applicants', 'Deadline', 'Status'].map((heading) => <th key={heading} className="px-5 py-3 sm:px-6">{heading}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {activeJobs.map((job) => (
            <tr key={job.title} className="hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900 sm:px-6">{job.title}</td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-600 sm:px-6">{job.startup}</td>
              <td className="px-5 py-4 font-semibold tabular-nums text-slate-700 sm:px-6">{job.applicants}</td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-500 sm:px-6">{job.deadline}</td>
              <td className="px-5 py-4 sm:px-6"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20"><span className="size-1.5 rounded-full bg-emerald-500" />Active</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ActiveJobs
