-- =============================================================================
-- Private (invite-only) courses
-- =============================================================================
--
-- Run this once in the Supabase Dashboard SQL Editor against the live
-- database. databaseSetup.sql (the consolidated from-scratch script) has
-- already been updated with the equivalent schema/policies for future fresh
-- setups -- this script applies the same change incrementally, since the live
-- DB already has data and policies that must be replaced in place.
--
-- Effect: courses.is_private marks a course as invite-only. A private course
-- is readable only by its owning admin (superadmin included, via the existing
-- owns_course() policies) and by learners an admin has explicitly enrolled.
-- It never appears in the public catalog or to anon visitors, and a learner
-- cannot self-enroll into one.
--
--   status    | is_private | who can read it
--   ----------+------------+-------------------------------------------------
--   draft     | false      | owning admin only          (unchanged)
--   draft     | true       | owning admin only
--   published | false      | everyone incl. anon        (unchanged)
--   published | true       | owning admin + enrolled learners only
--
-- Enforcement lives in RLS, not app code: the learner self-enroll path
-- (app/learner/courses/actions.ts) is a bare upsert, so hiding a course in
-- the UI alone would not stop a learner from POSTing an enrollment row for a
-- course id and thereby granting themselves read access. Step 4 below is the
-- load-bearing change.

-- -----------------------------------------------------------------------------
-- 1. Column
-- -----------------------------------------------------------------------------
--
-- Orthogonal to courses.status, mirroring the require_prerequisites boolean
-- already on this table -- a private course can still be draft or published.

alter table public.courses
  add column if not exists is_private boolean not null default false;

-- -----------------------------------------------------------------------------
-- 2. Helper functions
-- -----------------------------------------------------------------------------
--
-- Eight learner/anon read policies (plus the question_options_public view)
-- each inlined `courses.status = 'published'` as their visibility test. Rather
-- than hand-editing that condition in nine places every time visibility rules
-- change, they all now call can_read_course() -- one definition, one place to
-- edit next time. security definer for the same recursion-avoidance reason as
-- is_admin()/owns_course(): it reads courses and enrollments with the owner's
-- privileges, so the policies that call it don't re-enter RLS.
--
-- For anon, auth.uid() is null, so the enrollment EXISTS is always false and
-- private courses are invisible on the public landing page for free.

create or replace function public.can_read_course(cid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.courses c
    where c.id = cid
      and c.status = 'published'
      and (
        not c.is_private
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.learner_id = (select auth.uid())
        )
      )
  );
$$;

grant execute on function public.can_read_course(uuid) to anon, authenticated;

-- Whether a learner may enroll themselves. Deliberately NOT the same as
-- can_read_course(): an already-enrolled learner can read a private course,
-- but that must not make it self-enrollable. Used only by the enrollments
-- insert policy in step 4.
create or replace function public.is_open_enrollment_course(cid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.courses c
    where c.id = cid
      and c.status = 'published'
      and not c.is_private
  );
$$;

grant execute on function public.is_open_enrollment_course(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Learner/anon read policies
-- -----------------------------------------------------------------------------
--
-- `courses` calls can_read_course() like everything else rather than inlining
-- the enrollment EXISTS. Two reasons, both load-bearing:
--   1. Privileges. A policy's subquery runs with the *caller's* table
--      privileges, and `enrollments` is granted to authenticated only -- an
--      inlined `select ... from enrollments` therefore fails outright with
--      "permission denied for table enrollments" for anon, breaking the whole
--      public landing page. can_read_course() is security definer, so it
--      reads enrollments with the owner's privileges instead.
--   2. No recursion. Being security definer, it also reads `courses` as the
--      owner, which bypasses this very policy -- the same mechanism that lets
--      is_admin() read `profiles` from inside a `profiles` policy.

drop policy if exists "published courses are readable" on public.courses;
drop policy if exists "readable courses" on public.courses;
create policy "readable courses" on public.courses
  for select
  to anon, authenticated
  using (public.can_read_course(courses.id));

-- Everything derived from a course swaps its `c.status = 'published'` join
-- for can_read_course(). The joins that remain exist only to resolve the
-- course id from the row being policied, not to test visibility.

drop policy if exists "course_instructors readable for published courses" on public.course_instructors;
drop policy if exists "course_instructors readable for readable courses" on public.course_instructors;
create policy "course_instructors readable for readable courses" on public.course_instructors
  for select
  to anon, authenticated
  using (public.can_read_course(course_instructors.course_id));

drop policy if exists "sections readable for published courses" on public.course_sections;
drop policy if exists "sections readable for readable courses" on public.course_sections;
create policy "sections readable for readable courses" on public.course_sections
  for select
  to anon, authenticated
  using (public.can_read_course(course_sections.course_id));

drop policy if exists "lessons readable for published courses" on public.lessons;
drop policy if exists "lessons readable for readable courses" on public.lessons;
create policy "lessons readable for readable courses" on public.lessons
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.course_sections s
    where s.id = lessons.section_id and public.can_read_course(s.course_id)
  ));

drop policy if exists "resources readable for published courses" on public.resources;
drop policy if exists "resources readable for readable courses" on public.resources;
create policy "resources readable for readable courses" on public.resources
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = resources.lesson_id and public.can_read_course(s.course_id)
  ));

drop policy if exists "quizzes readable for published courses" on public.quizzes;
drop policy if exists "quizzes readable for readable courses" on public.quizzes;
create policy "quizzes readable for readable courses" on public.quizzes
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
    where l.id = quizzes.lesson_id and public.can_read_course(cs.course_id)
  ));

drop policy if exists "questions readable for published courses" on public.questions;
drop policy if exists "questions readable for readable courses" on public.questions;
create policy "questions readable for readable courses" on public.questions
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections cs on cs.id = l.section_id
    where q.id = questions.quiz_id and public.can_read_course(cs.course_id)
  ));

-- Not optional: an enrolled learner who finishes a private course still needs
-- to read its certificate settings for checkAndIssueCertificate()
-- (lib/certificates.ts), or completion silently fails to issue a certificate.
drop policy if exists "certificate settings readable for published courses" on public.course_certificate_settings;
drop policy if exists "certificate settings readable for readable courses" on public.course_certificate_settings;
create policy "certificate settings readable for readable courses" on public.course_certificate_settings
  for select
  to authenticated
  using (public.can_read_course(course_certificate_settings.course_id));

-- The answer-key-free option view carries its own copy of the published-course
-- test in its WHERE clause (it is security_invoker = false, so it does not
-- inherit the base tables' policies) -- same swap.
create or replace view public.question_options_public
  with (security_invoker = false) as
  select qo.id, qo.question_id, qo.text, qo.position
  from public.question_options qo
  join public.questions qu on qu.id = qo.question_id
  where qu.type <> 'short_answer'
    and exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.course_sections cs on cs.id = l.section_id
      where q.id = qu.quiz_id and public.can_read_course(cs.course_id)
    );

grant select on public.question_options_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Close the self-enroll hole
-- -----------------------------------------------------------------------------
--
-- Previously the only check was `auth.uid() = learner_id`, so any
-- authenticated learner could insert an enrollment row for ANY course id they
-- could guess -- which, with the policies above, would also grant them read
-- access to a private course. Now the course must be open for enrollment.
--
-- Admin enrollment is unaffected: "admins insert enrollments" gates on
-- owns_course(course_id), which is ownership-based and ignores is_private --
-- that is exactly how an admin invites a learner into a private course.
--
-- Side effect worth noting: this also closes the pre-existing gap where a
-- learner could self-enroll into a *draft* course.

drop policy if exists "own enrollments insertable" on public.enrollments;
create policy "own enrollments insertable" on public.enrollments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = learner_id
    and public.is_open_enrollment_course(course_id)
  );
