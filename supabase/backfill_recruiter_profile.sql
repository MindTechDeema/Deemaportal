-- Optional helper for an auth user created before the profile trigger existed.
-- Replace the placeholder UUID with the user's ID from Authentication > Users.
-- Do not create users or store passwords in SQL.
insert into public.profiles (id, full_name, role, organization, is_active)
values ('00000000-0000-0000-0000-000000000000', 'Recruiter Name', 'recruiter', 'QSTP Hiring Team', true)
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, organization = excluded.organization, is_active = excluded.is_active;
