import type { StatusFilter } from './jobsData'

interface JobsTabsProps {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
}

const tabs: StatusFilter[] = ['All', 'Active', 'Draft', 'Closed']

function JobsTabs({ value, onChange }: JobsTabsProps) {
  return (
    <div className="overflow-x-auto border-b border-slate-200 px-4 sm:px-6">
      <div role="tablist" aria-label="Filter jobs by status" className="flex min-w-max gap-6">
        {tabs.map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={value === tab} onClick={() => onChange(tab)} className={`border-b-2 px-1 py-4 text-sm font-semibold transition-colors ${value === tab ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab === 'Draft' ? 'Drafts' : tab}
          </button>
        ))}
      </div>
    </div>
  )
}

export default JobsTabs
