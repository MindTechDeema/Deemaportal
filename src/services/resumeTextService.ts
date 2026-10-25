const PDF_TYPE = 'application/pdf'
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function extractResumeText(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('The resume could not be read.')
  const data = await response.arrayBuffer()
  if (mimeType === PDF_TYPE) {
    const pdfjs = await import('pdfjs-dist')
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    const document = await pdfjs.getDocument({ data }).promise
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const content = await (await document.getPage(pageNumber)).getTextContent()
      pages.push(content.items.map((item) => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join(''))
    }
    return pages.join('\n')
  }
  if (mimeType === DOCX_TYPE) {
    const mammoth = await import('mammoth/mammoth.browser')
    return (await mammoth.extractRawText({ arrayBuffer: data })).value
  }
  throw new Error('Only PDF and DOCX resumes can be analyzed.')
}
