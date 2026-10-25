-- Forward fix for projects that already applied the earlier prepared migrations.
-- Replaces function code only; leaves existing profiles, jobs and applicants intact.
begin;
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
revoke all on function public.handle_new_auth_user() from public,anon,authenticated;
commit;
