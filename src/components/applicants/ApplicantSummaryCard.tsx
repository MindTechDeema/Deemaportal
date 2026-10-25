import { BriefcaseBusiness, ExternalLink, GraduationCap, Mail, MapPin, Phone } from 'lucide-react'
import type { Applicant } from '../../data/applicants'

const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
export default function ApplicantSummaryCard({ applicant }: { applicant: Applicant }) {
  const details = [
    { icon: Mail, label: 'Email', value: applicant.email }, { icon: Phone, label: 'Phone', value: applicant.phone },
    { icon: MapPin, label: 'Location', value: applicant.location }, { icon: GraduationCap, label: 'Education', value: `${applicant.degree}, ${applicant.university}` },
    { icon: GraduationCap, label: 'Graduation', value: `${applicant.graduationYear} · GPA ${applicant.gpa}` }, { icon: BriefcaseBusiness, label: 'Experience', value: applicant.experience },
  ]
  return <section aria-labelledby="applicant-summary" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-16 shrink-0 place-items-center rounded-full bg-teal-50 text-xl font-bold text-teal-800">{initials(applicant.name)}</span><div><h2 id="applicant-summary" className="text-xl font-bold text-slate-900">{applicant.name}</h2><p className="mt-1 text-sm text-slate-500">Candidate profile</p><div className="mt-3 flex flex-wrap gap-3"><a href={applicant.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">LinkedIn <ExternalLink aria-hidden="true" className="size-3.5" /></a><a href={applicant.portfolioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">Portfolio <ExternalLink aria-hidden="true" className="size-3.5" /></a></div></div></div>
    <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">{details.map(({ icon: Icon, label, value }) => <div key={label} className="flex gap-3"><Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" /><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm leading-5 text-slate-700">{value}</dd></div></div>)}</dl>
  </section>
}

export function SkillsCard({ skills }: { skills: string[] }) { return <section aria-labelledby="skills-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 id="skills-heading" className="font-bold text-slate-900">Skills</h2><div className="mt-4 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200">{skill}</span>)}</div></section> }
