import JSZip from 'jszip'
import { createSignedFileUrl, getApplicationFiles } from './applicationsService'
import { extractResumeText } from './resumeTextService'
import { createApplicantPdf } from '../utils/applicantPdf'
import type { ApplicationFileRecord, ApplicationWithJob } from '../types/database'
import { PDFDocument } from 'pdf-lib'

export interface ExportResult { successful: number; resumeWarnings: number; failed: number }
const cleanName = (value: string) => Array.from(value.replace(/[<>:"/\\|?*]/g, '_')).map((character) => character.charCodeAt(0) < 32 ? '_' : character).join('').replace(/[. ]+$/g, '').trim() || 'Applicant'
async function extract(file: ApplicationFileRecord): Promise<string> { return extractResumeText(await createSignedFileUrl(file.storage_path), file.mime_type) }
async function loadPrivateFile(file: ApplicationFileRecord): Promise<{ bytes: ArrayBuffer; url: string }> {
  const url = await createSignedFileUrl(file.storage_path)
  const response = await fetch(url)
  if (!response.ok) throw new Error('The resume could not be read.')
  return { bytes: await response.arrayBuffer(), url }
}
async function appendPdfPages(report: Blob, resumeBytes: ArrayBuffer): Promise<Blob> {
  const output = await PDFDocument.load(await report.arrayBuffer())
  const original = await PDFDocument.load(resumeBytes)
  const pages = await output.copyPages(original, original.getPageIndices())
  pages.forEach((page) => output.addPage(page))
  const merged = await output.save()
  const browserBytes = new Uint8Array(new ArrayBuffer(merged.byteLength))
  browserBytes.set(merged)
  return new Blob([browserBytes], { type: 'application/pdf' })
}
function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }

export async function exportApplicants(applications: ApplicationWithJob[]): Promise<ExportResult> {
  const zip = new JSZip(), used = new Set<string>(), result: ExportResult = { successful: 0, resumeWarnings: 0, failed: 0 }
  for (const application of applications) {
    try {
      const files = await getApplicationFiles(application.id)
      const resume = files.find((file) => file.file_type === 'resume')
      const coverFile = files.find((file) => file.file_type === 'cover_letter')
      let resumeText = '', coverLetterText = '', resumeWarning = false, pdfBytes: ArrayBuffer | undefined
      if (resume?.mime_type === 'application/pdf') {
        try { pdfBytes = (await loadPrivateFile(resume)).bytes } catch { resumeWarning = true }
      } else if (resume) try { resumeText = await extract(resume); if (!resumeText.trim()) resumeWarning = true } catch { resumeWarning = true }
      if (!application.cover_letter?.trim() && coverFile) try { coverLetterText = await extract(coverFile) } catch { /* Cover letter falls back to Not provided. */ }
      let filename = `${cleanName(application.full_name)}_${cleanName(application.job.title)}.pdf`
      if (used.has(filename.toLowerCase())) filename = `${filename.slice(0, -4)}_${application.id.slice(0, 8).toUpperCase()}.pdf`
      used.add(filename.toLowerCase())
      let finalPdf: Blob
      if (resume && pdfBytes) {
        try {
          finalPdf = await appendPdfPages(createApplicantPdf({ application, resume, resumePresentation: 'original-pdf', coverLetterText }), pdfBytes)
        } catch (error) {
          console.error('Original resume PDF merge failed', { applicationId: application.id, error })
          resumeWarning = true
          try { resumeText = await extract(resume) } catch { resumeText = '' }
          finalPdf = createApplicantPdf({ application, resume, resumeText, resumePresentation: 'extracted-pdf-fallback', coverLetterText })
        }
      } else {
        if (resume?.mime_type === 'application/pdf' && !resumeText) try { resumeText = await extract(resume) } catch { /* Existing unreadable warning is rendered. */ }
        finalPdf = createApplicantPdf({ application, resume, resumeText, resumePresentation: resume ? (resume.mime_type === 'application/pdf' ? 'extracted-pdf-fallback' : 'extracted-docx') : undefined, coverLetterText })
      }
      zip.file(filename, finalPdf)
      result.successful += 1
      if (resumeWarning) result.resumeWarnings += 1
    } catch (error) { console.error('Applicant export failed', { applicationId: application.id, error }); result.failed += 1 }
  }
  if (result.successful) { const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }); download(blob, `REENO_Applicants_Export_${new Date().toISOString().slice(0, 10)}.zip`) }
  return result
}
