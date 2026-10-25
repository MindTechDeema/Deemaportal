import { ClipboardList, FilePlus2, SearchCheck, UserCheck } from 'lucide-react'

const items = [
  { label: 'Total applicants', value: 148, icon: ClipboardList, style: 'bg-teal-50 text-teal-700' },
  { label: 'New applications', value: 24, icon: FilePlus2, style: 'bg-sky-50 text-sky-700' },
  { label: 'Under review', value: 37, icon: SearchCheck, style: 'bg-amber-50 text-amber-700' },
  { label: 'Shortlisted', value: 18, icon: UserCheck, style: 'bg-emerald-50 text-emerald-700' },
]

function ApplicantsSummary() {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(({ label, value, icon: Icon, style }) => (
    <article key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p></div>
      <span className={`grid size-10 place-items-center rounded-lg ${style}`}><Icon aria-hidden="true" className="size-5" strokeWidth={1.8} /></span>
    </article>
  ))}</div>
}

export default ApplicantsSummary

