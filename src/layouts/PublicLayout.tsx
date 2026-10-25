import { useEffect, useState } from 'react'
import { getPublicCompany } from '../services/jobsService'
import { useParams } from 'react-router-dom'
import { careersPath } from '../services/jobsService'
import { Link, Outlet } from 'react-router-dom'

export default function PublicLayout() {
 const { companySlug } = useParams()
 const base = careersPath(companySlug)
 const [company, setCompany] = useState<{ slug: string; name: string } | null>(null)
 useEffect(() => { let live = true; if (companySlug) void getPublicCompany(companySlug).then(value => { if (live) setCompany(value) }).catch(() => {}); return () => { live = false } }, [companySlug])
 const identity = company && company.slug === companySlug ? company.name : 'Company'
  return <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6 lg:px-8"><Link to={base} className="flex items-center gap-4"><span className="rounded-lg bg-[#0c2f32] px-3 py-2 text-lg font-bold tracking-[0.14em] text-white">REENO</span><span className="hidden text-sm font-semibold text-slate-600 sm:block">{companySlug ? identity + ' Careers' : 'QSTP Internship Opportunities'}</span></Link><Link to={base} className="text-sm font-bold text-teal-700 hover:text-teal-900">View opportunities</Link></div></header><main className="flex-1"><Outlet /></main><footer className="border-t border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-5 py-7 text-center text-sm text-slate-500 sm:px-6 lg:px-8">{companySlug ? 'Careers powered by REENO' : 'Internship opportunities managed by the QSTP Hiring Team'}</div></footer></div>
}

