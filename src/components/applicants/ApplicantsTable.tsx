import { MoreHorizontal, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { applicantStatuses, type Applicant, type ApplicantStatus } from '../../data/applicants'
import ApplicantStatusBadge from './ApplicantStatusBadge'

interface Props { applicants: Applicant[]; selected: Set<string>; onToggle: (id: string) => void; onToggleAll: () => void; onStatusChange: (id: string, status: ApplicantStatus) => void; onClearFilters: () => void }
const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

function ApplicantsTable({ applicants, selected, onToggle, onToggleAll, onStatusChange, onClearFilters }: Props) {
  if (!applicants.length) return <div className="px-5 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500"><UsersRound aria-hidden="true" className="size-6" /></span><h3 className="mt-4 font-semibold text-slate-900">No applicants found</h3><p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p><button type="button" onClick={onClearFilters} className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Clear filters</button></div>
  const allSelected = applicants.every((item) => selected.has(item.id))
  const someSelected = applicants.some((item) => selected.has(item.id))
  return <div className="overflow-x-auto"><table className="w-full min-w-[1220px] text-left text-sm">
    <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr>
      <th className="w-12 px-5 py-3"><input type="checkbox" aria-label="Select all visible applicants" checked={allSelected} ref={(node) => { if (node) node.indeterminate = someSelected && !allSelected }} onChange={onToggleAll} className="size-4 rounded border-slate-300 accent-teal-700" /></th>
      {['Applicant', 'Applied for', 'Startup', 'Applied date', 'Status', 'Match', 'Resume', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{applicants.map((applicant) => <tr key={applicant.id} className="transition-colors hover:bg-slate-50/70">
      <td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${applicant.name}`} checked={selected.has(applicant.id)} onChange={() => onToggle(applicant.id)} className="size-4 rounded border-slate-300 accent-teal-700" /></td>
      <td className="px-4 py-4"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{initials(applicant.name)}</span><div><p className="whitespace-nowrap font-semibold text-slate-900">{applicant.name}</p><p className="text-xs text-slate-500">{applicant.email}</p></div></div></td>
      <td className="px-4 py-4 text-slate-700">{applicant.jobTitle}</td><td className="whitespace-nowrap px-4 py-4 text-slate-600">{applicant.startup}</td><td className="whitespace-nowrap px-4 py-4 text-slate-500">{formatDate(applicant.appliedDate)}</td>
      <td className="px-4 py-4"><ApplicantStatusBadge status={applicant.status} /></td><td className="px-4 py-4 font-semibold tabular-nums text-slate-700">{applicant.match}%</td>
      <td className="px-4 py-4"><button type="button" className="whitespace-nowrap text-xs font-semibold text-teal-700 hover:text-teal-900">View resume</button></td>
      <td className="px-4 py-4"><div className="flex items-center gap-2"><Link to={`/applicants/${applicant.id}`} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">View</Link><label><span className="sr-only">Change status for {applicant.name}</span><select value={applicant.status} onChange={(e) => onStatusChange(applicant.id, e.target.value as ApplicantStatus)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-600">{applicantStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><button type="button" aria-label={`More actions for ${applicant.name}`} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"><MoreHorizontal aria-hidden="true" className="size-5" /></button></div></td>
    </tr>)}</tbody>
  </table></div>
}

export default ApplicantsTable
