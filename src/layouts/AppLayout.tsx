import { useAuth } from '../contexts/useAuth'
import { Outlet } from 'react-router-dom'
import Header from '../components/layout/Header'
import Sidebar from '../components/layout/Sidebar'

function AppLayout() {
  const { profile } = useAuth()
  const workspaceKey = profile?.account_type === 'company' ? profile.id + ':' + profile.company_id : profile?.id ?? 'signed-out'
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-7xl"><Outlet key={workspaceKey} /></div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
