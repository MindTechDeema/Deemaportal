-- ONE read-only statement. Returns metadata/definitions, not applicant/token data.
-- Run as the database owner; keep the result private for compatibility review.
with target_tables(schema_name,table_name) as (values
 ('public','companies'),('public','company_memberships'),('public','company_approval_tokens'),
 ('public','profiles'),('public','jobs'),('public','applications'),('public','application_files'),
 ('public','reeno_company_registrations'),('public','reeno_registration_limits'),
 ('auth','users'),('storage','objects'),('storage','buckets')
), relations as (
 select t.*,c.oid,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl
 from target_tables t left join pg_namespace n on n.nspname=t.schema_name
 left join pg_class c on c.relnamespace=n.oid and c.relname=t.table_name
)
select jsonb_build_object(
 'migration_history_present',to_regclass('supabase_migrations.schema_migrations') is not null,
 'relations',(select jsonb_agg(to_jsonb(r)) from relations r),
 'columns',(select jsonb_agg(jsonb_build_object(
  'table',r.schema_name||'.'||r.table_name,'name',a.attname,
  'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
  'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated,
  'column_acl',a.attacl,'enum_values',(select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid=a.atttypid)
 ) order by r.schema_name,r.table_name,a.attnum)
 from relations r join pg_attribute a on a.attrelid=r.oid and a.attnum>0 and not a.attisdropped
 left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum),
 'constraints',(select jsonb_agg(jsonb_build_object('table',r.schema_name||'.'||r.table_name,
  'name',c.conname,'definition',pg_get_constraintdef(c.oid)))
 from relations r join pg_constraint c on c.conrelid=r.oid),
 'indexes',(select jsonb_agg(to_jsonb(i)) from pg_indexes i join target_tables t on t.schema_name=i.schemaname and t.table_name=i.tablename),
 'policies',(select jsonb_agg(to_jsonb(p)) from pg_policies p join target_tables t on t.schema_name=p.schemaname and t.table_name=p.tablename),
 'triggers',(select jsonb_agg(jsonb_build_object('table',r.schema_name||'.'||r.table_name,'name',t.tgname,'definition',pg_get_triggerdef(t.oid)))
 from relations r join pg_trigger t on t.tgrelid=r.oid and not t.tgisinternal),
 'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
  'arguments',pg_get_function_arguments(p.oid),'returns',pg_get_function_result(p.oid),
  'security_definer',p.prosecdef,'acl',p.proacl,'definition',pg_get_functiondef(p.oid)))
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'
 and (p.proname in ('handle_new_auth_user','is_active_recruiter','can_manage_workspace','can_manage_job','is_public_job',
  'guard_job_workspace','guard_application_public_job','submit_application','validate_application_upload','create_application_file',
  'process_company_approval','workspace_access_token_hook','update_workspace_application_statuses') or p.proname like 'reeno_%'))
) as reeno_compatibility_report;
