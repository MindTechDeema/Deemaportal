import type { Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import * as authService from '../services/authService'
import type { WorkspaceProfile } from '../services/authService'
import { AuthContext } from './useAuth'

const errorText = (reason: unknown) => reason instanceof Error ? reason.message : 'An unexpected authentication error occurred.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true), [authError, setAuthError] = useState('')
  const validatedUser = useRef<string | null>(null)
  const clear = useCallback(() => { validatedUser.current = null; setUser(null); setSession(null); setProfile(null) }, [])
  const refreshProfile = useCallback(async () => {
    try { const current = await authService.getCurrentProfile(); validatedUser.current = current.id; setProfile(current) }
    catch (reason) { clear(); await authService.signOut().catch(() => undefined); throw reason }
  }, [clear])

  useEffect(() => {
    let active = true
    let revision = 0
    const restore = async () => {
      const currentRevision = ++revision
      const current = () => active && currentRevision === revision
      try {
        const currentSession = await authService.getCurrentSession()
        if (!current()) return
        if (!currentSession) { clear(); return }
        setSession(currentSession); setUser(currentSession.user)
        const currentProfile = await authService.getCurrentProfile()
        if (current()) { validatedUser.current = currentProfile.id; setProfile(currentProfile); setAuthError('') }
      } catch (reason) {
        if (current()) { clear(); setAuthError(errorText(reason)); await authService.signOut().catch(() => undefined) }
      } finally { if (current()) setIsLoading(false) }
    }
    void restore()
    const subscription = supabase?.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession); setUser(nextSession?.user ?? null)
      if (!nextSession) { ++revision; validatedUser.current = null; setProfile(null); setIsLoading(false); return }
      // Clear another identity's profile immediately. Run Supabase requests
      // outside the auth callback to avoid holding the auth client's lock.
      setProfile(previous => previous?.id === nextSession.user.id ? previous : null)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        ++revision
        if (validatedUser.current !== nextSession.user.id) setIsLoading(true)
        window.setTimeout(() => { if (active) void restore() }, 0)
      }
    })
    return () => { active = false; ++revision; subscription?.data.subscription.unsubscribe() }
  }, [clear])

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true); setAuthError('')
    try { const result = await authService.signIn(email, password); setUser(result.user); setSession(result.session); validatedUser.current = result.profile.id; setProfile(result.profile) }
    catch (reason) { clear(); const message = errorText(reason); setAuthError(message); throw new Error(message, { cause: reason }) }
    finally { setIsLoading(false) }
  }, [clear])
  const signOut = useCallback(async () => { setAuthError(''); try { await authService.signOut() } finally { clear(); setIsLoading(false) } }, [clear])
  const value = useMemo(() => ({ user, session, profile, isAuthenticated: Boolean(user && session && profile && profile.id === user.id && session.user.id === user.id), isLoading, authError, signIn, signOut, refreshProfile }), [user, session, profile, isLoading, authError, signIn, signOut, refreshProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
