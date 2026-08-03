-- =============================================================================
-- Per-admin course ownership isolation
-- =============================================================================
--
-- Run this once in the Supabase Dashboard SQL Editor against the live
-- database. databaseSetup.sql (the consolidated from-scratch script) has
-- already been updated with the equivalent policies for future fresh setups
-- -- this script applies the same change incrementally, since the live DB
-- already has data and policies that must be replaced in place.
--
-- Effect: each admin can only create/read/update/delete courses they
-- created (courses.created_by) and everything derived from those courses
-- (sections, lessons, resources, quizzes/questions/options, instructors
-- assignment, prerequisites, certificate settings, enrollments,
-- transactions, lesson_progress, quiz_attempts/responses, certificates).
-- superadmin remains a superset and can see/manage every course. The shared
-- `instructors` bio directory and storage-bucket write policies stay
-- is_admin()-gated (not course-specific / disproportionate to scope here).
--
-- Backfill: existing courses with created_by is null are assigned to
-- harfiibadurahman01@gmail.com at the end of this script.

-- -----------------------------------------------------------------------------
-- 1. Helper functions
-- -----------------------------------------------------------------------------

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'superadmin'
  );
$$;

grant execute on function public.is_superadmin() to authenticated;

create or replace function public.owns_course(cid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.courses c
    where c.id = cid
      and (c.created_by = (select auth.uid()) or public.is_superadmin())
  );
$$;

grant execute on function public.owns_course(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. courses
-- -----------------------------------------------------------------------------

drop policy if exists "admins can select courses" on public.courses;
drop policy if exists "admins can insert courses" on public.courses;
drop policy if exists "admins can update courses" on public.courses;
drop policy if exists "admins can delete courses" on public.courses;

create policy "admins can select courses" on public.courses
  for select to authenticated
  using (created_by = (select auth.uid()) or public.is_superadmin());

create policy "admins can insert courses" on public.courses
  for insert to authenticated
  with check (
    public.is_admin()
    and (created_by = (select auth.uid()) or public.is_superadmin())
  );

create policy "admins can update courses" on public.courses
  for update to authenticated
  using (created_by = (select auth.uid()) or public.is_superadmin())
  with check (created_by = (select auth.uid()) or public.is_superadmin());

create policy "admins can delete courses" on public.courses
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_superadmin());

-- -----------------------------------------------------------------------------
-- 3. course_sections
-- -----------------------------------------------------------------------------

drop policy if exists "admins can select course_sections" on public.course_sections;
drop policy if exists "admins can insert course_sections" on public.course_sections;
drop policy if exists "admins can update course_sections" on public.course_sections;
drop policy if exists "admins can delete course_sections" on public.course_sections;

create policy "admins can select course_sections" on public.course_sections
  for select to authenticated
  using (public.owns_course(course_id));

create policy "admins can insert course_sections" on public.course_sections
  for insert to authenticated
  with check (public.owns_course(course_id));

create policy "admins can update course_sections" on public.course_sections
  for update to authenticated
  using (public.owns_course(course_id))
  with check (public.owns_course(course_id));

create policy "admins can delete course_sections" on public.course_sections
  for delete to authenticated
  using (public.owns_course(course_id));

-- -----------------------------------------------------------------------------
-- 4. lessons
-- -----------------------------------------------------------------------------

drop policy if exists "admins can select lessons" on public.lessons;
drop policy if exists "admins can insert lessons" on public.lessons;
drop policy if exists "admins can update lessons" on public.lessons;
drop policy if exists "admins can delete lessons" on public.lessons;

create policy "admins can select lessons" on public.lessons
  for select to authenticated
  using (exists (
    select 1 from public.course_sections s
    where s.id = lessons.section_id and public.owns_course(s.course_id)
  ));

create policy "admins can insert lessons" on public.lessons
  for insert to authenticated
  with check (exists (
    select 1 from public.course_sections s
    where s.id = lessons.section_id and public.owns_course(s.course_id)
  ));

create policy "admins can update lessons" on public.lessons
  for update to authenticated
  using (exists (
    select 1 from public.course_sections s
    where s.id = lessons.section_id and public.owns_course(s.course_id)
  ))
  with check (exists (
    select 1 from public.course_sections s
    where s.id = lessons.section_id and public.owns_course(s.course_id)
  ));

create policy "admins can delete lessons" on public.lessons
  for delete to authenticated
  using (exists (
    select 1 from public.course_sections s
    where s.id = lessons.section_id and public.owns_course(s.course_id)
  ));

-- -----------------------------------------------------------------------------
-- 5. resources
-- -----------------------------------------------------------------------------

drop policy if exists "admins can select resources" on public.resources;
drop policy if exists "admins can insert resources" on public.resources;
drop policy if exists "admins can update resources" on public.resources;
drop policy if exists "admins can delete resources" on public.resources;

create policy "admins can select resources" on public.resources
  for select to authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = resources.lesson_id and public.owns_course(s.course_id)
  ));

create policy "admins can insert resources" on public.resources
  for insert to authenticated
  with check (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = resources.lesson_id and public.owns_course(s.course_id)
  ));

create policy "admins can update resources" on public.resources
  for update to authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = resources.lesson_id and public.owns_course(s.course_id)
  ))
  with check (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = resources.lesson_id and public.owns_course(s.course_id)
  ));

create policy "admins can delete resources" on public.resources
  for delete to authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = resources.lesson_id and public.owns_course(s.course_id)
  ));

-- -----------------------------------------------------------------------------
-- 6. course_instructors (join table -- instructors itself stays is_admin())
-- -----------------------------------------------------------------------------

drop policy if exists "admins can select course_instructors" on public.course_instructors;
drop policy if exists "admins can insert course_instructors" on public.course_instructors;
drop policy if exists "admins can delete course_instructors" on public.course_instructors;

create policy "admins can select course_instructors" on public.course_instructors
  for select to authenticated
  using (public.owns_course(course_id));

create policy "admins can insert course_instructors" on public.course_instructors
  for insert to authenticated
  with check (public.owns_course(course_id));

create policy "admins can delete course_instructors" on public.course_instructors
  for delete to authenticated
  using (public.owns_course(course_id));

-- -----------------------------------------------------------------------------
-- 7. quizzes / questions / question_options
-- -----------------------------------------------------------------------------

drop policy if exists "admins can select quizzes" on public.quizzes;
drop policy if exists "admins can insert quizzes" on public.quizzes;
drop policy if exists "admins can update quizzes" on public.quizzes;
drop policy if exists "admins can delete quizzes" on public.quizzes;

create policy "admins can select quizzes" on public.quizzes
  for select to authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = quizzes.lesson_id and public.owns_course(s.course_id)
  ));

create policy "admins can insert quizzes" on public.quizzes
  for insert to authenticated
  with check (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = quizzes.lesson_id and public.owns_course(s.course_id)
  ));

create policy "admins can update quizzes" on public.quizzes
  for update to authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = quizzes.lesson_id and public.owns_course(s.course_id)
  ))
  with check (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = quizzes.lesson_id and public.owns_course(s.course_id)
  ));

create policy "admins can delete quizzes" on public.quizzes
  for delete to authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = quizzes.lesson_id and public.owns_course(s.course_id)
  ));

drop policy if exists "admins can select questions" on public.questions;
drop policy if exists "admins can insert questions" on public.questions;
drop policy if exists "admins can update questions" on public.questions;
drop policy if exists "admins can delete questions" on public.questions;

create policy "admins can select questions" on public.questions
  for select to authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where q.id = questions.quiz_id and public.owns_course(s.course_id)
  ));

create policy "admins can insert questions" on public.questions
  for insert to authenticated
  with check (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where q.id = questions.quiz_id and public.owns_course(s.course_id)
  ));

create policy "admins can update questions" on public.questions
  for update to authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where q.id = questions.quiz_id and public.owns_course(s.course_id)
  ))
  with check (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where q.id = questions.quiz_id and public.owns_course(s.course_id)
  ));

create policy "admins can delete questions" on public.questions
  for delete to authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where q.id = questions.quiz_id and public.owns_course(s.course_id)
  ));

drop policy if exists "admins can select question_options" on public.question_options;
drop policy if exists "admins can insert question_options" on public.question_options;
drop policy if exists "admins can update question_options" on public.question_options;
drop policy if exists "admins can delete question_options" on public.question_options;

create policy "admins can select question_options" on public.question_options
  for select to authenticated
  using (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_options.question_id and public.owns_course(s.course_id)
  ));

create policy "admins can insert question_options" on public.question_options
  for insert to authenticated
  with check (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_options.question_id and public.owns_course(s.course_id)
  ));

create policy "admins can update question_options" on public.question_options
  for update to authenticated
  using (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_options.question_id and public.owns_course(s.course_id)
  ))
  with check (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_options.question_id and public.owns_course(s.course_id)
  ));

create policy "admins can delete question_options" on public.question_options
  for delete to authenticated
  using (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_options.question_id and public.owns_course(s.course_id)
  ));

-- -----------------------------------------------------------------------------
-- 8. course_prerequisites / course_certificate_settings
-- -----------------------------------------------------------------------------

drop policy if exists "admins can select course_prerequisites" on public.course_prerequisites;
drop policy if exists "admins can insert course_prerequisites" on public.course_prerequisites;
drop policy if exists "admins can delete course_prerequisites" on public.course_prerequisites;

create policy "admins can select course_prerequisites" on public.course_prerequisites
  for select to authenticated
  using (public.owns_course(course_id));

create policy "admins can insert course_prerequisites" on public.course_prerequisites
  for insert to authenticated
  with check (public.owns_course(course_id));

create policy "admins can delete course_prerequisites" on public.course_prerequisites
  for delete to authenticated
  using (public.owns_course(course_id));

drop policy if exists "admins can select course_certificate_settings" on public.course_certificate_settings;
drop policy if exists "admins can insert course_certificate_settings" on public.course_certificate_settings;
drop policy if exists "admins can update course_certificate_settings" on public.course_certificate_settings;
drop policy if exists "admins can delete course_certificate_settings" on public.course_certificate_settings;

create policy "admins can select course_certificate_settings" on public.course_certificate_settings
  for select to authenticated
  using (public.owns_course(course_id));

create policy "admins can insert course_certificate_settings" on public.course_certificate_settings
  for insert to authenticated
  with check (public.owns_course(course_id));

create policy "admins can update course_certificate_settings" on public.course_certificate_settings
  for update to authenticated
  using (public.owns_course(course_id))
  with check (public.owns_course(course_id));

create policy "admins can delete course_certificate_settings" on public.course_certificate_settings
  for delete to authenticated
  using (public.owns_course(course_id));

-- -----------------------------------------------------------------------------
-- 9. enrollments / transactions
-- -----------------------------------------------------------------------------

drop policy if exists "admins read all enrollments" on public.enrollments;
drop policy if exists "admins insert enrollments" on public.enrollments;
drop policy if exists "admins delete enrollments" on public.enrollments;
drop policy if exists "admins update enrollments" on public.enrollments;

create policy "admins read all enrollments" on public.enrollments
  for select to authenticated
  using (public.owns_course(course_id));

create policy "admins insert enrollments" on public.enrollments
  for insert to authenticated
  with check (public.owns_course(course_id));

create policy "admins delete enrollments" on public.enrollments
  for delete to authenticated
  using (public.owns_course(course_id));

create policy "admins update enrollments" on public.enrollments
  for update to authenticated
  using (public.owns_course(course_id))
  with check (public.owns_course(course_id));

drop policy if exists "admins read all transactions" on public.transactions;
drop policy if exists "admins insert transactions" on public.transactions;
drop policy if exists "admins update transactions" on public.transactions;

create policy "admins read all transactions" on public.transactions
  for select to authenticated
  using (public.owns_course(course_id));

create policy "admins insert transactions" on public.transactions
  for insert to authenticated
  with check (public.owns_course(course_id));

create policy "admins update transactions" on public.transactions
  for update to authenticated
  using (public.owns_course(course_id))
  with check (public.owns_course(course_id));

-- -----------------------------------------------------------------------------
-- 10. lesson_progress
-- -----------------------------------------------------------------------------

drop policy if exists "admins read all lesson_progress" on public.lesson_progress;
drop policy if exists "admins insert lesson_progress" on public.lesson_progress;
drop policy if exists "admins update lesson_progress" on public.lesson_progress;

create policy "admins read all lesson_progress" on public.lesson_progress
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = lesson_progress.enrollment_id and public.owns_course(e.course_id)
  ));

create policy "admins insert lesson_progress" on public.lesson_progress
  for insert to authenticated
  with check (exists (
    select 1 from public.enrollments e
    where e.id = lesson_progress.enrollment_id and public.owns_course(e.course_id)
  ));

create policy "admins update lesson_progress" on public.lesson_progress
  for update to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = lesson_progress.enrollment_id and public.owns_course(e.course_id)
  ))
  with check (exists (
    select 1 from public.enrollments e
    where e.id = lesson_progress.enrollment_id and public.owns_course(e.course_id)
  ));

-- -----------------------------------------------------------------------------
-- 11. quiz_attempts / quiz_responses
-- -----------------------------------------------------------------------------

drop policy if exists "admins read all quiz attempts" on public.quiz_attempts;
drop policy if exists "admins update quiz attempts" on public.quiz_attempts;

create policy "admins read all quiz attempts" on public.quiz_attempts
  for select to authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where q.id = quiz_attempts.quiz_id and public.owns_course(s.course_id)
  ));

create policy "admins update quiz attempts" on public.quiz_attempts
  for update to authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where q.id = quiz_attempts.quiz_id and public.owns_course(s.course_id)
  ))
  with check (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where q.id = quiz_attempts.quiz_id and public.owns_course(s.course_id)
  ));

drop policy if exists "admins read all quiz responses" on public.quiz_responses;
drop policy if exists "admins update quiz responses" on public.quiz_responses;

create policy "admins read all quiz responses" on public.quiz_responses
  for select to authenticated
  using (exists (
    select 1 from public.quiz_attempts a
    join public.quizzes q on q.id = a.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where a.id = quiz_responses.attempt_id and public.owns_course(s.course_id)
  ));

create policy "admins update quiz responses" on public.quiz_responses
  for update to authenticated
  using (exists (
    select 1 from public.quiz_attempts a
    join public.quizzes q on q.id = a.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where a.id = quiz_responses.attempt_id and public.owns_course(s.course_id)
  ))
  with check (exists (
    select 1 from public.quiz_attempts a
    join public.quizzes q on q.id = a.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where a.id = quiz_responses.attempt_id and public.owns_course(s.course_id)
  ));

-- -----------------------------------------------------------------------------
-- 12. certificates
-- -----------------------------------------------------------------------------

drop policy if exists "admins read all certificates" on public.certificates;
drop policy if exists "admins insert certificates" on public.certificates;
drop policy if exists "admins update certificates" on public.certificates;

create policy "admins read all certificates" on public.certificates
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = certificates.enrollment_id and public.owns_course(e.course_id)
  ));

create policy "admins insert certificates" on public.certificates
  for insert to authenticated
  with check (exists (
    select 1 from public.enrollments e
    where e.id = certificates.enrollment_id and public.owns_course(e.course_id)
  ));

create policy "admins update certificates" on public.certificates
  for update to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = certificates.enrollment_id and public.owns_course(e.course_id)
  ))
  with check (exists (
    select 1 from public.enrollments e
    where e.id = certificates.enrollment_id and public.owns_course(e.course_id)
  ));

-- -----------------------------------------------------------------------------
-- 13. Backfill: assign existing owner-less courses
-- -----------------------------------------------------------------------------

update public.courses
set created_by = (
  select id from public.profiles
  where email = 'harfiibadurahman01@gmail.com'
  limit 1
)
where created_by is null;
