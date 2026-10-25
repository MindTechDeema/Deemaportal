-- Read-only review before applying the new migrations to an existing project.
-- Do not share this report publicly: function definitions may be private.
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public'
and table_name in ('companies','company_memberships','company_approval_tokens','jobs','profiles','applications','application_files')
order by table_name,ordinal_position;
select conrelid::regclass as table_name,conname,pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid in ('public.jobs'::regclass,'public.applications'::regclass)
   or conrelid in (select oid from pg_class where relnamespace='public'::regnamespace and relname in ('companies','company_memberships','company_approval_tokens'));
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where (schemaname='public' and tablename in ('companies','company_memberships','company_approval_tokens','jobs','profiles','applications','application_files'))
or (schemaname='storage' and tablename='objects') order by schemaname,tablename,policyname;
select table_name,grantee,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in ('companies','company_memberships','company_approval_tokens','applications','application_files')
and grantee in ('PUBLIC','anon','authenticated') order by table_name,grantee,privilege_type;
select table_name,column_name,grantee,privilege_type from information_schema.column_privileges
where table_schema='public' and table_name in ('companies','applications')
and grantee in ('PUBLIC','anon','authenticated') order by table_name,column_name;
select p.oid::regprocedure as function_name,p.prosecdef as security_definer,p.proacl,
 pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f' and (p.prosecdef or p.proname ilike '%company%') order by p.proname;
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='application-files';
-- Existing tables may include additional required fields or enum status values.
-- The registration RPC expects companies(name,slug,status='pending') and
-- memberships(company_id,user_id,role='company_admin',status='invited').
select tgrelid::regclass as table_name,tgname,pg_get_triggerdef(oid) as definition
from pg_trigger where not tgisinternal and tgrelid in
 ('auth.users'::regclass,'public.profiles'::regclass,'public.jobs'::regclass,'public.applications'::regclass);
-- Include legacy company-approval/token tables in the review; their sensitive
-- tokens must not be readable/writable by browser roles, even if unused by the
-- new ledger. Preserve their records and reviewed backend integrations.
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and (tablename ilike '%company%approval%' or tablename ilike '%company%token%');

-- Known deployed legacy RPC: inspect exact parameter names, privileges and body.
-- Do not invoke it here: invocation can consume a token/change company state.
select p.oid::regprocedure as legacy_rpc,p.proargnames,p.proacl,
 pg_get_functiondef(p.oid) as definition
from pg_proc p where p.oid=to_regprocedure('public.process_company_approval(text,text)');
-- List overloads before cutover; do not guess old RPC parameter semantics.
select p.oid::regprocedure as signature from pg_proc p
where p.pronamespace='public'::regnamespace and p.proname in
 ('handle_new_auth_user','process_company_approval','reeno_register_company','reeno_approve_company','reeno_check_registration_limit')
order by p.proname;
