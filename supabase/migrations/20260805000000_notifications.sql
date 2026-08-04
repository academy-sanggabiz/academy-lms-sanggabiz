-- =============================================================================
-- In-app notifications
-- =============================================================================
--
-- Run this once in the Supabase Dashboard SQL Editor, AFTER
-- 20260804000000_private_courses.sql. databaseSetup.sql (the consolidated
-- from-scratch script) has already been updated with the equivalent objects
-- for future fresh setups -- this script applies the same change
-- incrementally.
--
-- Scope: the learner needs to find out when an admin enrolls them in a course
-- (particularly a private one, which they can't discover by browsing). This is
-- in-app only -- a bell in the learner header. Email is deliberately NOT wired
-- up: there is no email provider in this project yet, and
-- profiles.notification_email_enabled stays decorative until there is one.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 'enrollment' is the only kind today; kept as text rather than an enum so
  -- adding a kind later doesn't need a migration.
  type text not null,
  title text not null,
  body text,
  -- In-app destination, e.g. /learner/courses/<uuid>. Nullable: not every
  -- future notification kind needs somewhere to go.
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- The bell always reads one user's most recent rows.
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Own-row read, and own-row update so the bell can mark rows read. There is
-- deliberately NO insert policy and no delete policy: rows are created only by
-- the trigger below, never directly by a client -- the same arrangement as
-- public.profiles, whose rows only ever come from handle_new_user().
drop policy if exists "own notifications readable" on public.notifications;
create policy "own notifications readable" on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own notifications updatable" on public.notifications;
create policy "own notifications updatable" on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, update on public.notifications to authenticated;

-- -----------------------------------------------------------------------------
-- Notify on enrollment
-- -----------------------------------------------------------------------------
--
-- A trigger rather than app code, because there are already three ways an
-- enrollment row appears -- toggleLearnerEnrollmentAction (the learner-centric
-- EnrollModal), enrollLearnerAction (the course-centric Learners tab), and the
-- learner's own `enroll` action -- and a trigger covers all of them at once
-- with no way to add a fourth path and forget the notification.
--
-- security definer: it writes a row belonging to a DIFFERENT user than the
-- caller (the admin is acting on the learner's behalf), which no RLS policy
-- on notifications permits.
--
-- AFTER INSERT only. enrollLearnerInCourse upserts with
-- onConflict: "learner_id,course_id", so re-enrolling an existing learner is
-- an UPDATE and correctly produces no second notification.
create or replace function public.notify_on_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only when SOMEONE ELSE enrolled you. A learner who just clicked "Enroll"
  -- doesn't need to be told they enrolled.
  if (select auth.uid()) is distinct from new.learner_id then
    insert into public.notifications (user_id, type, title, body, link)
    select
      new.learner_id,
      'enrollment',
      'You have been enrolled in a new course',
      c.title,
      '/learner/courses/' || c.id
    from public.courses c
    where c.id = new.course_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_enrollment_created on public.enrollments;
create trigger on_enrollment_created
  after insert on public.enrollments
  for each row
  execute function public.notify_on_enrollment();
