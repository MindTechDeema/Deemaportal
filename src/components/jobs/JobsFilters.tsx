import { useAuth } from '../../contexts/useAuth'
import { Search } from 'lucide-react'
import type { StatusFilter } from './jobsData'

interface JobsFiltersProps {
  search: string
  status: StatusFilter
  startup: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: StatusFilter) => void
  onStartupChange: (value: string) => void
  startups: string[]
}

const statuses: StatusFilter[] = ['All', 'Active', 'Draft', 'Closed']
function JobsFilters({ search, status, startup, startups, onSearchChange, onStatusChange, onStartupChange }: JobsFiltersProps) {
  const { profile } = useAuth()
  const isCompany = profile?.account_type === 'company'
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:flex-wrap sm:p-6">
      <label className="relative min-w-0 flex-1 sm:min-w-72">
        <span className="sr-only">Search jobs</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={isCompany ? 'Search by job title' : 'Search by job title or startup'} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10" />
      </label>
      <label>
        <span className="sr-only">Status</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value as StatusFilter)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 sm:w-40">
          {statuses.map((option) => <option key={option} value={option}>{option === 'All' ? 'All statuses' : option}</option>)}
        </select>
      </label>
      {!isCompany && <label>
        <span className="sr-only">Startup</span>
        <select value={startup} onChange={(event) => onStartupChange(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 sm:w-52">
          {['All startups', ...startups].map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>}
    </div>
  )
}

export default JobsFilters
