import { adminClient, appOrigin, escapeHtml, requiredEnv } from './company.ts'

type Claim = { claimed_company_id: string; recipient_email: string; company_name: string; decision: 'approve' | 'deny'; claim_id: string }

export async function processDecisionNotification(companyId: string | null = null): Promise<{ processed: boolean; sent?: boolean; companyId?: string; error?: string }> {
  const admin = adminClient()
  const { data, error } = await admin.rpc('reeno_claim_company_notification', { target_company_id: companyId })
  if (error) throw new Error(`Could not claim notification: ${error.message}`)
  const claim = (data as Claim[] | null)?.[0]
  if (!claim) return { processed: false }
  let sent = false
  let reason: string | null = null
  try {
    const approved = claim.decision === 'approve'
    const loginUrl = `${appOrigin()}/login`
    const message = approved
      ? `Your registration for ${claim.company_name} has been approved. You can now sign in to your REENO company workspace.`
      : `Your registration for ${claim.company_name} was not approved. Please contact REENO support if you need further information.`
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredEnv('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `company-decision/${claim.claimed_company_id}/${claim.decision}`,
      },
      body: JSON.stringify({
        from: requiredEnv('APPROVAL_EMAIL_FROM'),
        to: [claim.recipient_email],
        subject: approved ? 'Your REENO company registration has been approved' : 'Update on your REENO company registration',
        html: `<p>Hello,</p><p>${escapeHtml(message)}</p>${approved ? `<p><a href="${escapeHtml(loginUrl)}">Sign in to REENO</a></p>` : ''}<p>Regards,<br>REENO Team</p>`,
        text: `${message}${approved ? `\n\nSign in: ${loginUrl}` : ''}`,
      }),
      signal: AbortSignal.timeout(15000),
    })
    sent = response.ok
    if (!sent) reason = `Resend returned HTTP ${response.status}`
  } catch (e) {
    reason = e instanceof Error ? e.message : 'Notification request failed'
  }
  const { data: completed, error: completionError } = await admin.rpc('reeno_complete_company_notification', {
    target_company_id: claim.claimed_company_id,
    target_claim_id: claim.claim_id,
    was_sent: sent,
    error_message: reason,
  })
  if (completionError || completed !== true) throw new Error('Notification result could not be recorded; retry may be required.')
  return { processed: true, sent, companyId: claim.claimed_company_id, ...(reason ? { error: reason } : {}) }
}
