> Historical implementation handoff. For the reported deployed state and release steps, see [production-release.md](production-release.md).

﻿# Company workspace implementation handoff - 24 October 2026

## Latest storage review

The actual live catalog report was reviewed. Registration now explicitly inserts invited memberships, matching the live active/invited/disabled constraint; approval activates them atomically. The third migration expands the live application status constraint to support technical_assessment. Existing employee read access is preserved separately from administrator write access. The legacy process_company_approval(text,text) definition, service-only ACL and token table remain unchanged. Local tests reconstruct the relevant reported schema; no SQL has been run remotely.

The confirmed broad policy named "recruiters read application files" is now explicitly replaced in 20261024000000_complete_workspace_isolation.sql with a QSTP-job ownership check. The additional restrictive guard remains, so another broad permissive policy cannot reintroduce cross-company reads. Company access remains limited to the authorized owning workspace. Existing token upload policies are retained. Local SQL tests verify QSTP's own resume is accessible, both companies' files are isolated, valid anonymous uploads work, and invalid capabilities are denied for anonymous/authenticated callers. Regression checks cover the corrected live schema. This is local evidence, not live schema certification.

Safe migration execution order against the reviewed snapshot:
1. 20261023000000_company_registration_backend.sql
2. 20261024000000_complete_workspace_isolation.sql
3. 20261024010000_workspace_application_updates.sql
4. 20261024020000_company_auth_integration_guard.sql
5. workspace_access_token_hook.sql, then enable/merge the Auth hook configuration.

Apply only these pending files; do not rerun historical QSTP migrations. No live SQL, account creation, mail, deployment or push was performed.

## Final integration delta

The reported live trigger opt-out checks user_metadata.account_type. Registration now supplies both app_metadata.account_type='company' and user_metadata.account_type='company', with full_name preserved. The prepared trigger explicitly rejects either company marker (including a conflicting trusted QSTP marker), and only trusted app_metadata.account_type='qstp' may positively provision a new recruiter. User-editable metadata is never proof of QSTP authorization. Existing QSTP profiles are not rewritten. The original 202607 recruiter-auth migration is historical; do not rerun it after the final guard. The forward fix is 20261024020000_company_auth_integration_guard.sql.

Confirmed live facts: companies, company_memberships and company_approval_tokens exist; company_approval_tokens was reported empty; process_company_approval(text,text) exists; the live trigger skips user_metadata.account_type=company; no Codex migration has run; supabase_migrations.schema_migrations does not exist. Missing migration history does not make this a fresh database: do not rerun the historical QSTP migrations. The actual catalog definitions have now been reviewed and represented in the local compatibility fixture. This is a snapshot review, not proof of remote execution.

The local replacement endpoints use reeno_company_registrations and the reeno_* RPCs; they are NOT a drop-in token/RPC replacement for the legacy endpoints. No existing token rows or process_company_approval body are modified. The corrected backend migration leaves legacy RPC permissions unchanged rather than altering every approval function matching a name pattern. Its separate new reeno_* RPCs remain service-only. Legacy token records, function body and ACL are covered by local preservation tests.

Required cutover: pause registrations so the confirmed zero legacy tokens cannot change during cutover; then deploy the new backend/frontend together after the migrations and configuration below. No legacy token transfer is currently indicated by the reported zero rows. If new legacy approvals are created before the pause, complete them with the existing reviewed backend or retain it at a separate, reviewed compatibility endpoint first. If outstanding legacy requests must move to the new ledger, a schema-specific, reviewed mapping/reissue is required; the prepared resend script cannot import legacy registrations. Do not guess the token representation, hash raw legacy tokens again, bulk-activate companies, delete existing companies, or deploy the new approve-company over live legacy links before they are handled. Original company_approval_tokens and process_company_approval remain intact. Reconfirm the zero outstanding legacy tokens during the registration pause before replacing the endpoints.

If only the trigger guard is being applied to the existing legacy backend, the final forward migration can run independently; do not deploy the local register-company alone, because it requires the new registration RPCs/ledger. The reported live SQL success confirms execution of that supplied patch, not end-to-end compatibility or current policy state.

## Completed locally

Company administrators create/edit jobs without a QSTP startup. The authenticated workspace supplies ownership; a caller cannot set another company. New slugs contain UUIDs and edits retain the saved slug. Lists and detail pages support nullable startups, correct company names, real applicant counts and public URLs. Company jobs support full-time, part-time, contract and internship employment types; QSTP retains its original choices.

Applications, detail pages, status updates, file metadata and signed file links are scoped to the owning job workspace. Bulk status changes use an atomic RPC: every requested application must be authorized before any row changes. Resume and cover-letter attachments can be uploaded and accessed; applicant PDF exports support company jobs. Company application education/contact fields are optional beyond name/email/resume, while QSTP retains its original required fields. Unsafe applicant link protocols are rejected and old unsafe links are not rendered.

Dashboard figures and tables use workspace data, replacing sample figures. Sidebar/header/settings/public careers display the appropriate identity. Settings show read-only workspace/account information and the company careers link. Existing team-management functionality was not invented.

QSTP routes remain `/careers`, `/careers/:jobSlug`, `/apply` and `/application-success` beneath the job path. Company equivalents are under `/companies/:companySlug/careers`. Unknown companies do not fall back to QSTP. Parameter changes remount form/detail state so old job/applicant values cannot carry into another route. Auth refreshes revalidate access without discarding drafts for the same identity; changing identity/workspace clears the previous view.

Membership checks precede recruiter profiles. Pending memberships and company-marked identities without memberships cannot fall back to accidental recruiter profiles. Existing QSTP profiles remain unchanged. New QSTP provisioning requires trusted `app_metadata.account_type = 'qstp'`; browser-supplied user metadata cannot grant recruiter access. Multiple memberships fail closed in the UI because this demo has no workspace selector.

## Registration and approval source

The deployed registration/approval function source and exact company schema definitions remain absent from this checkout. Local replacement implementations now follow the existing signup request contract; compare them with the deployed definitions before replacing anything.

- `register-company` validates input and origin, checks per-email/global registration limits, creates only a new banned company Auth identity, then invokes a service-only atomic registration RPC. It never adopts an existing email identity or creates a session/QSTP profile. Only a newly created, unprovisioned identity is eligible for cleanup on a failed database transaction.
- Registration writes a pending company and invited admin membership and a private approval ledger. Approval tokens contain 256 random bits; only their SHA-256 hashes are stored. The mail uses the configured trusted origin, sender and approver mailbox, not client-provided recipients/redirects. Delivery uses Resend.
- Mail failure leaves the identity banned and company pending. The confirmation page reports the notification failure. A trusted administrator can reissue the email using the prepared local script.
- The email opens `/signup/approve#token=...`. Viewing/inspecting the page does not approve it. The user explicitly confirms; the Edge Function hashes the token and invokes a service-only approval RPC. The client cannot choose the activated company. Row locking, expiry checks, activation, ban removal and token consumption happen atomically. Reused/expired tokens fail.
- Approval responses expose no session credentials. The review page removes the token from its current URL; reopen the original email link after a reload. Vercel headers prevent framing/caching of the approval page and suppress referrers.

Existing company tables, old approval tokens, QSTP data and profiles are not deleted. Existing pending registrations in company_approval_tokens / process_company_approval(text,text) are not automatically imported into the new private ledger. Follow the final integration cutover above; do not delete/re-register existing companies.

## Exact manual steps before the demo

No command below has been run remotely by this implementation.

1. The supplied live schema report has been reviewed. Reconfirm no schema drift or new outstanding legacy tokens before the coordinated cutover. The first migration checks column types and required defaults; registration explicitly uses membership status='invited'. Existing QSTP profiles remain unchanged. New QSTP provisioning now requires trusted app_metadata.account_type='qstp'; public signup metadata cannot grant recruiter access.
2. Only after reviewing the legacy definitions and handling outstanding legacy approval links as described above, pause registrations and apply these files manually in order, against the existing QSTP schema; do not rerun historical migrations or create a migration-history table merely because that table is absent:
   - `supabase/migrations/20261023000000_company_registration_backend.sql`
   - `supabase/migrations/20261024000000_complete_workspace_isolation.sql`
   - `supabase/migrations/20261024010000_workspace_application_updates.sql`
   - `supabase/migrations/20261024020000_company_auth_integration_guard.sql`
   The first migration now checks required column types, enum labels and unexpected mandatory columns before modifying existing objects. Mismatches abort with REENO_SCHEMA_MISMATCH inside the transaction; roll back the failed transaction and obtain actual definitions instead of dropping columns or loosening constraints. CREATE TABLE IF NOT EXISTS is not treated as schema validation. The scripts can be reapplied to their own checked contract. They replace only their named policies/triggers, preserve records, and add restrictive guards alongside legacy permissive policies. Existing private-company column grants are removed; only public company fields remain readable. Candidate uploads retain token capabilities; file reads require the owning workspace. A missing private application bucket is provisioned; existing size/MIME limits are retained.
3. Apply `supabase/workspace_access_token_hook.sql` and enable `public.workspace_access_token_hook` under Authentication > Hooks > Custom Access Token. If another hook is already enabled, merge these checks with its existing logic rather than removing it. New registrations are banned until approval independently; this hook also covers legacy pending/inactive workspaces and refresh tokens. Existing QSTP recruiters remain allowed.
4. Copy `supabase/functions/.env.example` to a private `.env.company.local` file and fill in:
   - `APP_ORIGIN`: the exact application origin, without a path, for example `https://YOUR_APP.vercel.app`. For a local-only demo use `http://localhost:5173`.
   - `RESEND_API_KEY`: a server-only mail key.
   - `APPROVAL_EMAIL_FROM`: a sender on your verified mail domain.
   - `APPROVAL_EMAIL_TO`: the supervisor/administrator who approves companies.
   Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into deployed functions; do not set reserved Supabase secrets from this file or expose them to Vite.
5. When you authorize backend deployment, run:
   ```sh
   supabase secrets set --env-file .env.company.local --project-ref YOUR_PROJECT_REF
   supabase functions deploy register-company --project-ref YOUR_PROJECT_REF
   supabase functions deploy approve-company --project-ref YOUR_PROJECT_REF
   supabase functions deploy generate-job-content --project-ref YOUR_PROJECT_REF
   ```
   The checked-in `supabase/config.toml` makes the registration/approval endpoints public with their own validation/token authorization; AI generation retains JWT and approved-workspace checks. On restricted Windows PowerShell installations use the `.cmd` CLI wrapper.
6. Serve the local app with `npm run dev` (set APP_ORIGIN to that exact local origin when using it against the functions). For the hosted app, publish the reviewed frontend only after your explicit deployment approval. The new approval route must exist at APP_ORIGIN before an email link can work. The existing SPA rewrite and added approval headers are in `vercel.json`.
7. Run the live smoke checks below using existing authorized identities. No real test accounts or demo records were created by this implementation. If no suitable identities exist, account creation remains a separate decision for you.

If an approval email failed or expired for a registration in the new ledger, copy the private mail env file to a private administrator env file and additionally supply `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Run only when you intend to send a new email:

```sh
node --env-file=.env.company-admin.local scripts/resend-company-approval.mjs COMPANY_UUID
```

This script is server/admin-only, rotates the token, and sends mail to the configured approver. It cannot reactivate an approved company, and never prints the raw token or service key. It has not been executed here.

## Local verification

- `npx.cmd tsc --noEmit` and `npm.cmd run build`: passed after the final code changes. The build reports a non-failing bundle-size warning.
- `npm.cmd run lint`: passed for application and function source.
- `npm.cmd run check:functions`: passed; type-checks Edge Function source against the installed Supabase SDK and minimal local Deno declarations. This does not replace deployed Deno/gateway testing.
- `npm.cmd run test:workspaces`: all 51 service, Edge-handler and PostgreSQL security regression checks passed. PGlite is a development-only dependency; it is not included in the frontend bundle. Its disposable, in-memory fixtures cannot connect to Supabase or create actual Auth accounts/demo records. The SQL suite runs the original QSTP base plus the reported live company schema and prepared migrations, tests broad legacy policies/column grants, and verifies record preservation on reapplication. The test database uses small pgcrypto shims for the original application RPC; hosted storage/Auth still need live checks.
- Compatible dependency updates resolved the seven advisories found by npm audit; the update reported zero vulnerabilities. No force/major-version upgrade was requested. Exercise document parsing/PDF exports in the smoke test after these updates.

## Live smoke checks still required

1. Existing QSTP login, startup selection, job creation/editing, public careers, applicant review/status, attachments and PDF exports.
2. Pending company rejection both in the React app and direct Supabase sign-in; inactive-company refresh rejection after configuring the Auth hook.
3. Actual mail delivery; opening a link alone leaves the company pending; confirming activates only its company/admin. Altered, expired and reused links must fail. Approved administrator login/reload should show its identity.
4. Two existing companies must see only their own applicants, files, private jobs and counts. Try foreign IDs, forged ownership, mixed-company bulk status requests and direct REST/storage access. Published jobs remain intentionally public. Previously issued signed file URLs may remain valid until expiry; new URLs last ten minutes.
5. QSTP `/careers` must exclude company jobs; each company route must include only its published jobs. Unknown companies, drafts/closed jobs and inactive companies must reject new submissions. Check deadlines and duplicate applications.
6. Submit a resume and optional cover-letter attachment in anonymous and signed-in sessions; inspect/download them in the owning workspace, verify denial in another workspace, change status and export the applicant PDF. Refresh expired links by reloading the detail page.
7. Check duplicate job titles yield different slugs; editing retains the public URL. Check route switching, empty careers pages, company full-time job applications, direct navigation and refresh under Vercel rewrites.

## Changed-file manifest

- `package.json`, `package-lock.json`, `vercel.json`
- `src/types/database.ts`, `src/contexts/AuthContext.tsx`
- `src/services/authService.ts`, `jobsService.ts`, `applicationsService.ts`, `aiService.ts`, `reenoTemplateService.ts`
- `src/pages/jobs/CreateJobPage.tsx`, `JobDetailsPage.tsx`, `JobsPage.tsx`
- `src/components/jobs/JobsFilters.tsx`, `JobsTable.tsx`, `create/JobDetailsStep.tsx`, `create/ReviewStep.tsx`
- `src/pages/applicants/ApplicantsPage.tsx`, `ApplicantProfilePage.tsx`, `src/utils/applicantPdf.ts`
- `src/pages/dashboard/DashboardPage.tsx`, all four existing `src/components/dashboard/` widgets
- `src/pages/settings/SettingsPage.tsx`, `src/components/layout/Header.tsx`
- `src/layouts/AppLayout.tsx`, `PublicLayout.tsx`, `src/routes/AppRoutes.tsx`
- All four existing `src/pages/public/` pages
- `src/pages/signup/CompanySignupPage.tsx`, `PendingApprovalPage.tsx`, new `CompanyApprovalPage.tsx`
- New `supabase/config.toml`, `functions/.env.example`, `functions/_shared/company.ts`, `functions/register-company/index.ts`, `functions/approve-company/index.ts`, `functions/runtime.d.ts`, `tsconfig.functions.json`
- Updated `supabase/functions/generate-job-content/index.ts`
- The four prepared migrations listed above, `supabase/workspace_access_token_hook.sql`, new `supabase/workspace_preflight.sql`, `supabase/workspace_compatibility_check.sql`
- `scripts/verify-workspaces.mjs`, new `scripts/verify-workspace-sql.mjs`, `scripts/verify-company-functions.mjs`, `scripts/resend-company-approval.mjs`
- This handoff document

Pre-existing Sidebar and useAuth changes were preserved. Company branding in those files was already functional. The pre-existing `reeno-multiclient-review.txt` was not changed.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- https://supabase.com/docs/guides/functions/function-configuration
- https://resend.com/docs/api-reference/emails/send-email
- https://pglite.dev/docs/

No live Supabase writes/settings changes, real account creation, data deletion, pushes, mail sends or deployments were performed.
