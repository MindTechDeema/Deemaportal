import { applicantStatuses, type ApplicantStatusFilter } from '../../data/applicants'

function ApplicantsTabs({ value, onChange }: { value: ApplicantStatusFilter; onChange: (value: ApplicantStatusFilter) => void }) {
  const tabs: ApplicantStatusFilter[] = ['All', ...applicantStatuses]
  return <div className="overflow-x-auto border-b border-slate-200 px-4 sm:px-6"><div role="tablist" aria-label="Filter applicants by status" className="flex min-w-max gap-6">
    {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={value === tab} onClick={() => onChange(tab)} className={`border-b-2 px-1 py-4 text-sm font-semibold transition-colors ${value === tab ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{tab}</button>)}
  </div></div>
}

export default ApplicantsTabs
