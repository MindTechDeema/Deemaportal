import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabaseConfigurationError = !url || !anonKey
  ? 'Supabase is not configured. Copy .env.example to .env.local, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the development server.'
  : null

export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey)
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is unavailable.')
  return supabase
}
