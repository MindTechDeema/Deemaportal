import { BriefcaseBusiness, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'

const navigation = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', to: '/jobs', icon: BriefcaseBusiness },
  { label: 'Applicants', to: '/applicants', icon: Users },
  { label: 'Settings', to: '/settings', icon: Settings },
]

function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const roleLabel =
  profile?.account_type === 'company'
    ? profile.role === 'company_admin'
      ? 'Company Admin'
      : 'Employee'
    : profile?.role === 'admin'
      ? 'Admin'
      : 'Recruiter'
  const logout = async () => { try { await signOut() } finally { navigate('/login', { replace: true }) } }
  return (
    <aside className="bg-[#0c2f32] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex h-20 items-center justify-between px-5 lg:h-auto lg:block lg:px-7 lg:py-8">
        <div>
          <p className="text-2xl font-bold tracking-[0.16em]">REENO</p>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-teal-200">
  {profile?.account_type === 'company'
    ? profile.organization
    : 'QSTP Talent'}
</p>
        </div>
        <div className="hidden text-right sm:block lg:hidden">
          <p className="text-sm font-medium">{profile?.full_name}</p>
          <p className="text-xs text-teal-200">{roleLabel}</p>
        </div>
        <button type="button" onClick={() => void logout()} aria-label="Log out" className="grid size-10 place-items-center rounded-lg text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-teal-300 sm:hidden lg:hidden"><LogOut className="size-5" /></button>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-3 lg:flex-1 lg:flex-col lg:gap-2 lg:border-0 lg:px-4 lg:py-4">
        {navigation.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-teal-500/20 text-white ring-1 ring-inset ring-teal-300/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="hidden border-t border-white/10 px-7 py-6 lg:block">
        <p className="truncate text-sm font-semibold">{profile?.full_name}</p>
        <p className="mt-1 text-xs text-teal-200">{roleLabel} · {profile?.organization}</p>
        <button type="button" onClick={() => void logout()} className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-teal-300"><LogOut className="size-4" aria-hidden="true" />Log out</button>
      </div>
    </aside>
  )
}

export default Sidebar
