
-- REENO: Company registration decisions and notification tracking
-- This migration does not change existing QSTP accounts or jobs.

begin;

-- Record rejected registrations.
alter table public.reeno_company_registrations
  add column if not exists denied_at timestamptz;

-- Track successful client notification delivery.
alter table public.reeno_company_registrations
  add column if not exists decision_email_sent_at timestamptz;
-- Track decision notification attempts and errors.
alter table public.reeno_company_registrations
  add column if not exists decision_email_attempted_at timestamptz;

alter table public.reeno_company_registrations
  add column if not exists decision_email_error text;
  -- Track when a notification is reserved for processing.
alter table public.reeno_company_registrations
  add column if not exists decision_email_claimed_at timestamptz;
-- Ensure a registration cannot be both approved and denied.
alter table public.reeno_company_registrations
  add constraint reeno_registration_one_decision
  check (approved_at is null or denied_at is null);
-- Only pending, undecided registrations can be reviewed.
create or replace function public.reeno_inspect_company_approval(
  approval_hash text
)
returns table (
  company_name text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, r.expires_at
  from public.reeno_company_registrations r
  join public.companies c
    on c.id = r.company_id
  where r.token_hash = approval_hash
    and r.approved_at is null
    and r.denied_at is null
    and r.expires_at > now()
    and c.status = 'pending';
$$;
-- Prevent approval after denial, including for existing approval links.
create or replace function public.reeno_approve_company(approval_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  registration public.reeno_company_registrations%rowtype;
begin
  select *
  into registration
  from public.reeno_company_registrations r
  where r.token_hash = approval_hash
  for update;

  if not found
     or registration.approved_at is not null
     or registration.denied_at is not null
     or registration.expires_at <= now() then
    raise exception 'INVALID_OR_EXPIRED_APPROVAL';
  end if;

  perform 1
  from public.companies c
  where c.id = registration.company_id
    and c.status = 'pending'
  for update;

  if not found then
    raise exception 'COMPANY_NOT_PENDING';
  end if;

  perform 1
  from public.company_memberships m
  where m.company_id = registration.company_id
    and m.user_id = registration.admin_user_id
    and m.role = 'company_admin'
    and m.status = 'invited'
  for update;

  if not found then
    raise exception 'ADMIN_MEMBERSHIP_NOT_PENDING';
  end if;

  update public.companies
  set status = 'active'
  where id = registration.company_id;

  update public.company_memberships
  set status = 'active'
  where company_id = registration.company_id
    and user_id = registration.admin_user_id;

  update auth.users
  set banned_until = null,
      updated_at = now()
  where id = registration.admin_user_id
    and raw_app_meta_data->>'account_type' = 'company';

  if not found then
    raise exception 'INVALID_COMPANY_IDENTITY';
  end if;

  update public.reeno_company_registrations
  set approved_at = now()
  where company_id = registration.company_id;

  return registration.company_id;
end;
$$;

-- Deny a pending company without enabling its account.
create or replace function public.reeno_deny_company(approval_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  registration public.reeno_company_registrations%rowtype;
begin
  select *
  into registration
  from public.reeno_company_registrations r
  where r.token_hash = approval_hash
  for update;

  if not found
     or registration.approved_at is not null
     or registration.denied_at is not null
     or registration.expires_at <= now() then
    raise exception 'INVALID_OR_EXPIRED_APPROVAL';
  end if;
  -- Only reject registrations with a pending administrator membership.
  perform 1
  from public.company_memberships m
  where m.company_id = registration.company_id
    and m.user_id = registration.admin_user_id
    and m.role = 'company_admin'
    and m.status = 'invited'
  for update;

  if not found then
    raise exception 'ADMIN_MEMBERSHIP_NOT_PENDING';
  end if;
  update public.companies
  set status = 'rejected'
  where id = registration.company_id
    and status = 'pending';

  if not found then
    raise exception 'COMPANY_NOT_PENDING';
  end if;

  update public.reeno_company_registrations
  set denied_at = now()
  where company_id = registration.company_id;

  return registration.company_id;
end;
$$;

-- These functions must only be callable using the service role.
revoke all on function public.reeno_approve_company(text)
  from public, anon, authenticated;

revoke all on function public.reeno_deny_company(text)
  from public, anon, authenticated;

grant execute on function public.reeno_approve_company(text)
  to service_role;

grant execute on function public.reeno_deny_company(text)
  to service_role;
-- Atomically reserve one pending notification for processing.
create or replace function public.reeno_claim_company_notification()
returns table (
  claimed_company_id uuid,
  recipient_email text,
  company_name text,
  decision text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select r.company_id
    from public.reeno_company_registrations r
    where (r.approved_at is not null or r.denied_at is not null)
      and r.decision_email_sent_at is null
      and (
        r.decision_email_claimed_at is null
        or r.decision_email_claimed_at < now() - interval '5 minutes'
      )
    order by r.created_at
    for update skip locked
    limit 1
  ),
  claimed as (
    update public.reeno_company_registrations r
    set decision_email_claimed_at = now()
    from candidate
    where r.company_id = candidate.company_id
    returning r.company_id, r.email, r.approved_at
  )
  select
    c.company_id,
    c.email,
    co.name,
    case when c.approved_at is not null then 'approve' else 'deny' end
  from claimed c
  join public.companies co on co.id = c.company_id;
end;
$$;

revoke all on function public.reeno_claim_company_notification()
  from public, anon, authenticated;

grant execute on function public.reeno_claim_company_notification()
  to service_role;
commit;
