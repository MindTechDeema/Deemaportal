export type JobStatus = 'active' | 'draft' | 'closed'
export type ScreeningQuestionType = 'Short text' | 'Long text' | 'Yes or no' | 'Multiple choice' | 'Number'
export interface StoredScreeningQuestion { id: string; text: string; type: ScreeningQuestionType; required: boolean; options: string[] }
export type RecruiterRole = 'recruiter' | 'admin'
export type ApplicationStatus = 'new' | 'reviewing' | 'interview' | 'technical_assessment' | 'shortlisted' | 'offer' | 'hired' | 'rejected' | 'withdrawn'
export type ScreeningAnswerValue = string | string[] | boolean | number
export interface ScreeningAnswer { question_id: string; question: string; type: string; answer: ScreeningAnswerValue }
export interface ApplicationRecord {
  id: string; job_id: string; full_name: string; email: string; phone: string | null
  country_of_residence: string | null; university: string | null; degree: string | null
  field_of_study: string | null; expected_graduation_date: string | null; linkedin_url: string | null
  portfolio_url: string | null; cover_letter: string | null; screening_answers: ScreeningAnswer[]
  status: ApplicationStatus; source: string; submitted_at: string; updated_at: string
}
export type ApplicationInsert = Omit<ApplicationRecord, 'id' | 'status' | 'source' | 'submitted_at' | 'updated_at'> & { status?: ApplicationStatus; source?: string }
export type ApplicationUpdate = Partial<Pick<ApplicationRecord, 'status'>>
export type ApplicationFileType = 'resume' | 'cover_letter' | 'other'
export interface ApplicationFileRecord { id: string; application_id: string; file_type: ApplicationFileType; storage_path: string; original_filename: string; mime_type: string; file_size: number; created_at: string }
export type ApplicationFileInsert = Omit<ApplicationFileRecord, 'id' | 'created_at'>
export interface ApplicationWithJob extends ApplicationRecord { job: JobWithStartup }

export interface RecruiterProfile {
  id: string
  full_name: string
  role: RecruiterRole
  organization: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Startup {
  id: string
  name: string
  slug: string
  description: string | null
  website_url: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  startup_id: string | null
  company_id: string | null
  title: string
  slug: string
  department: string | null
  location: string
  employment_type: string
  work_arrangement: string | null
  deadline: string | null
  openings: number
  description: string
  qualifications: string | null
  requirements: string | null
  status: JobStatus
  published_at: string | null
  created_by: string | null
  screening_questions: StoredScreeningQuestion[]
  created_at: string
  updated_at: string
}

export interface JobWithStartup extends Job {
  application_count?: number
  startup: Startup | null
  company: { id: string; name: string; slug: string } | null
}

export interface CreateJobInput {
  startup_id: string | null
  title: string
  slug: string
  department?: string | null
  location: string
  employment_type: string
  work_arrangement?: string | null
  deadline?: string | null
  openings: number
  description: string
  qualifications?: string | null
  requirements?: string | null
  status: JobStatus
  published_at?: string | null
  screening_questions?: StoredScreeningQuestion[]
}

export type JobStatusDisplay = 'Active' | 'Draft' | 'Closed'
export const jobStatusDisplay: Record<JobStatus, JobStatusDisplay> = {
  active: 'Active', draft: 'Draft', closed: 'Closed',
}
