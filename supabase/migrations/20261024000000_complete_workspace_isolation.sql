-- Apply after the existing company schema. No existing records are deleted.
begin;
alter table public.jobs alter column startup_id drop not null;
-- Existing jobs_slug_key already enforces globally unique job slugs.

-- The preceding registration migration preserves trusted QSTP provisioning
-- and prevents company registrations from generating recruiter profiles.
create or replace function public.is_active_recruiter()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles p where p.id = auth.uid()
   and p.is_active and p.role in ('recruiter','admin'))
 and not exists(select 1 from public.company_memberships m where m.user_id = auth.uid())
 and not exists(select 1 from auth.users u where u.id=auth.uid() and
 (u.raw_app_meta_data->>'account_type'='company' or u.raw_app_meta_data->>'company_id' is not null or u.raw_user_meta_data->>'account_type'='company'));
$$;

create or replace function public.can_manage_workspace(target_company uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select case when auth.uid() is null then false when target_company is null then public.is_active_recruiter()
 else exists(select 1 from public.company_memberships m
 join public.companies c on c.id = m.company_id
 where m.user_id = auth.uid() and m.company_id = target_company
 and m.status = 'active' and m.role = 'company_admin' and c.status = 'active') end;
$$;
create or replace function public.can_manage_job(target_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.jobs j where j.id = target_job and public.can_manage_workspace(j.company_id));
$$;
create or replace function public.can_read_workspace(target_company uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select case when auth.uid() is null then false when target_company is null then public.is_active_recruiter()
 else exists(select 1 from public.company_memberships m join public.companies c on c.id=m.company_id
 where m.user_id=auth.uid() and m.company_id=target_company and m.status='active'
 and m.role in ('company_admin','employee') and c.status='active') end;
$$;
create or replace function public.can_read_job(target_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.jobs j where j.id=target_job and public.can_read_workspace(j.company_id));
$$;
revoke all on function public.can_read_workspace(uuid),public.can_read_job(uuid) from public;
grant execute on function public.can_read_workspace(uuid),public.can_read_job(uuid) to anon,authenticated;

create or replace function public.is_public_job(target_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.jobs j where j.id = target_job and j.status = 'active'
 and (j.company_id is null or exists(select 1 from public.companies c where c.id = j.company_id and c.status = 'active')));
$$;
revoke all on function public.can_manage_workspace(uuid), public.can_manage_job(uuid), public.is_public_job(uuid) from public;
grant execute on function public.can_manage_workspace(uuid), public.can_manage_job(uuid) to anon, authenticated;
grant execute on function public.is_public_job(uuid) to anon, authenticated;

alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.application_files enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;

-- Restrictive guards intersect ALL pre-existing permissive policies.
drop policy if exists workspace_jobs_read_guard on public.jobs;
create policy workspace_jobs_read_guard on public.jobs as restrictive for select to anon, authenticated
 using (public.is_public_job(id) or (auth.uid() is not null and public.can_read_workspace(company_id)));
drop policy if exists workspace_jobs_read on public.jobs;
create policy workspace_jobs_read on public.jobs for select to anon, authenticated
 using (public.is_public_job(id) or (auth.uid() is not null and public.can_read_workspace(company_id)));
drop policy if exists workspace_jobs_insert_guard on public.jobs;
create policy workspace_jobs_insert_guard on public.jobs as restrictive for insert to anon, authenticated
 with check (public.can_manage_workspace(company_id) and created_by = auth.uid() and ((company_id is null and startup_id is not null) or (company_id is not null and startup_id is null)));
drop policy if exists workspace_jobs_insert on public.jobs;
create policy workspace_jobs_insert on public.jobs for insert to authenticated with check (public.can_manage_workspace(company_id));
drop policy if exists workspace_jobs_update_guard on public.jobs;
create policy workspace_jobs_update_guard on public.jobs as restrictive for update to anon, authenticated
 using (public.can_manage_workspace(company_id)) with check (public.can_manage_workspace(company_id) and ((company_id is null and startup_id is not null) or (company_id is not null and startup_id is null)));
drop policy if exists workspace_jobs_update on public.jobs;
create policy workspace_jobs_update on public.jobs for update to authenticated using (public.can_manage_workspace(company_id)) with check (public.can_manage_workspace(company_id));
drop policy if exists workspace_jobs_delete_guard on public.jobs;
create policy workspace_jobs_delete_guard on public.jobs as restrictive for delete to anon, authenticated using (false);

-- Keep ownership immutable, including users with more than one company membership.
create or replace function public.guard_job_workspace() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.company_id is distinct from old.company_id or new.created_by is distinct from old.created_by then
 raise exception 'Job workspace ownership cannot be changed'; end if;
 return new;
end;
$$;
drop trigger if exists guard_job_workspace on public.jobs;
create trigger guard_job_workspace before update on public.jobs for each row execute function public.guard_job_workspace();

drop policy if exists workspace_applications_read_guard on public.applications;
create policy workspace_applications_read_guard on public.applications as restrictive for select to anon, authenticated using (public.can_read_job(job_id));
drop policy if exists workspace_applications_read on public.applications;
create policy workspace_applications_read on public.applications for select to authenticated using (public.can_read_job(job_id));
drop policy if exists workspace_applications_update_guard on public.applications;
create policy workspace_applications_update_guard on public.applications as restrictive for update to anon, authenticated using (public.can_manage_job(job_id)) with check (public.can_manage_job(job_id));
drop policy if exists workspace_applications_update on public.applications;
create policy workspace_applications_update on public.applications for update to authenticated using (public.can_manage_job(job_id)) with check (public.can_manage_job(job_id));
-- All candidate inserts must use the existing token-based RPC.
drop policy if exists workspace_applications_insert_guard on public.applications;
create policy workspace_applications_insert_guard on public.applications as restrictive for insert to anon, authenticated with check (false);
drop policy if exists workspace_applications_delete_guard on public.applications;
create policy workspace_applications_delete_guard on public.applications as restrictive for delete to anon, authenticated using (false);
revoke update on public.applications from public, anon, authenticated;
do $$ declare columns text;
begin
 select string_agg(quote_ident(attname),',') into columns from pg_attribute where attrelid='public.applications'::regclass and attnum>0 and not attisdropped;
 execute format('revoke update (%s) on public.applications from public, anon, authenticated',columns);
end $$;
grant update(status) on public.applications to authenticated;

drop policy if exists workspace_files_read_guard on public.application_files;
create policy workspace_files_read_guard on public.application_files as restrictive for select to anon, authenticated using (exists(select 1 from public.applications a where a.id = application_id and public.can_read_job(a.job_id)));
drop policy if exists workspace_files_read on public.application_files;
create policy workspace_files_read on public.application_files for select to authenticated using (exists(select 1 from public.applications a where a.id = application_id and public.can_read_job(a.job_id)));
drop policy if exists workspace_files_insert_guard on public.application_files;
create policy workspace_files_insert_guard on public.application_files as restrictive for insert to anon, authenticated with check (false);
drop policy if exists workspace_files_update_guard on public.application_files;
create policy workspace_files_update_guard on public.application_files as restrictive for update to anon, authenticated using (false) with check (false);
drop policy if exists workspace_files_delete_guard on public.application_files;
create policy workspace_files_delete_guard on public.application_files as restrictive for delete to anon, authenticated using (false);

drop policy if exists workspace_companies_read_guard on public.companies;
create policy workspace_companies_read_guard on public.companies as restrictive for select to anon, authenticated using (status = 'active');
drop policy if exists workspace_companies_read on public.companies;
create policy workspace_companies_read on public.companies for select to anon, authenticated using (status = 'active');
-- Do not expose registration contact fields via the public companies endpoint.
revoke select on public.companies from public, anon, authenticated;
-- Table-level revocation does not remove legacy column grants.
do $$ declare columns text;
begin
 select string_agg(quote_ident(attname),',') into columns from pg_attribute where attrelid='public.companies'::regclass and attnum>0 and not attisdropped;
 execute format('revoke select (%s) on public.companies from public, anon, authenticated',columns);
end $$;
grant select(id,name,slug,status) on public.companies to anon, authenticated;
drop policy if exists workspace_companies_insert_guard on public.companies;
create policy workspace_companies_insert_guard on public.companies as restrictive for insert to anon, authenticated with check (false);
drop policy if exists workspace_companies_update_guard on public.companies;
create policy workspace_companies_update_guard on public.companies as restrictive for update to anon, authenticated using (false) with check (false);
drop policy if exists workspace_companies_delete_guard on public.companies;
create policy workspace_companies_delete_guard on public.companies as restrictive for delete to anon, authenticated using (false);
drop policy if exists workspace_memberships_read_guard on public.company_memberships;
create policy workspace_memberships_read_guard on public.company_memberships as restrictive for select to anon, authenticated using (user_id = auth.uid());
drop policy if exists workspace_memberships_read on public.company_memberships;
create policy workspace_memberships_read on public.company_memberships for select to authenticated using (user_id = auth.uid());
drop policy if exists workspace_memberships_insert_guard on public.company_memberships;
create policy workspace_memberships_insert_guard on public.company_memberships as restrictive for insert to anon, authenticated with check (false);
drop policy if exists workspace_memberships_update_guard on public.company_memberships;
create policy workspace_memberships_update_guard on public.company_memberships as restrictive for update to anon, authenticated using (false) with check (false);
drop policy if exists workspace_memberships_delete_guard on public.company_memberships;
create policy workspace_memberships_delete_guard on public.company_memberships as restrictive for delete to anon, authenticated using (false);
drop policy if exists workspace_profiles_read_guard on public.profiles;
create policy workspace_profiles_read_guard on public.profiles as restrictive for select to anon, authenticated using (id = auth.uid());
drop policy if exists workspace_profiles_delete_guard on public.profiles;
create policy workspace_profiles_delete_guard on public.profiles as restrictive for delete to anon, authenticated using (false);
drop policy if exists workspace_profiles_insert_guard on public.profiles;
create policy workspace_profiles_insert_guard on public.profiles as restrictive for insert to anon, authenticated with check (false);
drop policy if exists workspace_profiles_update_guard on public.profiles;
create policy workspace_profiles_update_guard on public.profiles as restrictive for update to anon, authenticated using (false) with check (false);

-- Public RPC already validates active jobs and deadlines. This trigger additionally
-- rejects submissions to suspended or unapproved companies, including RPC calls.
create or replace function public.guard_application_public_job() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_public_job(new.job_id) then raise exception 'JOB_NOT_ACTIVE'; end if;
 if (new.linkedin_url is not null and new.linkedin_url !~* '^https?://')
 or (new.portfolio_url is not null and new.portfolio_url !~* '^https?://') then
  raise exception 'INVALID_APPLICATION_URL';
 end if;
 return new;
end;
$$;
drop trigger if exists guard_application_public_job on public.applications;
create trigger guard_application_public_job before insert on public.applications for each row execute function public.guard_application_public_job();

-- Replace the confirmed broad legacy read policy explicitly. A QSTP recruiter
-- may read only a file whose application belongs to a QSTP job. Approved
-- company administrators use workspace_storage_read below for their own jobs.
drop policy if exists "recruiters read application files" on storage.objects;
create policy "recruiters read application files" on storage.objects for select to authenticated
 using (bucket_id = 'application-files' and public.is_active_recruiter()
 and exists(select 1 from public.application_files f
 join public.applications a on a.id=f.application_id
 join public.jobs j on j.id=a.job_id
 where f.storage_path=storage.objects.name and j.company_id is null));

-- Preserve existing token upload policies; restrict reads of this bucket even
-- if a legacy recruiter SELECT policy still exists. Other buckets are unaffected.
drop policy if exists workspace_storage_read_guard on storage.objects;
create policy workspace_storage_read_guard on storage.objects as restrictive for select to anon, authenticated
 using (bucket_id <> 'application-files' or exists(select 1 from public.application_files f join public.applications a on a.id = f.application_id where f.storage_path = storage.objects.name and public.can_read_job(a.job_id)));
drop policy if exists workspace_storage_read on storage.objects;
create policy workspace_storage_read on storage.objects for select to authenticated
 using (bucket_id = 'application-files' and exists(select 1 from public.application_files f join public.applications a on a.id = f.application_id where f.storage_path = storage.objects.name and public.can_read_job(a.job_id)));
drop policy if exists workspace_storage_upload on storage.objects;
create policy workspace_storage_upload on storage.objects for insert to authenticated
 with check (bucket_id = 'application-files' and (storage.foldername(name))[1] = 'applications'
 and case when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 then public.validate_application_upload(((storage.foldername(name))[2])::uuid, (storage.foldername(name))[3]) else false end
 and (storage.foldername(name))[4] in ('resume','cover-letter') and lower(storage.extension(name)) in ('pdf','docx'));
drop policy if exists workspace_storage_update_guard on storage.objects;
create policy workspace_storage_update_guard on storage.objects as restrictive for update to anon, authenticated
 using (bucket_id <> 'application-files') with check (bucket_id <> 'application-files');
drop policy if exists workspace_storage_delete_guard on storage.objects;
create policy workspace_storage_delete_guard on storage.objects as restrictive for delete to anon, authenticated
 using (bucket_id <> 'application-files');
drop policy if exists workspace_storage_insert_guard on storage.objects;
create policy workspace_storage_insert_guard on storage.objects as restrictive for insert to anon, authenticated
 with check (bucket_id <> 'application-files' or ((storage.foldername(name))[1] = 'applications'
 and case when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 then public.validate_application_upload(((storage.foldername(name))[2])::uuid, (storage.foldername(name))[3]) else false end
 and (storage.foldername(name))[4] in ('resume','cover-letter') and lower(storage.extension(name)) in ('pdf','docx')));
-- Provision a missing private bucket; keep existing size/MIME limits intact.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('application-files','application-files',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false;
commit;
