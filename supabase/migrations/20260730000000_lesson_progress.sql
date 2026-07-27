-- Per-lesson completion, keyed by enrollment (erd.md: enrollment 1--*
-- lesson_progress). Powers the lesson player's mark-complete + progress bar.
-- Does NOT auto-roll-up into enrollments.status = 'completed' yet — that
-- needs an enrollments UPDATE policy, which doesn't exist (deferred).

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  last_position_seconds int not null default 0,
  unique (enrollment_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

-- Ownership is via the parent enrollment (lesson_progress has no direct
-- learner_id column), so every policy checks through enrollments.
create policy "own progress readable" on public.lesson_progress
  for select
  to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = lesson_progress.enrollment_id and e.learner_id = (select auth.uid())
  ));

create policy "own progress insertable" on public.lesson_progress
  for insert
  to authenticated
  with check (exists (
    select 1 from public.enrollments e
    where e.id = lesson_progress.enrollment_id and e.learner_id = (select auth.uid())
  ));

create policy "own progress updatable" on public.lesson_progress
  for update
  to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = lesson_progress.enrollment_id and e.learner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.enrollments e
    where e.id = lesson_progress.enrollment_id and e.learner_id = (select auth.uid())
  ));

grant select, insert, update on public.lesson_progress to authenticated;
