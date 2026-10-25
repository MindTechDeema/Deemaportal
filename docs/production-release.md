# Production release - 25 October 2026

The operator reports that all four 20261023/20261024 migrations, workspace_access_token_hook and Edge Functions are already applied to project vlwwndufespahrklthtk. Do not rerun migrations as part of the frontend release. The older company-workspace-handoff.md records the implementation and initial setup, not current deployment state.

## Approval route incident

The previous committed frontend had no /signup/approve route. Its catch-all redirected to /dashboard, and the login guard redirected unauthenticated visitors to /login. The branch now includes a public /signup/approve page outside ProtectedRoute. This explains the observed redirect if production serves the old frontend; hosted execution has not been verified here.

Both register-company and the administrator resend script produce APP_ORIGIN + /signup/approve#token=<capability>. APP_ORIGIN must be https://reeno.vercel.app in production. The URL fragment is removed from current history after the page captures it. Opening the page calls approve-company with action inspect; only clicking Approve company sends action approve. The database activates the intended company/member, removes the Auth ban and writes approved_at atomically. Opening a link alone must leave approved_at null. Tokens must not appear in screenshots, logs, issues or Git.

## Release gate

1. Review and merge this feature branch only after normal review. No production deployment was performed during preparation.
2. Verify Vercel production environment has VITE_SUPABASE_URL for project vlwwndufespahrklthtk and VITE_SUPABASE_ANON_KEY (public browser key only). Never put service-role, mail or AI keys in VITE variables.
3. Verify production APP_ORIGIN is https://reeno.vercel.app in Edge Function secrets. Preserve existing hook, RLS and gateway settings. The registration and approval function configs already specify verify_jwt=false.
4. After authorized frontend deployment, reopen an existing unexpired approval link: public approval screen, inspect invocation, no login redirect. Click Approve company and verify approve invocation, approved_at and company/member activation. Reused/expired tokens must fail. If an existing link expired, a separately authorized administrator may use resend-company-approval.mjs; no email was sent during preparation.
5. Smoke-test existing QSTP login, jobs, applicants and files, then two company workspaces and anonymous careers submissions. These live checks remain required; local fixtures do not certify the deployed system.

Supabase .temp files are untracked and ignored. Private env files and captured diagnostic reports are excluded. SQL diagnostic scripts contain queries, not live report output, and remain versioned for reproducible review.
