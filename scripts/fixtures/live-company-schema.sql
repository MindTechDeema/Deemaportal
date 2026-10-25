-- Relevant company objects reconstructed from the supplied live catalog report.
create table public.companies(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique,description text,website_url text,logo_url text,status text not null default 'pending' check(status in ('pending','active','rejected','suspended')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.company_memberships(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,role text not null default 'employee' check(role in ('company_admin','employee')),status text not null default 'active' check(status in ('active','invited','disabled')),created_at timestamptz not null default now(),unique(company_id,user_id));
alter table public.jobs alter column startup_id drop not null;
alter table public.jobs add column company_id uuid references public.companies(id);
alter table public.jobs add constraint jobs_owner_check check((startup_id is not null and company_id is null) or (startup_id is null and company_id is not null));
create index idx_jobs_company_id on public.jobs(company_id);
create table public.company_approval_tokens(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,token_hash text not null unique,expires_at timestamptz not null,used_at timestamptz,decision text check(decision in ('approved','rejected')),created_at timestamptz not null default now(),constraint approval_decision_consistency check((used_at is null and decision is null) or (used_at is not null and decision is not null)));
create unique index company_approval_one_pending_token on public.company_approval_tokens(company_id) where used_at is null;
alter table public.company_approval_tokens enable row level security;
create function public.process_company_approval(p_token_hash text,p_decision text) returns text language plpgsql security definer set search_path='' as $$
declare v_company_id uuid;
begin
 if p_decision not in ('approved','rejected') then return 'invalid_decision'; end if;
 update public.company_approval_tokens set used_at=now(),decision=p_decision where token_hash=p_token_hash and used_at is null and expires_at>now() returning company_id into v_company_id;
 if v_company_id is null then return 'invalid_or_expired_token'; end if;
 update public.companies set status=case when p_decision='approved' then 'active' else 'rejected' end,updated_at=now() where id=v_company_id and status='pending';
 if not found then raise exception 'Company is no longer pending approval'; end if;
 return p_decision;
end;
$$;
revoke all on function public.process_company_approval(text,text) from public,anon,authenticated;
grant execute on function public.process_company_approval(text,text) to service_role;
