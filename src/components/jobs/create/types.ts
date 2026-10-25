export type JobDetails = {
  startup: string
  title: string
  department: string
  location: string
  employmentType: string
  workArrangement: string
  deadline: string
  openings: number
  description: string
  qualifications: string
  requirements: string
}

export type ApplicantField = { id: string; label: string; enabled: boolean; required: boolean; locked?: boolean }
import type { ScreeningQuestionType, StoredScreeningQuestion } from '../../../types/database'

export type QuestionType = ScreeningQuestionType
export type ScreeningQuestion = StoredScreeningQuestion
export type JobDraft = { details: JobDetails; fields: ApplicantField[]; questions: ScreeningQuestion[] }
