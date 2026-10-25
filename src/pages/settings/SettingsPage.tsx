import { careersPath } from '../../services/jobsService'
import { useAuth } from '../../contexts/useAuth'
import { Settings } from 'lucide-react'

function SettingsPage() {
 const { profile } = useAuth()
 const isCompany = profile?.account_type === 'company'

  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-900">Workspace settings</h2>
      <p className="mt-2 text-slate-600">{isCompany ? `Workspace for ${profile.organization}.` : 'Configure the QSTP hiring workspace and recruiter preferences.'}</p>
      {isCompany && <a className="mt-4 block break-all font-semibold text-teal-700" href={careersPath(profile.company_slug)} target="_blank" rel="noreferrer">{window.location.origin + careersPath(profile.company_slug)}</a>}
      <div className="mt-7 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Settings className="size-7 text-teal-700" strokeWidth={1.8} />
        <h3 className="mt-5 text-lg font-semibold text-slate-900">Workspace information</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{profile?.full_name} &middot; {profile?.organization}</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Role</dt><dd className="mt-1 font-semibold">{isCompany ? profile.role === 'company_admin' ? 'Company administrator' : 'Employee' : profile?.role === 'admin' ? 'Administrator' : 'Recruiter'}</dd></div><div><dt className="text-slate-500">Workspace status</dt><dd className="mt-1 font-semibold">{profile?.is_active ? 'Active' : 'Inactive'}</dd></div></dl>
      </div>
    </section>
  )
}

export default SettingsPage
