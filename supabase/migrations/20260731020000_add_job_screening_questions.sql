alter table public.jobs
add column screening_questions jsonb not null default '[]'::jsonb;

alter table public.jobs
add constraint jobs_screening_questions_array_check
check (jsonb_typeof(screening_questions) = 'array');
