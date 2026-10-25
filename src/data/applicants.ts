export const applicantStatuses = ['New', 'Under review', 'Interview', 'Shortlisted', 'Rejected', 'Hired'] as const
export type ApplicantStatus = (typeof applicantStatuses)[number]
export type ApplicantStatusFilter = ApplicantStatus | 'All'

export interface ResumeSectionItem { title: string; subtitle: string; period: string; details: string[] }
export interface ApplicantResume { filename: string; fileType: string; fileSize: string; summary: string; education: ResumeSectionItem[]; experience: ResumeSectionItem[]; projects: ResumeSectionItem[] }
export type AnswerFormat = 'Long text' | 'Yes / No' | 'Number' | 'Multiple choice' | 'Short text'
export interface ScreeningAnswer { question: string; answer: string; format: AnswerFormat }
export interface ActivityEvent { title: string; description: string; dateTime: string; actor?: string }
export interface RecruiterNote { id: string; text: string; author: string; dateTime: string }
export interface Evaluation { technicalFit: number; relevantExperience: number; communication: number; motivation: number; overallRecommendation: number }
export interface AIInsights { match: number; recommendation: string; strengths: string[]; areasToExplore: string[]; experienceSummary: string; suggestedFocus: string }
export interface AIWritingIndicator { percentage: number; confidence: 'Low' | 'Moderate' | 'High'; indicators: string[]; recommendation: string }

export interface Applicant {
  id: string; name: string; email: string; jobTitle: string
  startup: 'AeroQ' | 'Sadeem Technology' | 'GreenRoute' | 'MedLoop'
  appliedDate: string; status: ApplicantStatus; match: number; phone: string; location: string
  university: string; degree: string; graduationYear: number; gpa: string; linkedinUrl: string
  portfolioUrl: string; experience: string; skills: string[]; resume: ApplicantResume
  coverLetter: string[]; screeningAnswers: ScreeningAnswer[]; activity: ActivityEvent[]
  aiInsights: AIInsights; aiWritingIndicator: AIWritingIndicator; recruiterNotes: RecruiterNote[]; evaluation: Evaluation
}

type ApplicantSeed = Pick<Applicant, 'id' | 'name' | 'email' | 'jobTitle' | 'startup' | 'appliedDate' | 'status' | 'match'> &
  Pick<Applicant, 'university' | 'degree' | 'graduationYear' | 'gpa' | 'skills'>

const seeds: ApplicantSeed[] = [
  { id: 'amina-al-kuwari', name: 'Amina Al-Kuwari', email: 'amina.alkuwari@example.com', jobTitle: 'Software Engineering Intern', startup: 'Sadeem Technology', appliedDate: '2026-07-31', status: 'New', match: 92, university: 'Qatar University', degree: 'BSc Computer Science', graduationYear: 2027, gpa: '3.82 / 4.00', skills: ['TypeScript', 'React', 'Python', 'SQL', 'Git', 'REST APIs'] },
  { id: 'yousef-hassan', name: 'Yousef Hassan', email: 'yousef.hassan@example.com', jobTitle: 'Data Analytics Intern', startup: 'GreenRoute', appliedDate: '2026-07-31', status: 'New', match: 87, university: 'Carnegie Mellon University Qatar', degree: 'BSc Information Systems', graduationYear: 2027, gpa: '3.68 / 4.00', skills: ['Python', 'SQL', 'Power BI', 'Data Visualization', 'Excel'] },
  { id: 'leila-mansour', name: 'Leila Mansour', email: 'leila.mansour@example.com', jobTitle: 'Product Design Intern', startup: 'AeroQ', appliedDate: '2026-07-30', status: 'Under review', match: 89, university: 'Virginia Commonwealth University School of the Arts in Qatar', degree: 'BFA Graphic Design', graduationYear: 2027, gpa: '3.75 / 4.00', skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Accessibility'] },
  { id: 'omar-al-sulaiti', name: 'Omar Al-Sulaiti', email: 'omar.alsulaiti@example.com', jobTitle: 'AI Research Intern', startup: 'Sadeem Technology', appliedDate: '2026-07-29', status: 'Interview', match: 85, university: 'Hamad Bin Khalifa University', degree: 'BSc Computer Engineering', graduationYear: 2026, gpa: '3.61 / 4.00', skills: ['Python', 'PyTorch', 'Machine Learning', 'SQL', 'Research'] },
  { id: 'sara-ibrahim', name: 'Sara Ibrahim', email: 'sara.ibrahim@example.com', jobTitle: 'Business Development Intern', startup: 'MedLoop', appliedDate: '2026-07-28', status: 'Shortlisted', match: 81, university: 'HEC Paris in Qatar', degree: 'BBA Business Administration', graduationYear: 2027, gpa: '3.54 / 4.00', skills: ['Market Research', 'Excel', 'Presentations', 'CRM', 'Project Management'] },
  { id: 'khalid-al-marri', name: 'Khalid Al-Marri', email: 'khalid.almarri@example.com', jobTitle: 'Cybersecurity Intern', startup: 'Sadeem Technology', appliedDate: '2026-07-27', status: 'Under review', match: 78, university: 'University of Doha for Science and Technology', degree: 'BSc Cybersecurity', graduationYear: 2027, gpa: '3.49 / 4.00', skills: ['Network Security', 'Python', 'Linux', 'SIEM', 'Risk Assessment'] },
  { id: 'nour-el-din', name: 'Nour El-Din', email: 'nour.eldin@example.com', jobTitle: 'Marketing Intern', startup: 'AeroQ', appliedDate: '2026-07-25', status: 'Rejected', match: 64, university: 'Qatar University', degree: 'BBA Marketing', graduationYear: 2026, gpa: '3.31 / 4.00', skills: ['Content Strategy', 'Analytics', 'Canva', 'Social Media', 'SEO'] },
  { id: 'maryam-al-ansari', name: 'Maryam Al-Ansari', email: 'maryam.alansari@example.com', jobTitle: 'Sustainability Research Intern', startup: 'GreenRoute', appliedDate: '2026-07-23', status: 'Hired', match: 94, university: 'Qatar University', degree: 'BSc Environmental Science', graduationYear: 2026, gpa: '3.91 / 4.00', skills: ['Sustainability Research', 'Data Analysis', 'GIS', 'Policy Analysis', 'Reporting'] },
  { id: 'ahmed-farouk', name: 'Ahmed Farouk', email: 'ahmed.farouk@example.com', jobTitle: 'Operations Intern', startup: 'MedLoop', appliedDate: '2026-07-21', status: 'Interview', match: 76, university: 'University of Doha for Science and Technology', degree: 'BSc Logistics', graduationYear: 2027, gpa: '3.42 / 4.00', skills: ['Process Mapping', 'Excel', 'Project Management', 'Analytics', 'Procurement'] },
  { id: 'fatima-zahra', name: 'Fatima Zahra', email: 'fatima.zahra@example.com', jobTitle: 'Finance Intern', startup: 'AeroQ', appliedDate: '2026-07-18', status: 'Shortlisted', match: 88, university: 'Qatar University', degree: 'BBA Finance', graduationYear: 2026, gpa: '3.77 / 4.00', skills: ['Financial Modeling', 'Excel', 'Power BI', 'Accounting', 'Valuation'] },
  { id: 'daniel-kim', name: 'Daniel Kim', email: 'daniel.kim@example.com', jobTitle: 'Software Engineering Intern', startup: 'Sadeem Technology', appliedDate: '2026-07-15', status: 'Under review', match: 83, university: 'Carnegie Mellon University Qatar', degree: 'BSc Computer Science', graduationYear: 2027, gpa: '3.59 / 4.00', skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Testing'] },
  { id: 'ranya-saad', name: 'Ranya Saad', email: 'ranya.saad@example.com', jobTitle: 'Data Analytics Intern', startup: 'GreenRoute', appliedDate: '2026-07-12', status: 'New', match: 74, university: 'Qatar University', degree: 'BSc Statistics', graduationYear: 2027, gpa: '3.46 / 4.00', skills: ['Python', 'R', 'SQL', 'Tableau', 'Statistics'] },
  { id: 'ibrahim-musa', name: 'Ibrahim Musa', email: 'ibrahim.musa@example.com', jobTitle: 'Operations Intern', startup: 'MedLoop', appliedDate: '2026-07-08', status: 'Rejected', match: 61, university: 'University of Doha for Science and Technology', degree: 'BSc Business Management', graduationYear: 2026, gpa: '3.18 / 4.00', skills: ['Excel', 'Operations', 'Inventory Planning', 'Reporting', 'Teamwork'] },
  { id: 'sofia-martins', name: 'Sofia Martins', email: 'sofia.martins@example.com', jobTitle: 'Product Design Intern', startup: 'AeroQ', appliedDate: '2026-07-03', status: 'Hired', match: 90, university: 'Virginia Commonwealth University School of the Arts in Qatar', degree: 'BFA Interaction Design', graduationYear: 2026, gpa: '3.84 / 4.00', skills: ['Figma', 'User Research', 'Interaction Design', 'Prototyping', 'Design Systems'] },
  { id: 'tariq-rahman', name: 'Tariq Rahman', email: 'tariq.rahman@example.com', jobTitle: 'AI Research Intern', startup: 'Sadeem Technology', appliedDate: '2026-06-27', status: 'Shortlisted', match: 86, university: 'Hamad Bin Khalifa University', degree: 'BSc Data Science', graduationYear: 2026, gpa: '3.71 / 4.00', skills: ['Python', 'TensorFlow', 'NLP', 'Statistics', 'Research Writing'] },
]

const roleArea = (jobTitle: string) => jobTitle.replace(' Intern', '').toLowerCase()
const makeApplicant = (seed: ApplicantSeed, index: number): Applicant => {
  const area = roleArea(seed.jobTitle)
  const firstName = seed.name.split(' ')[0]
  return {
    ...seed,
    phone: `+974 55${String(21 + index).padStart(2, '0')} ${String(4300 + index * 37).slice(-4)}`,
    location: index % 3 === 0 ? 'Doha, Qatar' : index % 3 === 1 ? 'Al Rayyan, Qatar' : 'Lusail, Qatar',
    linkedinUrl: `https://www.linkedin.com/in/${seed.id}`,
    portfolioUrl: `https://${seed.id}.example.com`,
    experience: index % 2 === 0 ? '1 year of internship and project experience' : 'Two previous university-industry projects',
    resume: {
      filename: `${seed.name.replaceAll(' ', '_')}_Resume.pdf`, fileType: 'PDF', fileSize: `${(1.2 + (index % 5) * 0.2).toFixed(1)} MB`,
      summary: `Curious ${seed.degree} student with hands-on experience in ${area}, collaborative university projects, and a strong interest in building practical solutions for Qatar's startup ecosystem.`,
      education: [{ title: seed.degree, subtitle: seed.university, period: `2023 – ${seed.graduationYear}`, details: [`GPA: ${seed.gpa}`, `Relevant coursework in ${seed.skills.slice(0, 2).join(' and ')}`] }],
      experience: [{ title: `${seed.jobTitle.replace(' Intern', '')} Project Assistant`, subtitle: 'University Innovation Lab', period: 'Jan 2026 – Jun 2026', details: [`Collaborated with a four-person team on a practical ${area} challenge.`, `Presented findings and recommendations to faculty and industry mentors.`, `Used ${seed.skills.slice(0, 3).join(', ')} to deliver the final solution.`] }],
      projects: [{ title: `${seed.startup} Challenge Project`, subtitle: 'Independent university project', period: '2025', details: [`Designed and evaluated a prototype focused on ${area}.`, 'Documented decisions, outcomes, and next-step recommendations.'] }],
    },
    coverLetter: [
      `Dear ${seed.startup} Hiring Team,`,
      `I am excited to apply for the ${seed.jobTitle} position. My studies in ${seed.degree} at ${seed.university} have given me a strong foundation in ${seed.skills.slice(0, 3).join(', ')}.`,
      `Through university and industry projects, I have learned to turn open-ended problems into clear, testable work. I especially value feedback, thoughtful collaboration, and communicating progress to teammates with different backgrounds.`,
      `${seed.startup}'s work and the opportunity to contribute through QSTP are especially compelling to me. I would welcome the chance to bring my curiosity and practical experience to the team while learning from Qatar's startup community.`,
      `Thank you for considering my application. I look forward to discussing how I could contribute as a ${seed.jobTitle}.`,
      `Sincerely,\n${firstName}`,
    ],
    screeningAnswers: [
      { question: 'Why are you interested in this internship?', answer: `I want to apply my ${area} studies to a real startup challenge and learn from a multidisciplinary team building products in Qatar.`, format: 'Long text' },
      { question: 'Are you currently enrolled at a university?', answer: 'Yes', format: 'Yes / No' },
      { question: 'How many hours per week are you available?', answer: index % 2 ? '25' : '30', format: 'Number' },
      { question: 'Which technical area interests you most?', answer: seed.skills[0], format: 'Multiple choice' },
      { question: 'Describe a relevant project or experience.', answer: `I led part of a university project using ${seed.skills.slice(0, 3).join(', ')}. I defined the work, tested the solution, and presented our recommendations to an industry panel.`, format: 'Long text' },
      { question: 'When can you start?', answer: 'August 2026', format: 'Short text' },
    ],
    activity: [
      { title: 'Application submitted', description: `Application received for ${seed.jobTitle}.`, dateTime: `${seed.appliedDate}T09:15:00+03:00`, actor: seed.name },
      { title: 'Resume received', description: 'Resume file attached successfully.', dateTime: `${seed.appliedDate}T09:16:00+03:00` },
      { title: 'Recruiter opened application', description: 'Candidate profile reviewed in REENO.', dateTime: '2026-07-31T10:20:00+03:00', actor: 'QSTP Hiring Team' },
      ...(seed.status !== 'New' ? [{ title: `Status changed to ${seed.status}`, description: 'Candidate moved forward in the review workflow.', dateTime: '2026-07-31T11:05:00+03:00', actor: 'QSTP Hiring Team' }] : []),
      ...(seed.status === 'Interview' || seed.status === 'Shortlisted' ? [{ title: 'Interview scheduled', description: 'First-round conversation added to the recruitment plan.', dateTime: '2026-08-03T14:00:00+03:00', actor: 'QSTP Hiring Team' }] : []),
    ],
    aiInsights: { match: seed.match, recommendation: seed.match >= 88 ? 'Recommended for interview' : seed.match >= 75 ? 'Consider for initial screening' : 'Review against essential criteria', strengths: [`Strong foundation in ${seed.skills[0]} and ${seed.skills[1]}`, 'Relevant university project experience', `Solid academic performance (${seed.gpa})`], areasToExplore: ['Limited production-scale experience', index % 2 ? 'Project ownership needs more detail' : 'No listed cloud certification'], experienceSummary: `Relevant academic and project exposure to ${area}, with evidence of teamwork and structured problem-solving.`, suggestedFocus: 'Ask about teamwork, problem-solving decisions, and ownership of project outcomes.' },
    aiWritingIndicator: { percentage: 18 + (index % 5) * 7, confidence: index % 3 === 0 ? 'Low' : 'Moderate', indicators: ['Uniform sentence structure', 'Generic professional phrasing', 'Consistent transition patterns'], recommendation: "Review the applicant's experience and interview responses directly." },
    recruiterNotes: index % 2 ? [{ id: `note-${index}`, text: `Review ${firstName}'s project contribution and availability during the first call.`, author: 'Maha Al-Thani', dateTime: '2026-07-31T11:20:00+03:00' }] : [],
    evaluation: { technicalFit: 3 + (index % 3), relevantExperience: 3, communication: 4, motivation: 4, overallRecommendation: seed.match >= 85 ? 4 : 3 },
  }
}

export const applicants: Applicant[] = seeds.map(makeApplicant)

export const jobTitles = [
  'Software Engineering Intern', 'Data Analytics Intern', 'Product Design Intern', 'Business Development Intern',
  'Sustainability Research Intern', 'AI Research Intern', 'Marketing Intern', 'Operations Intern', 'Cybersecurity Intern', 'Finance Intern',
] as const
