create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  full_name text not null check (btrim(full_name) <> ''),
  email text not null check (btrim(email) <> ''),
  phone text,
  country_of_residence text,
  university text,
  degree text,
  field_of_study text,
  expected_graduation_date date,
  linkedin_url text,
  portfolio_url text,
  cover_letter text,
  screening_answers jsonb not null default '[]'::jsonb check (jsonb_typeof(screening_answers) = 'array'),
  status text not null default 'new' check (status in ('new','reviewing','shortlisted','interview','offer','hired','rejected','withdrawn')),
  source text not null default 'careers_portal' check (btrim(source) <> ''),
  upload_token_hash text not null,
  upload_token_expires_at timestamptz not null default (now() + interval '30 minutes'),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_job_id_idx on public.applications(job_id);
create index applications_email_idx on public.applications(email);
create index applications_status_idx on public.applications(status);
create index applications_submitted_at_idx on public.applications(submitted_at desc);
create index applications_job_submitted_idx on public.applications(job_id, submitted_at desc);
create unique index applications_job_email_unique_idx on public.applications(job_id, lower(btrim(email)));

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create table public.application_files (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  file_type text not null check (file_type in ('resume','cover_letter','other')),
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  created_at timestamptz not null default now()
);

create index application_files_application_id_idx on public.application_files(application_id);
create index application_files_file_type_idx on public.application_files(file_type);
create unique index application_files_single_primary_type_idx
on public.application_files(application_id, file_type)
where file_type in ('resume', 'cover_letter');

alter table public.applications enable row level security;
alter table public.application_files enable row level security;

create policy "active recruiters read applications"
on public.applications for select to authenticated
using (public.is_active_recruiter());

create policy "active recruiters update applications"
on public.applications for update to authenticated
using (public.is_active_recruiter())
with check (public.is_active_recruiter());

create policy "active recruiters read application files"
on public.application_files for select to authenticated
using (public.is_active_recruiter());

create or replace function public.submit_application(application_payload jsonb)
returns table(application_id uuid, upload_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job public.jobs%rowtype;
begin
  upload_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  select *
  into target_job
  from public.jobs
  where id = (application_payload->>'job_id')::uuid;

  if not found or target_job.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'JOB_NOT_ACTIVE';
  end if;

  if target_job.deadline is not null and target_job.deadline < current_date then
    raise exception using errcode = 'P0001', message = 'JOB_DEADLINE_PASSED';
  end if;

  insert into public.applications (
    job_id, full_name, email, phone, country_of_residence, university,
    degree, field_of_study, expected_graduation_date, linkedin_url,
    portfolio_url, cover_letter, screening_answers, upload_token_hash
  ) values (
    target_job.id,
    pg_catalog.btrim(application_payload->>'full_name'),
    pg_catalog.lower(pg_catalog.btrim(application_payload->>'email')),
    nullif(pg_catalog.btrim(application_payload->>'phone'), ''),
    nullif(pg_catalog.btrim(application_payload->>'country_of_residence'), ''),
    nullif(pg_catalog.btrim(application_payload->>'university'), ''),
    nullif(pg_catalog.btrim(application_payload->>'degree'), ''),
    nullif(pg_catalog.btrim(application_payload->>'field_of_study'), ''),
    nullif(application_payload->>'expected_graduation_date', '')::date,
    nullif(pg_catalog.btrim(application_payload->>'linkedin_url'), ''),
    nullif(pg_catalog.btrim(application_payload->>'portfolio_url'), ''),
    nullif(pg_catalog.btrim(application_payload->>'cover_letter'), ''),
    coalesce(application_payload->'screening_answers', '[]'::jsonb),
    pg_catalog.encode(extensions.digest(upload_token, 'sha256'), 'hex')
  )
  returning public.applications.id into application_id;

  return next;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'DUPLICATE_APPLICATION';
end;
$$;

revoke all on function public.submit_application(jsonb) from public;
grant execute on function public.submit_application(jsonb) to anon, authenticated;

create or replace function public.validate_application_upload(application_id uuid, upload_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applications
    where public.applications.id = application_id
      and public.applications.upload_token_hash =
        pg_catalog.encode(extensions.digest(upload_token, 'sha256'), 'hex')
      and public.applications.upload_token_expires_at > pg_catalog.now()
  );
$$;

revoke all on function public.validate_application_upload(uuid, text) from public;
grant execute on function public.validate_application_upload(uuid, text) to anon, authenticated;

create or replace function public.create_application_file(file_payload jsonb)
returns public.application_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.application_files;
  app_id uuid := (file_payload->>'application_id')::uuid;
  provided_token text := file_payload->>'upload_token';
  provided_type text := file_payload->>'file_type';
  provided_path text := file_payload->>'storage_path';
  provided_mime text := file_payload->>'mime_type';
  provided_size bigint := (file_payload->>'file_size')::bigint;
  expected_folder text;
begin
  if provided_token is null
    or not public.validate_application_upload(app_id, provided_token) then
    raise exception using errcode = 'P0001', message = 'INVALID_UPLOAD_TOKEN';
  end if;

  if provided_type not in ('resume', 'cover_letter') then
    raise exception using errcode = 'P0001', message = 'INVALID_FILE_TYPE';
  end if;

  expected_folder := case when provided_type = 'cover_letter' then 'cover-letter' else 'resume' end;
  if provided_path not like
    'applications/' || app_id::text || '/' || provided_token || '/' || expected_folder || '/%' then
    raise exception using errcode = 'P0001', message = 'INVALID_STORAGE_PATH';
  end if;

  if provided_mime not in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_MIME_TYPE';
  end if;

  if provided_size <= 0 or provided_size > 10485760 then
    raise exception using errcode = 'P0001', message = 'INVALID_FILE_SIZE';
  end if;

  insert into public.application_files (
    application_id, file_type, storage_path, original_filename, mime_type, file_size
  ) values (
    app_id,
    provided_type,
    provided_path,
    file_payload->>'original_filename',
    provided_mime,
    provided_size
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function public.create_application_file(jsonb) from public;
grant execute on function public.create_application_file(jsonb) to anon, authenticated;

-- Create the private bucket in the Dashboard, then apply these object policies.
-- No anonymous SELECT, UPDATE, or DELETE policy is intentionally created.
create policy "anonymous application file upload"
on storage.objects for insert to anon
with check (
  bucket_id = 'application-files'
  and (storage.foldername(name))[1] = 'applications'
  and case
    when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.validate_application_upload(
      ((storage.foldername(name))[2])::uuid,
      (storage.foldername(name))[3]
    )
    else false
  end
  and (storage.foldername(name))[4] in ('resume', 'cover-letter')
  and pg_catalog.lower(storage.extension(name)) in ('pdf', 'docx')
);

create policy "recruiters read application files"
on storage.objects for select to authenticated
using (
  bucket_id = 'application-files'
  and public.is_active_recruiter()
);
