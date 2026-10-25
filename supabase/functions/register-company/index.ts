import { adminClient, appOrigin, approvalToken, escapeHtml, failure, headers, HttpError, json, readBody, requiredEnv, sha256 } from '../_shared/company.ts'

export async function handleRegisterCompany(request: Request): Promise<Response> {
  let cors: Record<string,string> = {}
  try {
    cors = headers(request)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') throw new HttpError(405, 'Use POST to register a company.')
    // Check mail configuration before creating any identity.
    const resendKey = requiredEnv('RESEND_API_KEY'), sender = requiredEnv('APPROVAL_EMAIL_FROM'), recipient = requiredEnv('APPROVAL_EMAIL_TO')
    const body = await readBody(request)
    const text = (key: string, max: number, optional = false) => {
      if (typeof body[key] !== 'string' || (!optional && !(body[key] as string).trim()) || (body[key] as string).length > max) throw new HttpError(400, `Invalid ${key}.`)
      return (body[key] as string).trim()
    }
    const companyName = text('companyName',150), fullName = text('fullName',150), email = text('email',254).toLowerCase(), industry = text('industry',100), website = text('website',500,true)
    const password = typeof body.password === 'string' ? body.password : ''
    if (companyName.length < 2 || fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid company name, full name and email.')
    if (password.length < 8 || password.length > 128 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new HttpError(400, 'Password must be 8-128 characters and include uppercase, lowercase, a number and a special character.')
    if (website) { let url: URL; try { url = new URL(website) } catch { throw new HttpError(400, 'Enter a complete company website URL.') }; if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new HttpError(400, 'Use an HTTP or HTTPS company website.') }
    const admin = adminClient()
    const { data: allowed, error: limitError } = await admin.rpc('reeno_check_registration_limit', { p_key_hash: await sha256('email:' + email) })
    if (limitError) throw new HttpError(503, 'Registration is temporarily unavailable.')
    if (allowed !== true) throw new HttpError(429, 'Too many registration attempts. Please try again later.')
    const { data: globalAllowed, error: globalLimitError } = await admin.rpc('reeno_check_registration_limit', { p_key_hash: await sha256('registration-global'), max_attempts: 100 })
    if (globalLimitError || globalAllowed !== true) throw new HttpError(429, 'Registration is temporarily busy. Please try again later.')
    // Never look up/adopt an existing identity by email. Only this newly created,
    // banned identity may be attached to the company created below.
    const { data: created, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, ban_duration: '876000h', app_metadata: { account_type: 'company' }, user_metadata: { account_type: 'company', full_name: fullName } })
    if (userError || !created.user) throw new HttpError(400, 'Unable to register with these details. If you already registered, sign in after approval or contact REENO support.')
    const token = approvalToken()
    const slug = (companyName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'company') + '-' + crypto.randomUUID()
    const { data: companyId, error: registrationError } = await admin.rpc('reeno_register_company', { admin_id: created.user.id, company_name: companyName, company_slug: slug, admin_name: fullName, admin_email: email, company_website: website || null, company_industry: industry, approval_hash: await sha256(token) })
    if (registrationError || typeof companyId !== 'string') {
      // The DB operation is atomic. Delete only this request's newly created
      // unprovisioned identity, never a pre-existing user/company/profile.
      await admin.auth.admin.deleteUser(created.user.id)
      throw new HttpError(503, 'Registration could not be saved. Please try again or contact REENO support.')
    }
    const link = `${appOrigin()}/signup/approve#token=${token}`
    let emailSent = false
    try {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `company-approval/${companyId}` }, body: JSON.stringify({ from: sender, to: [recipient], subject: 'REENO company approval request', html: `<p>Review this company registration:</p><p><strong>${escapeHtml(companyName)}</strong><br>${escapeHtml(fullName)} (${escapeHtml(email)})<br>${escapeHtml(industry)}</p><p><a href="${escapeHtml(link)}">Review and approve company</a></p><p>This single-use link expires in 48 hours. Opening it does not approve the company; confirm on the review page.</p>`, text: `Review ${companyName} (${email}): ${link}\nExpires in 48 hours. Confirm on the review page to approve.` }), signal: AbortSignal.timeout(15000) })
      emailSent = response.ok
    } catch { /* Keep the pending registration and ban; never grant access on mail failure. */ }
    if (emailSent) await admin.from('reeno_company_registrations').update({ approval_email_sent_at: new Date().toISOString() }).eq('company_id', companyId)
    // No tokens, company IDs, passwords or session credentials in this response.
    return json({ success: true, approvalEmailSent: emailSent }, 200, cors)
  } catch (error) { return failure(error,cors) }
}
Deno.serve(handleRegisterCompany)
