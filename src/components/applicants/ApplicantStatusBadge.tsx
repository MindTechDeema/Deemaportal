import type { ApplicantStatus } from '../../data/applicants'

const styles: Record<ApplicantStatus, string> = {
  New: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  'Under review': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Interview: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  Shortlisted: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Hired: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
}

function ApplicantStatusBadge({ status }: { status: ApplicantStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}>{status}</span>
}

export default ApplicantStatusBadge

