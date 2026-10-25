-- Enable as the Supabase Custom Access Token Hook after applying
-- workspace isolation. This blocks token issuance, not only the React workspace.
create or replace function public.workspace_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
 target_user uuid := (event->>'user_id')::uuid;
 memberships integer;
 active_memberships integer;
begin
 select count(*), count(*) filter (where m.status = 'active' and c.status = 'active' and m.role in ('company_admin','employee'))
 into memberships, active_memberships
 from public.company_memberships m left join public.companies c on c.id = m.company_id
 where m.user_id = target_user;
 if memberships > 0 then
   if memberships <> 1 or active_memberships <> 1 then
     return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Company approval is required before signing in.'));
   end if;
 elsif exists(select 1 from auth.users u where u.id=target_user and
 (u.raw_app_meta_data->>'account_type'='company' or u.raw_app_meta_data->>'company_id' is not null or u.raw_user_meta_data->>'account_type'='company')) then
   return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'No approved company membership is associated with this account.'));
 elsif not exists(select 1 from public.profiles p where p.id = target_user and p.is_active and p.role in ('recruiter','admin')) then
   return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'No approved workspace is associated with this account.'));
 end if;
 return event;
end;
$$;
revoke all on function public.workspace_access_token_hook(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.workspace_access_token_hook(jsonb) to supabase_auth_admin;
