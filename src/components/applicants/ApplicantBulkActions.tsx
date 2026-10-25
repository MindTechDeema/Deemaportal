import { X } from 'lucide-react'
import type { ApplicantStatus } from '../../data/applicants'

interface Props { count: number; onChangeStatus: (status: ApplicantStatus) => void; onClear: () => void }

function ApplicantBulkActions({ count, onChangeStatus, onClear }: Props) {
  return <div className="flex flex-col gap-3 border-b border-teal-100 bg-teal-50/70 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
    <p className="mr-auto text-sm font-semibold text-teal-900">{count} selected</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onChangeStatus('Under review')} className="rounded-md border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50">Move to under review</button>
      <button type="button" onClick={() => onChangeStatus('Shortlisted')} className="rounded-md border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50">Shortlist</button>
      <button type="button" onClick={() => onChangeStatus('Rejected')} className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Reject</button>
      <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"><X aria-hidden="true" className="size-3.5" />Clear selection</button>
    </div>
  </div>
}

export default ApplicantBulkActions

