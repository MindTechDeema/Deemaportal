create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'recruiter',
  organization text not null default 'QSTP Hiring Team',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('recruiter', 'admin')),
  constraint profiles_full_name_not_blank check (btrim(full_name) <> '')
);

create index profiles_role_idx on public.profiles(role);
create index profiles_is_active_idx on public.profiles(is_active);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    role
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Recruiter'
    ),
    'recruiter'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();


create or replace function public.is_active_recruiter()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active
      and role in ('recruiter', 'admin')
  );
$$;

revoke all on function public.is_active_recruiter() from public;
grant execute on function public.is_active_recruiter() to authenticated;


alter table public.profiles enable row level security;

alter table public.jobs
add column created_by uuid references auth.users(id) on delete set null;

create index jobs_created_by_idx on public.jobs(created_by);


drop policy if exists "Public can read startups" on public.startups;
drop policy if exists "Public can read active jobs" on public.jobs;
drop policy if exists "Development authenticated recruiters manage jobs" on public.jobs;

drop policy if exists "Anonymous users can read startups" on public.startups;
drop policy if exists "Active recruiters can read startups" on public.startups;
drop policy if exists "Users can read their own active recruiter profile" on public.profiles;
drop policy if exists "Anonymous users can read active jobs" on public.jobs;
drop policy if exists "Active recruiters can read all jobs" on public.jobs;
drop policy if exists "Active recruiters can create jobs" on public.jobs;
drop policy if exists "Active recruiters can update jobs" on public.jobs;


create policy "Anonymous users can read startups"
on public.startups
for select
to anon
using (true);


create policy "Active recruiters can read startups"
on public.startups
for select
to authenticated
using (public.is_active_recruiter());


create policy "Users can read their own active recruiter profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  and is_active
  and role in ('recruiter', 'admin')
);


create policy "Anonymous users can read active jobs"
on public.jobs
for select
to anon
using (status = 'active');


create policy "Active recruiters can read all jobs"
on public.jobs
for select
to authenticated
using (public.is_active_recruiter());


create policy "Active recruiters can create jobs"
on public.jobs
for insert
to authenticated
with check (
  public.is_active_recruiter()
  and created_by = auth.uid()
);


create policy "Active recruiters can update jobs"
on public.jobs
for update
to authenticated
using (public.is_active_recruiter())
with check (
  public.is_active_recruiter()
  and created_by is not null
);