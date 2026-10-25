import { Bell, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'

const routeDetails: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'A clear view of your internship hiring activity.' },
  '/jobs': { title: 'Jobs', subtitle: 'Manage internship vacancies for QSTP startups.' },
  '/jobs/new': { title: 'Create job', subtitle: 'Set up a new internship opportunity.' },
  '/applicants': { title: 'Applicants', subtitle: 'Review and organize candidates across your vacancies.' },
  '/settings': { title: 'Settings', subtitle: 'Manage your team workspace and preferences.' },
}

function Header() {
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const details = pathname.match(/^\/jobs\/[^/]+\/edit$/) ? { title: 'Edit job', subtitle: 'Update this internship opportunity.' } : pathname.match(/^\/jobs\/[^/]+$/) ? { title: 'Job details', subtitle: 'Review this internship opportunity.' } : routeDetails[pathname] ?? routeDetails['/dashboard']
  const initials = profile?.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'QT'

  return (
    <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{details.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{profile?.account_type === 'company' ? details.subtitle.replace('internship hiring', 'hiring').replaceAll('internship', 'job').replace('for QSTP startups', 'for your company') : details.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="relative min-w-0 flex-1 sm:w-80 sm:flex-none">
            <span className="sr-only">Search</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search jobs or applicants..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/10"
            />
          </label>
          <button type="button" aria-label="View notifications" className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
            <Bell aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </button>
          <div aria-label={`${profile?.full_name ?? 'Recruiter'} profile`} title={profile?.full_name} className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{initials}</div>
        </div>
      </div>
    </header>
  )
}

export default Header
