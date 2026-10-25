import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createSignedFileUrl,
  getApplicationById,
  getApplicationFiles,
  updateApplicationStatus,
} from "../../services/applicationsService";
import { extractResumeText } from "../../services/resumeTextService";
import {
  scoreResumeWriting,
  type ResumeWritingResult,
} from "../../lib/resumeWritingScore";
import type {
  ApplicationFileRecord,
  ApplicationStatus,
  ApplicationWithJob,
} from "../../types/database";

const statuses: ApplicationStatus[] = [
  "new",
  "reviewing",
  "technical_assessment",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
];
const label = (value: string) =>
  value === "reviewing"
    ? "Under review"
    : value[0].toUpperCase() + value.slice(1).replaceAll("_", " ");

export default function ApplicantProfilePage() {
  const { applicantId } = useParams();
  const [application, setApplication] = useState<ApplicationWithJob | null>();
  const [files, setFiles] = useState<ApplicationFileRecord[]>([]);
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeDownloadUrl, setResumeDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [writingResult, setWritingResult] =
    useState<ResumeWritingResult | null>();

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        if (!applicantId) throw new Error("Application not found.");
        const [loadedApplication, loadedFiles] = await Promise.all([
          getApplicationById(applicantId),
          getApplicationFiles(applicantId),
        ]);
        if (!active) return;
        setApplication(loadedApplication);
        setFiles(loadedFiles);

        const resume = loadedFiles.find((file) => file.file_type === "resume");
        if (!resume) return;
        const [openUrl, downloadUrl] = await Promise.all([
          createSignedFileUrl(resume.storage_path),
          createSignedFileUrl(resume.storage_path, resume.original_filename),
        ]);
        if (active) {
          setResumeUrl(openUrl);
          setResumeDownloadUrl(downloadUrl);
        }
        try {
          const resumeText = await extractResumeText(openUrl, resume.mime_type);
          const jobText = [
            loadedApplication?.job.title,
            loadedApplication?.job.description,
            loadedApplication?.job.qualifications,
            loadedApplication?.job.requirements,
          ]
            .filter(Boolean)
            .join(" ");
          if (active) setWritingResult(scoreResumeWriting(resumeText, jobText));
        } catch {
          if (active) setWritingResult(null);
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load application.",
          );
      }
    })();

    return () => {
      active = false;
    };
  }, [applicantId]);

  if (application === undefined && !error)
    return (
      <p role="status" className="p-12 text-center">
        Loading application…
      </p>
    );
  if (!application)
    return (
      <section className="rounded-xl border bg-white p-12 text-center">
        <UserRound className="mx-auto size-8" />
        <h1 className="mt-4 text-xl font-bold">Application not found</h1>
        <p className="mt-2 text-rose-700">{error}</p>
        <Link to="/applicants" className="mt-5 inline-block text-teal-700">
          Back to applicants
        </Link>
      </section>
    );

  const changeStatus = async (status: ApplicationStatus) => {
    setSaving(true);
    setError("");
    try {
      await updateApplicationStatus(application.id, status);
      setApplication({ ...application, status });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update status.",
      );
    } finally {
      setSaving(false);
    }
  };
  const resume = files.find((file) => file.file_type === "resume");
  const linkedinUrl = safeExternalUrl(application.linkedin_url)
  const portfolioUrl = safeExternalUrl(application.portfolio_url)

  return (
    <section className="space-y-6">
      <Link
        to="/applicants"
        className="inline-flex items-center gap-2 font-semibold text-teal-700"
      >
        <ArrowLeft className="size-4" />
        Back to applicants
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{application.full_name}</h1>
          <p className="mt-2 text-slate-600">
            {application.job.title} · {(application.job.startup?.name ?? application.job.company?.name ?? "Organization")}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Submitted {new Date(application.submitted_at).toLocaleString()}
          </p>
        </div>
        <label className="text-sm font-bold">
          Status
          <select
            disabled={saving}
            value={application.status}
            onChange={(event) =>
              void changeStatus(event.target.value as ApplicationStatus)
            }
            className="ml-3 rounded-lg border px-3 py-2"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
        </label>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">
          {error}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <main className="space-y-6 lg:col-span-2">
          <Card title="Candidate details">
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ["Email", application.email],
                ["Phone", application.phone],
                ["Country", application.country_of_residence],
                ["University", application.university],
                ["Degree", application.degree],
                ["Field of study", application.field_of_study],
                ["Expected graduation", application.expected_graduation_date],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs font-bold uppercase text-slate-400">
                    {key}
                  </dt>
                  <dd className="mt-1 text-sm">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex gap-4">
              {linkedinUrl && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={linkedinUrl}
                  className="text-teal-700"
                >
                  LinkedIn <ExternalLink className="inline size-3" />
                </a>
              )}
              {portfolioUrl && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={portfolioUrl}
                  className="text-teal-700"
                >
                  Portfolio or GitHub <ExternalLink className="inline size-3" />
                </a>
              )}
            </div>
          </Card>
          <Card title="Cover letter">
            <p className="whitespace-pre-wrap text-sm leading-7">
              {application.cover_letter || "No cover letter was provided."}
            </p>
          </Card>
          <Card title="Screening answers">
            <div className="space-y-4">
              {application.screening_answers.length ? (
                application.screening_answers.map((answer) => (
                  <article
                    key={answer.question_id}
                    className="rounded-lg border p-4"
                  >
                    <h3 className="font-bold">{answer.question}</h3>
                    <p className="mt-1 text-xs uppercase text-slate-400">
                      {answer.type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-3 text-sm">
                      {Array.isArray(answer.answer)
                        ? answer.answer.join(", ")
                        : String(answer.answer)}
                    </p>
                  </article>
                ))
              ) : (
                <p>No screening answers were submitted.</p>
              )}
            </div>
          </Card>
        </main>
        <aside className="space-y-6">
          <Card title="Application files">
            {resume ? (
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-teal-700" />
                  <b className="text-sm">{resume.original_filename}</b>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={resumeUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!resumeUrl}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${resumeUrl ? "hover:bg-slate-50" : "pointer-events-none opacity-50"}`}
                  >
                    <ExternalLink className="size-4" />
                    Open Resume
                  </a>
                  <a
                    href={resumeDownloadUrl || undefined}
                    aria-disabled={!resumeDownloadUrl}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${resumeDownloadUrl ? "hover:bg-slate-50" : "pointer-events-none opacity-50"}`}
                  >
                    <Download className="size-4" />
                    Download Resume
                  </a>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Secure links expire after 10 minutes.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No resume is attached.</p>
            )}
          </Card>
          {files.filter(file => file.file_type !== 'resume').map(file => <AttachmentLinks key={file.id} file={file} />)}
          <Card title="AI candidate insights — demo placeholder">
            <p className="text-sm text-slate-600">
              <AIResumeScoreContent result={writingResult} hasResume={Boolean(resume)} />
            </p>
          </Card>
        </aside>
      </div>
    </section>
  );
}

function AIResumeScoreContent({ result, hasResume }: { result: ResumeWritingResult | null | undefined; hasResume: boolean }) {
  if (!result) return <span className="block"><span className="mb-3 block text-xs text-slate-500">Generated using REENO's AI resume analysis</span><span role="status">{result === undefined && hasResume ? 'Analyzing resume locally…' : hasResume ? 'This resume could not be analyzed.' : 'No resume is attached.'}</span></span>
  return <span className="block"><span className="mb-3 block text-xs text-slate-500">Generated using REENO's AI resume analysis</span><span className="block text-3xl font-bold text-slate-900">{result.score}%</span><span className="mt-3 block h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-label="AI Resume Score" aria-valuenow={result.score} aria-valuemin={0} aria-valuemax={100}><span className="block h-full rounded-full bg-teal-600" style={{ width: `${result.score}%` }} /></span><span className="mt-5 block space-y-2">{result.indicators.map((indicator) => <span key={indicator} className="flex gap-2 text-sm text-slate-700"><span aria-hidden="true" className="text-teal-700">•</span>{indicator}</span>)}</span></span>
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{title.startsWith('AI candidate') ? 'AI Resume Score' : title}</h2>
      {children}
    </section>
  );
}

function safeExternalUrl(value: string | null): string | undefined {
  if (!value) return undefined
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined } catch { return undefined }
}

function AttachmentLinks({ file }: { file: ApplicationFileRecord }) {
  const [links, setLinks] = useState<{ open: string; download: string } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    void Promise.all([createSignedFileUrl(file.storage_path), createSignedFileUrl(file.storage_path, file.original_filename)])
      .then(([open, download]) => { if (live) setLinks({ open, download }) })
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Unable to load this attachment.') })
    return () => { live = false }
  }, [file.storage_path, file.original_filename])
  return <Card title={file.file_type === 'cover_letter' ? 'Cover letter attachment' : 'Application attachment'}><div className="rounded-lg border p-3"><p className="break-all text-sm font-bold">{file.original_filename}</p>{error ? <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p> : links ? <div className="mt-3 flex flex-wrap gap-2"><a href={links.open} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-sm font-semibold">Open file</a><a href={links.download} className="rounded-lg border px-3 py-2 text-sm font-semibold">Download file</a></div> : <p role="status" className="mt-3 text-sm text-slate-500">Loading secure links...</p>}<p className="mt-2 text-xs text-slate-500">Secure links expire after 10 minutes.</p></div></Card>
}
