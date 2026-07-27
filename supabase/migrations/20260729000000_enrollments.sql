-- Learner enrollment. See erd.md step 2 of the build order. Completion
-- tracking (lesson_progress) is not built yet, so enrollments are always
-- created as 'active' — no update/delete policy exists yet either
-- (completion + unenroll are deferred to when lesson_progress exists).

create type public.enrollment_status as enum ('active', 'completed');

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (learner_id, course_id)
);

alter table public.enrollments enable row level security;

-- A learner may only see and create their OWN enrollments. Unlike courses,
-- this is authenticated-only (not anon-readable) — enrollment data is
-- private to the learner.
create policy "own enrollments readable" on public.enrollments
  for select
  to authenticated
  using ((select auth.uid()) = learner_id);

create policy "own enrollments insertable" on public.enrollments
  for insert
  to authenticated
  with check ((select auth.uid()) = learner_id);

grant select, insert on public.enrollments to authenticated;
