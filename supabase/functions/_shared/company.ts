import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.111.0'

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new HttpError(503, 'Registration and approval are not configured. Contact REENO support.')
  return value
}
export function appOrigin(): string {
  const url = new URL(requiredEnv('APP_ORIGIN'))
  if ((!['https:','http:'].includes(url.protocol) || (url.protocol !== 'https:' && url.hostname !== 'localhost')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new HttpError(503, 'Invalid application origin configuration.')
  }
  return url.origin
}
export function headers(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin')
  // Preflight must work before mail/APP_ORIGIN configuration is validated.
  // Echo only an explicitly trusted origin; never reflect arbitrary callers.
  const allowedOrigins = new Set(['http://localhost:5173', 'https://reeno.vercel.app'])
  try { allowedOrigins.add(appOrigin()) } catch { /* POST reports configuration errors with CORS headers. */ }
  if (origin && !allowedOrigins.has(origin)) throw new HttpError(403, 'This origin is not allowed.')
  const allowed = origin || 'https://reeno.vercel.app'
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'Referrer-Policy': 'no-referrer' }
}
export const json = (body: unknown, status: number, cors: Record<string,string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
export function adminClient() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })
}
export async function readBody(request: Request): Promise<Record<string,unknown>> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Use application/json.')
  if (Number(request.headers.get('Content-Length')) > 16000) throw new HttpError(413, 'Request is too large.')
  // Bound streamed input too; Content-Length is not a trustworthy size limit.
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, 'A request body is required.')
  const chunks: Uint8Array[] = []; let size = 0
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 16000) { await reader.cancel(); throw new HttpError(413, 'Request is too large.') }; chunks.push(value) }
    const bytes = new Uint8Array(size); let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    const body = JSON.parse(new TextDecoder().decode(bytes))
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('INVALID_BODY')
    return body
  } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Invalid JSON request.') }
  finally { reader.releaseLock() }
}
export const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('')
export const approvalToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
export function failure(error: unknown, cors: Record<string,string>) {
  return json({ success: false, error: error instanceof HttpError ? error.message : 'Unable to complete this request. Please try again or contact REENO support.' }, error instanceof HttpError ? error.status : 500, cors)
}
