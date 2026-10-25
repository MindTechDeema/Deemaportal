import { careersPath } from '../../services/jobsService'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getPublicJobBySlug } from '../../services/jobsService'
import type { JobWithStartup } from '../../types/database'

type SuccessState = {
  jobTitle?: string
  startupName?: string
  applicantName?: string
  applicationReference?: string
}

export default function ApplicationSuccessPage() {
 const base = careersPath(useParams().companySlug);

  const { jobSlug, companySlug } = useParams()
  const location = useLocation()
  const state = location.state as SuccessState | null
  const [job, setJob] = useState<JobWithStartup | null>()

  useEffect(() => {
    let active = true
    getPublicJobBySlug(jobSlug ?? '', companySlug)
      .then((result) => { if (active) setJob(result) })
      .catch(() => { if (active) setJob(null) })
    return () => { active = false }
  }, [jobSlug, companySlug])

  const jobTitle = state?.jobTitle ?? job?.title
  const startupName = state?.startupName ?? (job?.startup?.name ?? job?.company?.name)
  const applicantName = state?.applicantName
  const reference = state?.applicationReference

  return <div className="mx-auto max-w-2xl px-5 py-16">
    <section className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
      <CheckCircle2 className="mx-auto size-14 text-teal-700" />
      <h1 className="mt-5 text-2xl font-bold">Application submitted successfully</h1>
      <p className="mt-3 text-slate-600">{applicantName ? <>Thank you, <strong>{applicantName}</strong>. </> : null}{companySlug ? 'The hiring team' : 'The QSTP Hiring Team'} will review your application and contact you if your profile is shortlisted.</p>
      <dl className="mt-7 grid gap-4 rounded-xl bg-slate-50 p-5 text-left sm:grid-cols-2">
        <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Job title</dt><dd className="mt-1 text-sm font-bold">{jobTitle ?? 'Submitted application'}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{companySlug ? 'Company' : 'Startup'}</dt><dd className="mt-1 text-sm font-bold">{startupName ?? (companySlug ? 'Company' : 'QSTP startup')}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Applicant</dt><dd className="mt-1 text-sm font-bold">{applicantName ?? 'Applicant'}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Application reference</dt><dd className="mt-1 text-sm font-bold">{reference ?? 'Saved successfully'}</dd></div>
      </dl>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to={base} className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">View more opportunities</Link>
        {job && <Link to={`${base}/${job.slug}`} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Return to job</Link>}
      </div>
    </section>
  </div>
}
