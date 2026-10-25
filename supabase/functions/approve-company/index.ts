import { adminClient, failure, headers, HttpError, json, readBody, sha256 } from '../_shared/company.ts'

export async function handleApproveCompany(request: Request): Promise<Response> {
  let cors: Record<string,string> = {}
  try {
    cors = headers(request)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') throw new HttpError(405, 'Open the approval email link and confirm on the review page.')
    const body = await readBody(request)
    if (typeof body.token !== 'string' || !/^[0-9a-f]{64}$/.test(body.token)) throw new HttpError(400, 'This approval link is invalid or expired.')
    if (!['inspect','approve'].includes(String(body.action))) throw new HttpError(400, 'Invalid approval action.')
    const admin = adminClient(), hash = await sha256(body.token)
    if (body.action === 'inspect') {
      const { data, error } = await admin.rpc('reeno_inspect_company_approval', { approval_hash: hash })
      if (error || !Array.isArray(data) || data.length !== 1) throw new HttpError(400, 'This approval link is invalid, expired, or already used.')
      return json({ success: true, companyName: data[0].company_name, expiresAt: data[0].expires_at },200,cors)
    }
    // The token alone identifies the company. Ignore any caller-supplied company ID.
    const { error } = await admin.rpc('reeno_approve_company', { approval_hash: hash })
    if (error) throw new HttpError(400, 'This approval link is invalid, expired, already used, or the company is no longer pending.')
    return json({ success: true },200,cors)
  } catch (error) { return failure(error,cors) }
}
Deno.serve(handleApproveCompany)
