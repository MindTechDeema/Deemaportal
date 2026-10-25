import { Sparkles } from 'lucide-react'
import type { JobDetails } from './types'

type Props = { companyName?: string; value: JobDetails; errors: Partial<Record<keyof JobDetails, string>>; onChange: (next: JobDetails) => void; onGenerate: () => void; startups: string[]; startupsLoading: boolean }
const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100'

export default function JobDetailsStep({ value, errors, onChange, onGenerate, startups, startupsLoading, companyName }: Props) {
  const set = <K extends keyof JobDetails>(key: K, val: JobDetails[K]) => onChange({ ...value, [key]: val })
  const field = (key: keyof JobDetails, label: string, required = false, type = 'text') => (
    <label className="block text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-600"> *</span>}
      <input type={type} value={String(value[key])} min={key === 'openings' ? 1 : undefined} onChange={(e) => set(key, key === 'openings' ? Number(e.target.value) : e.target.value as never)} className={inputClass} />
      {errors[key] && <span className="mt-1 block text-xs font-medium text-rose-600">{errors[key]}</span>}
    </label>
  )
  const select = (key: keyof JobDetails, label: string, options: string[], required = false) => (
    <label className="block text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-600"> *</span>}
      <select value={String(value[key])} onChange={(e) => set(key, e.target.value as never)} className={inputClass}><option value="">Select {label.toLowerCase()}</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
      {errors[key] && <span className="mt-1 block text-xs font-medium text-rose-600">{errors[key]}</span>}
    </label>
  )
  const textarea = (key: 'description' | 'qualifications' | 'requirements', label: string, action = false) => (
    <label className="block text-sm font-semibold text-slate-700 sm:col-span-2"><span className="flex flex-wrap items-center justify-between gap-2"><span>{label}<span className="text-rose-600"> *</span></span>{action && <button type="button" onClick={onGenerate} className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700"><Sparkles className="size-3.5" />Generate with AI</button>}</span>
      <textarea value={value[key]} onChange={(e) => set(key, e.target.value)} rows={5} className={inputClass} />
      {errors[key] && <span className="mt-1 block text-xs font-medium text-rose-600">{errors[key]}</span>}
    </label>
  )
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-bold text-slate-900">{companyName ? 'Job details' : 'Internship details'}</h2><p className="mt-1 text-sm text-slate-500">{companyName ? 'Tell candidates about your company and opportunity.' : 'Tell candidates about the startup and opportunity.'}</p><div className="mt-6 grid gap-5 sm:grid-cols-2">
    {companyName ? <div className="text-sm font-semibold text-slate-700">Company<p className="mt-2">{companyName}</p></div> : select('startup', 'Startup name', startupsLoading ? [] : startups, true)}{field('title', 'Job title', true)}{field('department', 'Department', true)}{field('location', 'Location', true)}
    {select('employmentType', 'Employment type', companyName ? ['Full-time', 'Part-time', 'Contract', 'Internship', 'Part-time internship', 'Graduate internship'] : ['Internship', 'Part-time internship', 'Graduate internship'], true)}{select('workArrangement', 'Work arrangement', ['On-site', 'Hybrid', 'Remote'], true)}
    {field('deadline', 'Application deadline', true, 'date')}{field('openings', 'Number of openings', true, 'number')}{textarea('description', 'Job description', true)}{textarea('qualifications', 'Qualifications')}{textarea('requirements', 'Requirements')}
  </div></section>
}
