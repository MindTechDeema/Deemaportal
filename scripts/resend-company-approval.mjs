// Manual administrator operation only. Never import this script into the app.
// Usage: node --env-file=<private-env-file> scripts/resend-company-approval.mjs <company-uuid>
import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'node:crypto'

const required = name => { const value = process.env[name]?.trim(); if (!value) throw new Error(`Missing ${name}`); return value }
const companyId = process.argv[2]
if (!/^[0-9a-f-]{36}$/i.test(companyId ?? '')) throw new Error('Provide a valid pending company UUID.')
const origin = new URL(required('APP_ORIGIN'))
if (!['https:','http:'].includes(origin.protocol) || (origin.protocol !== 'https:' && origin.hostname !== 'localhost') || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_ORIGIN must use HTTPS.')
const resendKey = required('RESEND_API_KEY'), sender = required('APPROVAL_EMAIL_FROM'), recipient = required('APPROVAL_EMAIL_TO')
const admin = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })
const token = randomBytes(32).toString('hex')
const { data, error } = await admin.rpc('reeno_rotate_company_approval', { target_company: companyId, replacement_hash: createHash('sha256').update(token).digest('hex') })
if (error || !data?.[0]) throw new Error('Unable to reissue approval. Verify the company is still pending and migrations are applied.')
const link = `${origin.origin}/signup/approve#token=${token}`
const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: sender, to: [recipient], subject: 'REENO company approval request', text: `Review ${data[0].company_name} (${data[0].admin_email}): ${link}\nThis single-use link expires in 48 hours. Confirm on the review page to approve.` }), signal: AbortSignal.timeout(15000) })
if (!response.ok) throw new Error('Approval notification was not sent. Check the mail provider configuration and rerun this script. The company remains pending.')
const { error: markError } = await admin.from('reeno_company_registrations').update({ approval_email_sent_at: new Date().toISOString() }).eq('company_id', companyId)
if (markError) throw new Error('Email sent, but the notification timestamp could not be saved.')
console.log('Approval notification sent. Company remains pending until approval.')
