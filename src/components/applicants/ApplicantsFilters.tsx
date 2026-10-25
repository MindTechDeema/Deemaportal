import { ListFilter, Search } from 'lucide-react'
import { applicantStatuses, jobTitles, type ApplicantStatusFilter } from '../../data/applicants'

export type DateFilter = 'All dates' | 'Today' | 'Last 7 days' | 'Last 30 days'
export type SortOption = 'newest' | 'oldest' | 'highest-match' | 'lowest-match' | 'name'

interface Props {
  search: string; status: ApplicantStatusFilter; startup: string; job: string; date: DateFilter; sort: SortOption; expanded: boolean
  onSearch: (value: string) => void; onStatus: (value: ApplicantStatusFilter) => void; onStartup: (value: string) => void
  onJob: (value: string) => void; onDate: (value: DateFilter) => void; onSort: (value: SortOption) => void; onToggle: () => void
}

const inputClass = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10'

function ApplicantsFilters(props: Props) {
  return <div className="border-b border-slate-100 p-4 sm:p-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
      <label className="relative min-w-0 flex-1 lg:min-w-80"><span className="sr-only">Search applicants</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="search" value={props.search} onChange={(e) => props.onSearch(e.target.value)} placeholder="Search applicants by name, email, job, or startup" className={`${inputClass} pl-10`} /></label>
      <label><span className="sr-only">Status</span><select value={props.status} onChange={(e) => props.onStatus(e.target.value as ApplicantStatusFilter)} className={`${inputClass} lg:w-44`}><option value="All">All statuses</option>{applicantStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span className="sr-only">Startup</span><select value={props.startup} onChange={(e) => props.onStartup(e.target.value)} className={`${inputClass} lg:w-52`}>{['All startups', 'AeroQ', 'Sadeem Technology', 'GreenRoute', 'MedLoop'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" aria-expanded={props.expanded} onClick={props.onToggle} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><ListFilter aria-hidden="true" className="size-4" />More filters</button>
    </div>
    {props.expanded && <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-3">
      <label><span className="mb-1 block text-xs font-semibold text-slate-500">Job</span><select value={props.job} onChange={(e) => props.onJob(e.target.value)} className={inputClass}><option>All jobs</option>{jobTitles.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span className="mb-1 block text-xs font-semibold text-slate-500">Date</span><select value={props.date} onChange={(e) => props.onDate(e.target.value as DateFilter)} className={inputClass}>{['All dates', 'Today', 'Last 7 days', 'Last 30 days'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span className="mb-1 block text-xs font-semibold text-slate-500">Sort by</span><select value={props.sort} onChange={(e) => props.onSort(e.target.value as SortOption)} className={inputClass}><option value="newest">Newest applications</option><option value="oldest">Oldest applications</option><option value="highest-match">Highest match</option><option value="lowest-match">Lowest match</option><option value="name">Applicant name A–Z</option></select></label>
    </div>}
  </div>
}

export default ApplicantsFilters

