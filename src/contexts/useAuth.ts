
import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { WorkspaceProfile } from '../services/authService'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: WorkspaceProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
