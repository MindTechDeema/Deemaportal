# Supabase setup for REENO

## Configure the project

1. Create a Supabase project, then open **Project Settings → API**.
2. Copy the Project URL and the `anon`/publishable key. Never use the service-role key in this frontend.
3. Create `.env.local` with:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Restart Vite after changing environment variables.

## Apply the database

From the repository root, link the project and apply both timestamped migrations:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

For a disposable local development database, `supabase db reset` reapplies migrations and runs `supabase/seed.sql`. It destroys existing local data. The seed creates four startups and 12 jobs: 8 active, 3 draft, and 1 closed.

The recruiter-auth migration creates `public.profiles`, the auth-user profile trigger, `created_by` on jobs, and profile-gated RLS. Anonymous users can read startups and active jobs only. Active recruiters/admins can read all startups and jobs and can insert/update—but not delete—jobs.

## Create a recruiter manually

Public recruiter signup is intentionally disabled. Create every recruiter in the Supabase dashboard:

1. Open **Authentication → Users** and choose **Add user → Create new user**.
2. Enter the recruiter's email and a temporary password. Do not save credentials in repository files.
3. Enable email confirmation for the dashboard-created user as appropriate for the project.
4. Add user metadata in JSON form:

   ```json
   {
     "full_name": "Recruiter Name",
     "role": "recruiter"
   }
   ```

   Use `admin` only for authorized hiring administrators.
5. Create the user. The database trigger should create the corresponding `public.profiles` row.
6. Open **Table Editor → profiles**. Verify the row uses the Authentication user ID, has the correct full name and role, `organization` is `QSTP Hiring Team`, and `is_active` is `true`.

If the auth user existed before the trigger was installed, edit and run `supabase/backfill_recruiter_profile.sql` in the SQL Editor after replacing its placeholder UUID and name. Never insert directly into `auth.users`; create users through Authentication instead.

## Verify authentication and authorization

Run `npm run dev`, then test all of the following:

1. While signed out, open `/dashboard`, `/jobs`, `/jobs/new`, `/applicants`, an applicant detail URL, and `/settings`. Each must redirect to `/login`.
2. Open `/careers` and an active job while signed out. These routes must remain public; draft and closed jobs must not be visible.
3. Sign in at `/login` with the manually created recruiter. Invalid credentials should show an inline error. A successful sign-in should return to the originally requested recruiter route or `/dashboard`.
4. Refresh the browser on a protected route to confirm the Supabase session is restored without protected-content flashing.
5. Open `/jobs` and verify all 12 seeded jobs are shown: 8 active, 3 drafts, and 1 closed.
6. Open `/jobs/new`. Save one job as a draft and publish another; each should submit once and return to `/jobs`. Confirm `created_by` contains the signed-in auth user ID.
7. Use **Log out** in the recruiter sidebar. Confirm the app returns to `/login` and protected routes redirect again.
8. Set the recruiter's `profiles.is_active` to `false`, sign out and attempt another sign-in. Access must be denied. Restore it to `true` for continued testing.

Authentication may persist locally through Supabase's normal browser session storage even though the Remember me checkbox is currently informational. Email and external publishing integrations remain outside this milestone.

## Configure AI job content generation

The browser never receives the OpenAI key. It calls the authenticated `generate-job-content` Supabase Edge Function, which verifies the caller's JWT and `public.is_active_recruiter()` before contacting OpenAI.

1. Sign in to the OpenAI Platform, open **API keys**, create a new secret key for this project, and copy it once. Do not put it in `.env.local`, any `VITE_` variable, source code, or GitHub.
2. Store it as an Edge Function secret (replace the placeholder locally; do not save the command containing the real key):

   ```sh
   supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY --project-ref YOUR_PROJECT_REF
   ```

3. Deploy the function:

   ```sh
   supabase functions deploy generate-job-content --project-ref YOUR_PROJECT_REF
   ```

4. Sign in to REENO as an active recruiter and use each AI button in the Create/Edit Job wizard. For a direct test, copy the recruiter's access token from a trusted local test session and run:

   ```sh
   curl -i https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-job-content \
     -H "Authorization: Bearer RECRUITER_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{"mode":"job_description","job":{"startupName":"Example Startup","title":"Software Engineering Intern","department":"Engineering","location":"Doha","employmentType":"Internship","workArrangement":"Hybrid"}}'
   ```

   Expect `200` and strict JSON. Also test without a token (`401`) and with an inactive/non-recruiter account (`403`).

5. Confirm browser DevTools and the built JavaScript contain only the Supabase URL and publishable/anon key, never `OPENAI_API_KEY` or its value. The service-role key is not used by this flow.

If the function is missing or the secret is unset, the UI shows a setup message and does not substitute mock content.
# Real candidate applications

The application milestone is defined in `supabase/migrations/20260731030000_create_candidate_applications.sql`. Run it manually in the Supabase SQL Editor after the earlier migrations. The app never runs this SQL automatically.

## Private storage setup

In **Storage → New bucket**, create `application-files` with **Public bucket disabled**, a 10 MB file-size limit, and only these MIME types:

- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

The migration includes object policies for anonymous uploads beneath `applications/{applicationId}/...` and active-recruiter reads. Never make this bucket public. Recruiter downloads use signed URLs that expire after 10 minutes.

The client submits through `submit_application(jsonb)`, which validates that the job is active, checks its deadline, normalizes email, and returns the new application UUID plus a cryptographically random upload token. Only the token's SHA-256 hash is stored. The plaintext token is returned once, expires 30 minutes after application creation, and must accompany both the application-specific storage path and file-metadata RPC. Candidates should complete document uploads within that 30-minute window. No anonymous application `SELECT` policy or email-existence RPC is provided. Duplicate attempts rely on the unique database index and are translated into a friendly message without revealing application status through a separate lookup endpoint.

Upload paths use `applications/{applicationId}/{uploadToken}/resume/{generatedFilename}` or `applications/{applicationId}/{uploadToken}/cover-letter/{generatedFilename}`. Anonymous users receive INSERT-only storage access when the UUID/token pair validates; they cannot list, read, update, delete, or download objects. Recruiters continue to use short-lived signed URLs. An Edge Function with single-use token consumption and rate limiting would provide additional abuse protection for a higher-risk production deployment.

Only one `resume` and one `cover_letter` metadata record may be created for each application. If the upload token expires, the application remains saved and the candidate is instructed to keep the reference and contact the hiring team rather than submit a duplicate application.

## Manual tests

1. In a signed-out browser, open an active job, submit every required candidate field and screening question, and attach a PDF or DOCX smaller than 10 MB.
2. Confirm `applications` contains normalized email and the preserved question ID, text, type, and answer; confirm `application_files` points to the private object.
3. Retry the same job and email. Confirm the friendly duplicate message and the unique `(job_id, lower(trim(email)))` index both prevent it.
4. Test a closed, missing, and deadline-passed job. Each must reject submission.
5. Sign in as an active recruiter. Confirm `/applicants` loads real records and `/applicants/{id}` loads details. A signed-out user must not read either table.
6. Change every supported status and confirm it persists. Confirm an inactive profile cannot update it.
7. Open the resume from the review workspace. Confirm the URL is signed, the bucket URL is not public, and the link stops working after 10 minutes.
8. Test a disallowed type and a file over 10 MB; both client and bucket limits should reject them.

If an object upload succeeds but metadata creation fails, the candidate is shown their safe reference and told to contact the hiring team instead of submitting a duplicate. An administrator may need to reconcile that orphaned private object manually.
