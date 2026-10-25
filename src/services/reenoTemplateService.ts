import type { AiJobInput, GeneratedJobDescription } from './aiService'
import type { GeneratedQuestion } from './aiService'

const value = (input: string, fallback: string) => input.trim() || fallback

function roleBasics(title: string, department: string): string {
  const text = `${title} ${department}`.toLowerCase()
  if (/software|developer|engineering|technical/.test(text)) return 'basic familiarity with programming, testing, and version-control concepts'
  if (/data|analytics|research|ai|machine learning/.test(text)) return 'basic familiarity with data analysis, research methods, and clear documentation'
  if (/design|product|ux|ui/.test(text)) return 'basic familiarity with user-centred design, prototyping, and presenting design decisions'
  if (/marketing|business|sales|growth/.test(text)) return 'basic familiarity with market research, professional communication, and organising information'
  if (/finance|account/.test(text)) return 'basic familiarity with spreadsheets, numerical analysis, and careful record keeping'
  return 'basic knowledge relevant to the role and department'
}

export function createJobTemplate(job: AiJobInput): GeneratedJobDescription {
  const startup = value(job.startupName, 'the startup')
  const title = value(job.title, 'internship')
  const department = value(job.department, 'the team')
  const location = value(job.location, 'the stated location')
  const arrangement = value(job.workArrangement, 'stated')
  const employment = value(job.employmentType, 'internship')
  return {
    description: `${startup} is seeking a ${title} to join ${department}. This ${employment.toLowerCase()} opportunity offers practical exposure to a growing startup environment in ${location} (${arrangement}).\n\nYou will support typical team priorities, contribute to well-defined projects, and collaborate with colleagues across the startup. The role is designed to help you build role-relevant skills, learn through feedback, and understand how a startup turns ideas into useful outcomes. You will be encouraged to ask questions, share thoughtful input, and take ownership of agreed tasks.`,
    qualifications: `• Current student or recent graduate in a relevant field\n• Clear written and verbal communication\n• Ability to collaborate respectfully and contribute to a team\n• Curiosity, reliability, and willingness to learn\n• Basic knowledge relevant to the ${title} role`,
    requirements: `• Availability for the agreed internship period and schedule\n• Ability to meet the ${arrangement} work-arrangement expectations in ${location}\n• Submission of the required application materials, including a current resume\n• ${roleBasics(title, department)}`,
  }
}

export function createStandardQuestions(job: AiJobInput): GeneratedQuestion[] {
  const title = value(job.title, 'internship')
  const startup = value(job.startupName, 'our startup')
  const arrangement = value(job.workArrangement, 'work')
  const location = value(job.location, 'the stated location')
  return [
    { text: `Which project or experience best demonstrates your readiness for the ${title} role?`, type: 'long_text', required: false, category: 'role_specific', options: [] },
    { text: 'What relevant tools, technologies, or methods have you used?', type: 'long_text', required: false, category: 'role_specific', options: [] },
    { text: 'How many months are you available for this internship?', type: 'number', required: false, category: 'role_specific', options: [] },
    { text: 'Describe a time you worked with others to solve a difficult problem.', type: 'long_text', required: false, category: 'behavioral', options: [] },
    { text: `Why are you interested in this opportunity at ${startup}?`, type: 'long_text', required: false, category: 'motivation', options: [] },
    { text: `Are you available to work in the stated ${arrangement} arrangement in ${location}?`, type: 'yes_no', required: false, category: 'role_specific', options: [] },
  ]
}

export function createLinkedInTemplate(job: AiJobInput): string {
  const title = value(job.title, 'Intern')
  const startup = value(job.startupName, 'a QSTP startup')
  const location = value(job.location, 'Qatar')
  const arrangement = value(job.workArrangement, 'Flexible')
  return `We’re looking for a ${title} to join ${startup}.\n\nThis is an opportunity to gain practical experience, collaborate with a startup team, and contribute to meaningful work.\n\nLocation: ${location}\nWork arrangement: ${arrangement}\n\nInterested? Review the role details and submit your application through the REENO careers page.\n\n#Internship ${job.accountType === 'company' ? '' : '#QSTP '}#Qatar #Careers`
}
