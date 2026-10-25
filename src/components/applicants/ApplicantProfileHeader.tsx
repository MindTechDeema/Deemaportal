import { ArrowLeft, Download, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { applicantStatuses, type Applicant, type ApplicantStatus } from '../../data/applicants'
import ApplicantStatusBadge from './ApplicantStatusBadge'

const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

export default function ApplicantProfileHeader({ applicant, status, onStatusChange }: { applicant: Applicant; status: ApplicantStatus; onStatusChange: (status: ApplicantStatus) => void }) {
  return <header className="space-y-5">
    <Link to="/applicants" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"><ArrowLeft aria-hidden="true" className="size-4" />Back to applicants</Link>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{applicant.name}</h1><ApplicantStatusBadge status={status} /></div><p className="mt-2 text-sm text-slate-600 sm:text-base">{applicant.jobTitle} <span aria-hidden="true">•</span> {applicant.startup}</p><p className="mt-1 text-sm text-slate-500">Applied {formatDate(applicant.appliedDate)}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative"><span className="sr-only">Change status</span><select value={status} onChange={(event) => onStatusChange(event.target.value as ApplicantStatus)} className="h-10 appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"><option disabled>Change status</option>{applicantStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"><Download aria-hidden="true" className="size-4" />Download resume</button>
        <button type="button" aria-label="More applicant actions" className="grid size-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"><MoreHorizontal aria-hidden="true" className="size-5" /></button>
      </div>
    </div>
  </header>
}
