-- =============================================================================
-- Mandatory course feedback (1-5 rating + comment) at course end
-- =============================================================================
--
-- Run this once in the Supabase Dashboard SQL Editor, AFTER
-- 20260808000000_drop_quiz_weight.sql. databaseSetup.sql (the consolidated
-- from-scratch script) has already been updated with the equivalent objects
-- for future fresh setups -- this script applies the same change
-- incrementally.
--
-- Scope: when a learner finishes a course, the completion screen
-- (CourseFinishedPane in components/learn/LessonPane.tsx) withholds the
-- certificate until they leave a 1-5 star rating and a written comment.
-- checkAndIssueCertificate() (lib/certificates.ts) is untouched -- the
-- certificate row and PDF are still generated the moment the grade gates
-- pass, only the learner-facing presentation is gated on this table having a
-- row. Course-owner admins see the feedback on a new tab in the course
-- editor and get notified when it arrives.

create table if not exists public.course_feedback (
  id uuid primary key default gen_random_uuid(),
  -- One feedback per enrollment. Unique here (not on (learner_id, course_id))
  -- so re-enrollment after a delete could legitimately collect fresh feedback.
  enrollment_id uuid not null unique references public.enrollments (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null check (length(btrim(comment)) >= 10),
  created_at timestamptz not null default now()
);

create index if not exists course_feedback_course_created_idx
  on public.course_feedback (course_id, created_at desc);

alter table public.course_feedback enable row level security;

-- Own-row read. There is deliberately NO update and NO delete policy --
-- feedback is immutable once submitted.
drop policy if exists "own feedback readable" on public.course_feedback;
create policy "own feedback readable" on public.course_feedback
  for select
  to authenticated
  using ((select auth.uid()) = learner_id);

-- Insert is gated on actually having completed the course through this
-- enrollment, not just being logged in as its learner -- this is the DB-level
-- backstop for "you can only rate a course you finished", enforced
-- independently of the server action.
drop policy if exists "own feedback insertable" on public.course_feedback;
create policy "own feedback insertable" on public.course_feedback
  for insert
  to authenticated
  with check (
    learner_id = (select auth.uid())
    and exists (
      select 1 from public.enrollments e
      where e.id = course_feedback.enrollment_id
        and e.learner_id = (select auth.uid())
        and e.course_id = course_feedback.course_id
        and e.status = 'completed'
    )
  );

drop policy if exists "admins can select course_feedback" on public.course_feedback;
create policy "admins can select course_feedback" on public.course_feedback
  for select
  to authenticated
  using (public.owns_course(course_id));

grant select, insert on public.course_feedback to authenticated;

-- -----------------------------------------------------------------------------
-- Notify on certificate issued
-- -----------------------------------------------------------------------------
--
-- AFTER INSERT only, so the later `update ... set pdf_url` that
-- checkAndIssueCertificate() runs against the same row never produces a
-- second notification.
create or replace function public.notify_on_certificate_issued()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select
    e.learner_id,
    'certificate',
    'Your certificate is ready',
    c.title,
    '/learner/profile?tab=certificates'
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where e.id = new.enrollment_id;

  return new;
end;
$$;

drop trigger if exists on_certificate_issued on public.certificates;
create trigger on_certificate_issued
  after insert on public.certificates
  for each row
  execute function public.notify_on_certificate_issued();

-- -----------------------------------------------------------------------------
-- Notify course owner on new feedback
-- -----------------------------------------------------------------------------
--
-- Owner only (not every superadmin too) to avoid notification noise --
-- superadmins can still see all feedback via owns_course()'s
-- is_superadmin() branch, they just aren't paged for each submission.
create or replace function public.notify_on_course_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select
    c.created_by,
    'course_feedback',
    'New course feedback received',
    coalesce(nullif(p.full_name, ''), p.email, 'A learner') || ' rated ' || c.title || ' ' || new.rating || '/5',
    '/admin/courses/preview/' || c.id
  from public.courses c
  join public.profiles p on p.id = new.learner_id
  where c.id = new.course_id;

  return new;
end;
$$;

drop trigger if exists on_course_feedback_created on public.course_feedback;
create trigger on_course_feedback_created
  after insert on public.course_feedback
  for each row
  execute function public.notify_on_course_feedback();
