alter table public.applications drop constraint if exists applications_status_check;

alter table public.applications add constraint applications_status_check
  check (status in ('new', 'reviewing', 'interview', 'technical_assessment', 'shortlisted', 'offer', 'hired', 'rejected', 'withdrawn'));
