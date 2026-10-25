import { jsPDF } from 'jspdf'
import type { ApplicationFileRecord, ApplicationWithJob } from '../types/database'

export type ResumePresentation = 'original-pdf' | 'extracted-docx' | 'extracted-pdf-fallback'
export interface ApplicantPdfContent { application: ApplicationWithJob; resume?: ApplicationFileRecord; resumeText?: string; resumePresentation?: ResumePresentation; coverLetterText?: string }
const display = (value: string | number | boolean | null | undefined) => value === null || value === undefined || value === '' ? 'Not provided' : String(value)
const date = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value)) : 'Not provided'
const size = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`

export function createApplicantPdf(content: ApplicantPdfContent): Blob {
  const { application: a } = content
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight(), left = 18, right = 18, top = 27, bottom = 18
  let y = top
  const header = () => { doc.setFillColor(15, 118, 110); doc.rect(0, 0, width, 15, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('REENO  |  Applicant report', left, 10); doc.setTextColor(30) }
  const nextPage = () => { doc.addPage(); header(); y = top }
  const ensure = (amount: number) => { if (y + amount > height - bottom) nextPage() }
  const text = (value: string, opts: { bold?: boolean; size?: number; indent?: number } = {}) => { const indent = opts.indent ?? 0; doc.setFont('helvetica', opts.bold ? 'bold' : 'normal'); doc.setFontSize(opts.size ?? 9); const lines = doc.splitTextToSize(value, width - left - right - indent) as string[]; ensure(lines.length * 4.5); doc.text(lines, left + indent, y); y += lines.length * 4.5 + 1 }
  const section = (title: string) => { ensure(12); y += 3; doc.setDrawColor(15, 118, 110); doc.line(left, y, width - right, y); y += 6; text(title, { bold: true, size: 12 }) }
  const row = (label: string, value: string | number | boolean | null | undefined) => text(`${label}: ${display(value)}`)
  header()
  row('Application reference', a.id.slice(0, 8).toUpperCase()); row('Submission date', date(a.submitted_at)); row('Current status', a.status.replaceAll('_', ' '))
  section('Applicant details')
  ;[['Full name', a.full_name], ['Email', a.email], ['Phone', a.phone], ['Country of residence', a.country_of_residence], ['University', a.university], ['Degree', a.degree], ['Field of study', a.field_of_study], ['Expected graduation date', date(a.expected_graduation_date)], ['LinkedIn URL', a.linkedin_url], ['Portfolio URL', a.portfolio_url], ['Source', a.source]].forEach(([label, value]) => row(String(label), value))
  section('Job details')
  ;[['Job title', a.job.title], [a.job.company_id ? 'Company' : 'Startup', (a.job.startup?.name ?? a.job.company?.name ?? "Organization")], ['Department', a.job.department], ['Location', a.job.location], ['Employment type', a.job.employment_type], ['Work arrangement', a.job.work_arrangement], ['Deadline', date(a.job.deadline)]].forEach(([label, value]) => row(String(label), value))
  section('Cover letter'); text(a.cover_letter?.trim() || content.coverLetterText?.trim() || 'Not provided')
  section('Screening answers')
  if (!a.screening_answers.length) text('No screening questions were included')
  else a.screening_answers.forEach((answer, index) => { text(`${index + 1}. ${answer.question}`, { bold: true }); text(Array.isArray(answer.answer) ? answer.answer.join(', ') : display(answer.answer), { indent: 4 }) })
  section('Resume')
  if (!content.resume) text('Not provided')
  else if (content.resumePresentation === 'original-pdf') {
    nextPage(); text('Original Resume', { bold: true, size: 20 }); y += 3; row('Original filename', content.resume.original_filename); row('MIME type', content.resume.mime_type); row('File size', size(content.resume.file_size)); y += 4; text('The original resume pages follow this separator page. Their page dimensions, orientation, and visual layout are preserved.')
  } else {
    if (content.resumePresentation === 'extracted-docx') text('Resume text extracted from DOCX', { bold: true, size: 11 })
    else if (content.resumePresentation === 'extracted-pdf-fallback') text('Resume text extracted from PDF (original PDF could not be appended)', { bold: true, size: 11 })
    row('Original filename', content.resume.original_filename); row('MIME type', content.resume.mime_type); row('File size', size(content.resume.file_size)); y += 2; text(content.resumeText?.trim() || 'Resume file attached to the application but its text could not be extracted.')
  }
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) { doc.setPage(page); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100); doc.text(`Page ${page} of ${pages}`, width - right, height - 8, { align: 'right' }) }
  return doc.output('blob')
}
