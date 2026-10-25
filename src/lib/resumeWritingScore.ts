export interface ResumeWritingResult { score: number; indicators: string[] }

const actionVerbs = ['achieved', 'analyzed', 'built', 'collaborated', 'created', 'delivered', 'designed', 'developed', 'directed', 'implemented', 'improved', 'increased', 'launched', 'led', 'managed', 'optimized', 'organized', 'produced', 'reduced', 'researched', 'resolved', 'streamlined', 'supported', 'tested', 'trained']
const stopWords = new Set(['about', 'after', 'alongside', 'also', 'and', 'are', 'for', 'from', 'have', 'into', 'our', 'that', 'the', 'their', 'this', 'through', 'with', 'will', 'you', 'your', 'position', 'role', 'candidate', 'preferred', 'required', 'requirements', 'experience'])

const hasSection = (text: string, names: string[]) => {
  const pattern = names.map((name) => name.replace(/\s+/g, '\\s+')).join('|')
  return new RegExp(`(?:^|\\n)\\s*(?:${pattern})\\s*:?(?:\\n|$)`, 'im').test(text)
}
const keywords = (text: string) => new Set((text.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) ?? []).map((word) => word.replace(/^[.-]+|[.-]+$/g, '')).filter((word) => word.length >= 3 && !stopWords.has(word)))

export function scoreResumeWriting(resumeText: string, jobDescription: string): ResumeWritingResult {
  const text = resumeText.replace(/\r/g, '').trim()
  const lower = text.toLowerCase()
  const wordCount = (text.match(/\b[\p{L}\p{N}+#.-]+\b/gu) ?? []).length
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
  const phone = /(?:\+?\d[\d\s().-]{7,}\d)/.test(text)
  const linkedIn = /(?:linkedin\.com\/in\/|\blinkedin\b)/i.test(text)
  const github = /(?:github\.com\/|\bgithub\b)/i.test(text)
  const contact = email && phone && lines.slice(0, 8).some((line) => /[@+]|linkedin|github|https?:\/\//i.test(line))
  const education = hasSection(text, ['education', 'academic background', 'qualifications'])
  const experience = hasSection(text, ['experience', 'work experience', 'employment', 'professional experience'])
  const skills = hasSection(text, ['skills', 'technical skills', 'core competencies', 'competencies'])
  const projects = hasSection(text, ['projects', 'selected projects', 'personal projects', 'academic projects'])
  const bulletLines = lines.filter((line) => /^(?:[-•▪◦*]|\d+[.)])\s+/.test(line)).length
  const verbCount = actionVerbs.reduce((total, verb) => total + (lower.match(new RegExp(`\\b${verb}\\b`, 'g'))?.length ?? 0), 0)
  const resumeKeywords = keywords(text)
  const jobKeywords = keywords(jobDescription)
  const overlap = jobKeywords.size ? [...jobKeywords].filter((word) => resumeKeywords.has(word)).length / jobKeywords.size : 0
  const lengthScore = wordCount >= 300 && wordCount <= 900 ? 10 : wordCount >= 180 && wordCount <= 1100 ? 7 : wordCount >= 80 ? 4 : 0
  const bulletScore = bulletLines >= 6 ? 8 : bulletLines >= 3 ? 5 : bulletLines >= 1 ? 2 : 0
  const verbScore = verbCount >= 6 ? 8 : verbCount >= 3 ? 5 : verbCount >= 1 ? 2 : 0
  const keywordScore = Math.round(Math.min(overlap / 0.35, 1) * 14)
  const reasonableLines = lines.filter((line) => line.length <= 140).length / Math.max(lines.length, 1)
  const sectionCount = [education, experience, skills, projects].filter(Boolean).length
  const formattingScore = Math.round((reasonableLines >= 0.85 ? 4 : reasonableLines >= 0.65 ? 2 : 0) + (sectionCount >= 3 ? 3 : sectionCount >= 2 ? 2 : sectionCount >= 1 ? 1 : 0) + (bulletLines === 0 || bulletLines >= 3 ? 2 : 0) + (lines.length >= 8 && lines.length <= 120 ? 1 : 0))
  const score = Math.max(0, Math.min(100, Math.round(lengthScore + (contact ? 4 : 0) + (email ? 5 : 0) + (phone ? 5 : 0) + (linkedIn ? 4 : 0) + (github ? 4 : 0) + (education ? 7 : 0) + (experience ? 7 : 0) + (skills ? 7 : 0) + (projects ? 7 : 0) + bulletScore + verbScore + keywordScore + formattingScore)))

  return { score, indicators: [sectionCount >= 3 && formattingScore >= 7 ? 'Strong structure' : 'Structure could be improved', github ? 'GitHub detected' : 'Missing GitHub', overlap >= 0.25 ? 'Good keyword match' : overlap >= 0.12 ? 'Moderate keyword match' : 'Low keyword match', experience ? 'Experience section detected' : 'Missing experience section', skills ? 'Skills section detected' : 'Missing skills section'] }
}
