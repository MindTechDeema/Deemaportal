-- Atomic bulk status changes: validate every ID before updating any row.
begin;
-- The reviewed live constraint predates the technical assessment UI status.
-- Expand its allowed values without changing existing application records.
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check check
 (status in ('new','reviewing','shortlisted','interview','technical_assessment','offer','hired','rejected','withdrawn'));

create or replace function public.update_workspace_application_statuses(application_ids uuid[], new_status text)
returns integer language plpgsql security definer set search_path = '' as $$
declare requested integer; permitted integer;
begin
 if auth.uid() is null then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if new_status not in ('new','reviewing','interview','technical_assessment','shortlisted','offer','hired','rejected','withdrawn') or new_status is null then
 raise exception 'INVALID_APPLICATION_STATUS'; end if;
 select count(distinct id) into requested from unnest(application_ids) as ids(id);
 if requested = 0 then return 0; end if;
 if requested > 500 then raise exception 'TOO_MANY_APPLICATIONS'; end if;
 perform a.id from public.applications a where a.id=any(application_ids) and public.can_manage_job(a.job_id) for update;
 select count(*) into permitted from public.applications a where a.id=any(application_ids) and public.can_manage_job(a.job_id);
 if permitted <> requested then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 update public.applications set status=new_status where id=any(application_ids);
 return requested;
end;
$$;
revoke all on function public.update_workspace_application_statuses(uuid[],text) from public, anon;
grant execute on function public.update_workspace_application_statuses(uuid[],text) to authenticated;

-- A trusted admin can reissue an expired/undelivered approval without changing
-- company state. The raw replacement token is generated outside the database.
create or replace function public.reeno_rotate_company_approval(target_company uuid, replacement_hash text)
returns table(company_name text, admin_email text)
language plpgsql security definer set search_path = '' as $$
begin
 if replacement_hash is null or replacement_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_TOKEN_HASH'; end if;
 perform 1 from public.reeno_company_registrations r join public.companies c on c.id=r.company_id
 where r.company_id=target_company and r.approved_at is null and c.status='pending' for update of r,c;
 if not found then raise exception 'COMPANY_NOT_PENDING'; end if;
 update public.reeno_company_registrations set token_hash=replacement_hash,expires_at=now()+interval '48 hours',approval_email_sent_at=null where company_id=target_company;
 return query select c.name,r.email from public.reeno_company_registrations r join public.companies c on c.id=r.company_id where r.company_id=target_company;
end;
$$;
revoke all on function public.reeno_rotate_company_approval(uuid,text) from public,anon,authenticated;
grant execute on function public.reeno_rotate_company_approval(uuid,text) to service_role;
commit;
