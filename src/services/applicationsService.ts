import { getWorkspace } from './jobsService'
import { requireSupabase } from '../lib/supabase'
import type { ApplicationFileInsert, ApplicationFileRecord, ApplicationFileType, ApplicationInsert, ApplicationStatus, ApplicationWithJob } from '../types/database'

export interface ApplicationUploadCapability { applicationId: string; uploadToken: string }
type ApplicationFileRpcPayload = ApplicationFileInsert & { upload_token: string }

const BUCKET = 'application-files'
const MIME_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const clean = (value: string) => value.trim()
const friendly = (error: { message: string; code?: string }, fallback: string) => {
  if (error.code === '23505' || error.message.includes('DUPLICATE_APPLICATION')) return new Error('An application with this email has already been submitted for this role.')
  if (error.message.includes('INVALID_APPLICATION_URL')) return new Error('Profile links must begin with http:// or https://.')
  if (error.message.includes('JOB_DEADLINE_PASSED')) return new Error('The application deadline for this role has passed.')
  if (error.message.includes('JOB_NOT_ACTIVE')) return new Error('This role is no longer accepting applications.')
  if (error.message.includes('INVALID_UPLOAD_TOKEN') || error.message.includes('UPLOAD_TOKEN_EXPIRED')) return new Error('The secure 30-minute upload window has expired. Your application is saved; keep your reference and contact the hiring team to attach your file without submitting again.')
  if (error.code === '42501') return new Error('You are not authorized to perform this action.')
  return new Error(fallback)
}
export const normalizeEmail = (email: string) => clean(email).toLowerCase()
export function validateApplicationFile(file: File) {
  if (!MIME_TYPES.includes(file.type)) throw new Error('Choose a PDF or DOCX file.')
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error('The file must be 10 MB or smaller.')
}
export async function submitApplication(payload: ApplicationInsert): Promise<ApplicationUploadCapability> {
  if (!clean(payload.full_name) || !normalizeEmail(payload.email) || !payload.job_id) throw new Error('Full name, email, and job are required.')
  payload = { ...payload, full_name: clean(payload.full_name), email: normalizeEmail(payload.email) }
  const { data, error } = await requireSupabase().rpc('submit_application', { application_payload: payload })
  if (error) throw friendly(error, 'Unable to submit your application. Please try again.')
  const result = Array.isArray(data) ? data[0] : data
  if (!result || typeof result !== 'object' || !('application_id' in result) || !('upload_token' in result) ||
    typeof result.application_id !== 'string' || typeof result.upload_token !== 'string') {
    throw new Error('The application was submitted but no upload capability was returned.')
  }
  return { applicationId: result.application_id, uploadToken: result.upload_token }
}
const generatedName = (file: File) => `${crypto.randomUUID()}.${file.type === 'application/pdf' ? 'pdf' : 'docx'}`
async function validateUploadCapability(applicationId: string, uploadToken: string): Promise<void> {
  const { data, error } = await requireSupabase().rpc('validate_application_upload', { application_id: applicationId, upload_token: uploadToken })
  if (error) throw friendly(error, 'Unable to validate the secure file upload. Please try again.')
  if (data !== true) throw new Error('The secure 30-minute upload window has expired. Your application is saved; keep your reference and contact the hiring team to attach your file without submitting again.')
}
async function upload(applicationId: string, uploadToken: string, file: File, type: ApplicationFileType) {
  validateApplicationFile(file)
  await validateUploadCapability(applicationId, uploadToken)
  const folder = type === 'cover_letter' ? 'cover-letter' : 'resume'
  const path = `applications/${applicationId}/${uploadToken}/${folder}/${generatedName(file)}`
  const { error } = await requireSupabase().storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error('Your application was saved, but the file upload failed. Keep your reference and contact the hiring team before submitting again.')
  try { await createApplicationFileRecord({ application_id: applicationId, upload_token: uploadToken, file_type: type, storage_path: path, original_filename: file.name, mime_type: file.type, file_size: file.size }) }
  catch (cause) { throw new Error(`Your file uploaded, but its record could not be finalized. Keep your reference and contact the hiring team. ${cause instanceof Error ? cause.message : ''}`.trim(), { cause }) }
  return path
}
export const uploadApplicationResume = (id: string, uploadToken: string, file: File) => upload(id, uploadToken, file, 'resume')
export const uploadApplicationCoverLetter = (id: string, uploadToken: string, file: File) => upload(id, uploadToken, file, 'cover_letter')
export async function createApplicationFileRecord(payload: ApplicationFileRpcPayload): Promise<ApplicationFileRecord> {
  const { data, error } = await requireSupabase().rpc('create_application_file', { file_payload: payload })
  if (error) throw friendly(error, 'Unable to save the uploaded file details.')
  return data as ApplicationFileRecord
}
export async function getApplications(): Promise<ApplicationWithJob[]> {
  const workspace = await getWorkspace()
  let query = requireSupabase().from('applications').select('*, job:jobs!inner(*, startup:startups(*), company:companies(id,name,slug))')
  query = workspace.account_type === 'company' ? query.eq('job.company_id', workspace.company_id) : query.is('job.company_id', null)
  const { data, error } = await query.order('submitted_at', { ascending: false })
  if (error) throw friendly(error, 'Unable to load applications.')
  return (data ?? []) as ApplicationWithJob[]
}
export async function getApplicationById(id: string): Promise<ApplicationWithJob | null> {
  const workspace = await getWorkspace()
  let query = requireSupabase().from('applications').select('*, job:jobs!inner(*, startup:startups(*), company:companies(id,name,slug))').eq('id', id)
  query = workspace.account_type === 'company' ? query.eq('job.company_id', workspace.company_id) : query.is('job.company_id', null)
  const { data, error } = await query.maybeSingle()
  if (error) throw friendly(error, 'Unable to load this application.')
  return data as ApplicationWithJob | null
}
export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<void> {
  return updateApplicationStatuses([id], status)

}
export async function updateApplicationStatuses(ids: string[], status: ApplicationStatus): Promise<void> {
  if (!ids.length) return
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length > 500) throw new Error('Select up to 500 applications at a time.')
  const { data, error } = await requireSupabase().rpc('update_workspace_application_statuses', { application_ids: uniqueIds, new_status: status })
  if (error) throw friendly(error, 'Unable to update the selected application statuses.')
  if (data !== uniqueIds.length) throw new Error('Some applications were not found or access was denied. Refresh the list.')
}
export async function getApplicationFiles(applicationId: string): Promise<ApplicationFileRecord[]> {
  if (!await getApplicationById(applicationId)) throw new Error('Application not found or access denied.')
  const { data, error } = await requireSupabase().from('application_files').select('*').eq('application_id', applicationId).order('created_at')
  if (error) throw friendly(error, 'Unable to load application files.')
  return (data ?? []) as ApplicationFileRecord[]
}
export async function createSignedFileUrl(storagePath: string, downloadFilename?: string): Promise<string> {
  const { data, error } = await requireSupabase().storage.from(BUCKET).createSignedUrl(
    storagePath,
    600,
    downloadFilename ? { download: downloadFilename } : undefined,
  )
  if (error || !data?.signedUrl) throw new Error('Unable to create a secure file link. Please try again.')
  return data.signedUrl
}
