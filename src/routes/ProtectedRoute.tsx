import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, authError } = useAuth()
  const location = useLocation()
  if (isLoading) return <div className="grid min-h-screen place-items-center bg-slate-50" role="status"><p className="font-semibold text-slate-600">Loading your workspace…</p></div>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location, accessError: authError }} />
  return <Outlet />
}
