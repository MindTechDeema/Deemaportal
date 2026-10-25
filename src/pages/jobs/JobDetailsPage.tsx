import { careersPath } from '../../services/jobsService'
import { useAuth } from '../../contexts/useAuth'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getJobById } from '../../services/jobsService'
import { jobStatusDisplay, type JobWithStartup } from '../../types/database'

const formatDate = (value: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value.includes('T') ? value : `${value}T00:00:00Z`))

export default function JobDetailsPage() {
 const { profile } = useAuth()
 const isCompany = profile?.account_type === 'company'

  const { jobId } = useParams()
  const [job, setJob] = useState<JobWithStartup | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setJob(jobId ? await getJobById(jobId) : null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load this job.') }
    finally { setLoading(false) }
  }, [jobId])
  useEffect(() => { getJobById(jobId ?? '').then(setJob).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load this job.')).finally(() => setLoading(false)) }, [jobId])

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white px-6 py-20 text-center text-sm font-semibold text-slate-500" role="status">Loading job…</div>
  if (error) return <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center"><h2 className="text-xl font-bold text-slate-900">Job could not be loaded</h2><p className="mt-2 text-sm text-rose-700">{error}</p><button type="button" onClick={() => void load()} className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Retry</button></div>
  if (!job) return <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center"><h2 className="text-xl font-bold text-slate-900">Job not found</h2><p className="mt-2 text-sm text-slate-600">This job may have been removed or the link is incorrect.</p><Link to="/jobs" className="mt-5 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Back to jobs</Link></div>

  const facts = [
    [isCompany ? 'Company' : 'Startup', (job.startup?.name ?? job.company?.name ?? "Organization")], ['Department', job.department || '—'], ['Location', job.location],
    ['Employment type', job.employment_type], ['Work arrangement', job.work_arrangement || '—'],
    ['Application deadline', job.deadline ? formatDate(job.deadline) : '—'], ['Openings', String(job.openings)],
    ['Status', jobStatusDisplay[job.status]], ['Created', formatDate(job.created_at)],
  ]
  return <section className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link to="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700"><ArrowLeft className="size-4" />Back to jobs</Link><p className="mt-6 text-sm font-bold uppercase tracking-wider text-teal-700">{isCompany ? profile.organization : 'QSTP Talent'}</p><h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{job.title}</h2><p className="mt-2 text-sm text-slate-600">{(job.startup?.name ?? job.company?.name ?? "Organization")}</p></div><Link to={`/jobs/${job.id}/edit`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"><Pencil className="size-4" />Edit job</Link></div>
    {job.status === 'active' && <a href={careersPath(job.company?.slug) + '/' + job.slug} target="_blank" rel="noreferrer" className="block break-all text-sm font-semibold text-teal-700">{window.location.origin + careersPath(job.company?.slug) + '/' + job.slug}</a>}
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{facts.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>)}</dl></div>
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">{[['Job description', job.description], ['Qualifications', job.qualifications], ['Requirements', job.requirements]].map(([label, value], index) => <section key={label} className={index ? 'mt-6 border-t border-slate-100 pt-6' : ''}><h3 className="text-base font-bold text-slate-900">{label}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{value || 'Not provided.'}</p></section>)}</div>
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h3 className="text-base font-bold text-slate-900">Screening questions</h3>{(job.screening_questions ?? []).length ? <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-slate-700">{job.screening_questions.map((question) => <li key={question.id}><span className="font-semibold">{question.text}</span><span className="ml-2 text-xs text-slate-500">{question.type}{question.required ? ' · Required' : ''}</span></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">No screening questions added.</p>}</div>
  </section>
}
