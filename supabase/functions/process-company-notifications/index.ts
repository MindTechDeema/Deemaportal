import { processDecisionNotification } from '../_shared/decision-notifications.ts'

Deno.serve(async (request) => {
  // Only an operator holding the private worker secret can trigger retries.
  // This endpoint does not accept company IDs or approval tokens from callers.
  const expected = Deno.env.get('COMPANY_NOTIFICATION_WORKER_SECRET')
  const supplied = request.headers.get('authorization')
  if (request.method !== 'POST' || !expected || !supplied || supplied !== `Bearer ${expected}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  try {
    const results = []
    for (let i = 0; i < 20; i++) {
      const result = await processDecisionNotification()
      if (!result.processed) break
      results.push(result)
      // Failed notifications are eligible again on a later invocation, not in this same batch.
      if (!result.sent) break
    }
    return Response.json({ success: true, results })
  } catch (error) {
    console.error('Notification worker failed:', error)
    return Response.json({ success: false, error: 'Notification processing failed' }, { status: 500 })
  }
})
