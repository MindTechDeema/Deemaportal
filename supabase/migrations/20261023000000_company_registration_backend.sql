-- Additive backend contract. Review existing company constraints before applying.
-- This migration does not modify or delete existing QSTP records.
begin;
-- Fail before changing any existing object if the registration contract differs.
-- IF NOT EXISTS only avoids duplicate names; it does not validate a live schema.
do $$
declare expected record; actual record; missing_labels text[]; extra_columns text;
begin
 for expected in select * from (values
  ('companies','id','uuid',null::text[]),
  ('companies','name','string',null::text[]),
  ('companies','slug','string',null::text[]),
  ('companies','status','string_or_enum',array['pending','active']),
  ('company_memberships','company_id','uuid',null::text[]),
  ('company_memberships','user_id','uuid',null::text[]),
  ('company_memberships','role','string_or_enum',array['company_admin','employee']),
  ('company_memberships','status','string_or_enum',array['invited','active'])
 ) as contract(table_name,column_name,kind,labels) loop
  if to_regclass('public.'||expected.table_name) is null then continue; end if;
  select a.atttypid,t.typcategory,t.typtype into actual from pg_attribute a
   join pg_type t on t.oid=a.atttypid
   where a.attrelid=to_regclass('public.'||expected.table_name)
    and a.attname=expected.column_name and a.attnum>0 and not a.attisdropped;
  if not found then raise exception 'REENO_SCHEMA_MISMATCH: %.% is missing',expected.table_name,expected.column_name; end if;
  if (expected.kind='uuid' and actual.atttypid<>'uuid'::regtype)
   or (expected.kind='string' and actual.typcategory<>'S')
   or (expected.kind='string_or_enum' and actual.typcategory<>'S' and actual.typtype<>'e') then
   raise exception 'REENO_SCHEMA_MISMATCH: incompatible type for %.%',expected.table_name,expected.column_name;
  end if;
  if actual.typtype='e' then
   select array_agg(label) into missing_labels from unnest(expected.labels) as required(label)
    where not exists(select 1 from pg_enum e where e.enumtypid=actual.atttypid and e.enumlabel=label);
   if missing_labels is not null then raise exception 'REENO_SCHEMA_MISMATCH: %.% enum lacks %',expected.table_name,expected.column_name,missing_labels; end if;
  end if;
 end loop;
 -- Registration supplies only these columns. Unknown mandatory columns must
 -- be reconciled from their real definitions, never silently filled or dropped.
 select string_agg(c.table_name||'.'||c.column_name,', ') into extra_columns
 from information_schema.columns c
 where c.table_schema='public' and c.table_name in ('companies','company_memberships')
 and c.is_nullable='NO' and c.column_default is null
 and c.is_identity='NO' and c.is_generated='NEVER'
 and not ((c.table_name='companies' and c.column_name in ('name','slug','status'))
 or (c.table_name='company_memberships' and c.column_name in ('company_id','user_id','role','status')));
 if extra_columns is not null then raise exception 'REENO_SCHEMA_MISMATCH: registration requires defaults for %',extra_columns; end if;
 if exists(select 1 from pg_attribute where attrelid=to_regclass('public.jobs')
  and attname='company_id' and not attisdropped and atttypid<>'uuid'::regtype) then
  raise exception 'REENO_SCHEMA_MISMATCH: jobs.company_id must be uuid';
 end if;
end;
$$;

create table if not exists public.companies (
 id uuid primary key default gen_random_uuid(), name text not null,
 slug text not null unique, status text not null default 'pending',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.company_memberships (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 user_id uuid not null references auth.users(id),
 role text not null default 'employee', status text not null default 'active',
 created_at timestamptz not null default now(), unique(company_id,user_id)
);
alter table public.jobs add column if not exists company_id uuid references public.companies(id);
-- Existing schemas may already have the column but lack its relationship.
do $$
begin
 if not exists(select 1 from pg_constraint c where c.conrelid='public.jobs'::regclass and c.confrelid='public.companies'::regclass and c.contype='f'
 and c.conkey=array[(select attnum from pg_attribute where attrelid='public.jobs'::regclass and attname='company_id')]::smallint[]) then
  alter table public.jobs add constraint reeno_jobs_company_fk foreign key(company_id) references public.companies(id);
 end if;
end;
$$;
-- companies.slug is already unique in the reviewed live schema and fallback table.
create index if not exists idx_jobs_company_id on public.jobs(company_id);
create index if not exists company_memberships_user_idx on public.company_memberships(user_id);
-- Separate, private registration ledger avoids changing a deployed token schema.
create table if not exists public.reeno_company_registrations (
 company_id uuid primary key references public.companies(id),
 admin_user_id uuid not null unique references auth.users(id),
 full_name text not null, email text not null, website text, industry text not null,
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz not null, approved_at timestamptz,
 approval_email_sent_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.reeno_registration_limits (
 key_hash text primary key, window_start timestamptz not null, attempts integer not null
);
alter table public.reeno_company_registrations enable row level security;
alter table public.reeno_registration_limits enable row level security;
revoke all on public.reeno_company_registrations, public.reeno_registration_limits from public, anon, authenticated;
grant all on public.reeno_company_registrations, public.reeno_registration_limits to service_role;

-- Only trusted server metadata can provision a new QSTP recruiter.
-- Company metadata is set before the auth INSERT, not after its profile trigger.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 -- Match the live company opt-out, including legacy user-metadata-only signups.
 -- A company marker denies access; it never grants recruiter authorization.
 if new.raw_user_meta_data->>'account_type' = 'company'
 or new.raw_app_meta_data->>'account_type' = 'company'
 or new.raw_app_meta_data->>'company_id' is not null then
  return new;
 end if;
 -- Only trusted server metadata may positively provision a QSTP recruiter.
 if new.raw_app_meta_data->>'account_type' = 'qstp' then
  insert into public.profiles(id,full_name,role)
  values(new.id, coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),new.email,'Recruiter'),'recruiter')
  on conflict(id) do nothing;
 end if;
 return new;
end;
$$;

create or replace function public.reeno_check_registration_limit(p_key_hash text, max_attempts integer default 5)
returns boolean language plpgsql security definer set search_path = '' as $$
declare hits integer;
begin
 if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' or max_attempts is null or max_attempts < 1 or max_attempts > 500 then raise exception 'INVALID_KEY'; end if;
 insert into public.reeno_registration_limits as l(key_hash,window_start,attempts)
 values(p_key_hash,now(),1)
 on conflict(key_hash) do update set
 attempts = case when l.window_start < now() - interval '1 hour' then 1 else l.attempts+1 end,
 window_start = case when l.window_start < now() - interval '1 hour' then now() else l.window_start end
 returning attempts into hits;
 return hits <= max_attempts;
end;
$$;
create or replace function public.reeno_register_company(admin_id uuid, company_name text, company_slug text,
 admin_name text, admin_email text, company_website text, company_industry text, approval_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare company_uuid uuid;
begin
 if not exists(select 1 from auth.users u where u.id = admin_id
   and u.raw_app_meta_data->>'account_type' = 'company'
   and lower(u.email) = lower(admin_email) and u.banned_until > now())
 then raise exception 'INVALID_PENDING_IDENTITY'; end if;
 if exists(select 1 from public.profiles where id = admin_id)
   or exists(select 1 from public.company_memberships where user_id = admin_id)
 then raise exception 'IDENTITY_ALREADY_PROVISIONED'; end if;
 if nullif(btrim(company_name),'') is null or nullif(btrim(admin_name),'') is null
   or nullif(btrim(company_industry),'') is null or approval_hash !~ '^[0-9a-f]{64}$'
 then raise exception 'INVALID_REGISTRATION'; end if;
 insert into public.companies(name,slug,status) values(btrim(company_name),company_slug,'pending') returning id into company_uuid;
 insert into public.company_memberships(company_id,user_id,role,status) values(company_uuid,admin_id,'company_admin','invited');
 insert into public.reeno_company_registrations(company_id,admin_user_id,full_name,email,website,industry,token_hash,expires_at)
 values(company_uuid,admin_id,btrim(admin_name),lower(btrim(admin_email)),company_website,company_industry,approval_hash,now()+interval '48 hours');
 return company_uuid;
end;
$$;
create or replace function public.reeno_inspect_company_approval(approval_hash text)
returns table(company_name text, expires_at timestamptz) language sql stable security definer set search_path = '' as $$
 select c.name,r.expires_at from public.reeno_company_registrations r
 join public.companies c on c.id=r.company_id
 where r.token_hash=approval_hash and r.approved_at is null and r.expires_at>now() and c.status='pending';
$$;
create or replace function public.reeno_approve_company(approval_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare registration public.reeno_company_registrations%rowtype;
begin
 select * into registration from public.reeno_company_registrations r where r.token_hash=approval_hash for update;
 if not found or registration.approved_at is not null or registration.expires_at <= now() then
 raise exception 'INVALID_OR_EXPIRED_APPROVAL'; end if;
 perform 1 from public.companies c where c.id=registration.company_id and c.status='pending' for update;
 if not found then raise exception 'COMPANY_NOT_PENDING'; end if;
 perform 1 from public.company_memberships m where m.company_id=registration.company_id
 and m.user_id=registration.admin_user_id and m.role='company_admin' and m.status='invited' for update;
 if not found then raise exception 'ADMIN_MEMBERSHIP_NOT_PENDING'; end if;
 -- Activation, ban removal and token consumption are one database transaction.
 update public.companies set status='active' where id=registration.company_id;
 update public.company_memberships set status='active' where company_id=registration.company_id and user_id=registration.admin_user_id;
 update auth.users set banned_until=null, updated_at=now() where id=registration.admin_user_id
 and raw_app_meta_data->>'account_type'='company';
 if not found then raise exception 'INVALID_COMPANY_IDENTITY'; end if;
 update public.reeno_company_registrations set approved_at=now() where company_id=registration.company_id;
 return registration.company_id;
end;
$$;
revoke all on function public.reeno_check_registration_limit(text,integer),
 public.reeno_register_company(uuid,text,text,text,text,text,text,text),
 public.reeno_inspect_company_approval(text), public.reeno_approve_company(text)
 from public,anon,authenticated;
grant execute on function public.reeno_check_registration_limit(text,integer),
 public.reeno_register_company(uuid,text,text,text,text,text,text,text),
 public.reeno_inspect_company_approval(text), public.reeno_approve_company(text) to service_role;

-- Preserve the existing process_company_approval(text,text), its ACL, and
-- company_approval_tokens. The new reeno_* RPCs above are independently service-only.
-- Review legacy definitions before a coordinated Edge Function cutover; do not
-- guess legacy token semantics or alter unrelated approval functions by name.
commit;
