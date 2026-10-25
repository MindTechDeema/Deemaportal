import { requireSupabase } from '../lib/supabase'

export type AiJobInput = { accountType?: 'company' | 'qstp'; startupName: string; title: string; department: string; location: string; employmentType: string; workArrangement: string; description?: string; qualifications?: string; requirements?: string }
export type GeneratedJobDescription = { description: string; qualifications: string; requirements: string }
export type GeneratedQuestion = { text: string; type: 'short_text' | 'long_text' | 'yes_no' | 'single_choice' | 'number'; required: boolean; category: 'role_specific' | 'behavioral' | 'motivation'; options: string[] }

const setupMessage = 'AI generation is not configured. Ask an administrator to set OPENAI_API_KEY and deploy the generate-job-content Edge Function.'
const quotaMessage = 'AI generation is currently unavailable because the configured provider has no available quota.'

async function generate<T>(mode: 'job_description' | 'questions' | 'linkedin_post', job: AiJobInput): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke('generate-job-content', { body: { mode, job } })
  if (error) {
    const context = error.context as Response | undefined
    let detail = ''
    if (context) try { detail = String((await context.clone().json() as { error?: string }).error ?? '') } catch { /* keep invocation error */ }
    if (/quota|billing|insufficient_quota/i.test(detail || error.message)) throw new Error(quotaMessage)
    if (context?.status === 404 || /not configured|OPENAI_API_KEY|function/i.test(detail || error.message)) throw new Error(setupMessage)
    throw new Error(detail || error.message || 'AI generation failed. Please try again.')
  }
  if (!data || typeof data !== 'object') throw new Error('AI generation returned an invalid response. Please try again.')
  return data as T
}

export const generateJobDescription = (job: AiJobInput) => generate<GeneratedJobDescription>('job_description', job)
export const generateQuestions = (job: AiJobInput) => generate<{ questions: GeneratedQuestion[] }>('questions', job)
export const generateLinkedInPost = (job: AiJobInput) => generate<{ post: string }>('linkedin_post', job)
