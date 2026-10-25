create extension if not exists pgcrypto;

create table public.startups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  website_url text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startups_name_not_blank check (btrim(name) <> ''),
  constraint startups_slug_not_blank check (btrim(slug) <> '')
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id),
  title text not null,
  slug text not null unique,
  department text,
  location text not null,
  employment_type text not null,
  work_arrangement text,
  deadline date,
  openings integer not null default 1,
  description text not null,
  qualifications text,
  requirements text,
  status text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_status_check check (status in ('active', 'draft', 'closed')),
  constraint jobs_openings_positive check (openings > 0),
  constraint jobs_title_not_blank check (btrim(title) <> ''),
  constraint jobs_location_not_blank check (btrim(location) <> ''),
  constraint jobs_slug_not_blank check (btrim(slug) <> '')
);

create index jobs_startup_id_idx on public.jobs(startup_id);
create index jobs_status_idx on public.jobs(status);
create index jobs_deadline_idx on public.jobs(deadline);
create index jobs_created_at_idx on public.jobs(created_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger startups_set_updated_at before update on public.startups
for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs
for each row execute function public.set_updated_at();

alter table public.startups enable row level security;
alter table public.jobs enable row level security;

create policy "Public can read startups" on public.startups for select to anon, authenticated using (true);
create policy "Public can read active jobs" on public.jobs for select to anon using (status = 'active');

-- DEVELOPMENT ONLY: authenticated recruiter access. Remove or replace this policy
-- with role-scoped authorization before production. Anonymous users receive no writes.
create policy "Development authenticated recruiters manage jobs" on public.jobs
for all to authenticated using (true) with check (true);
