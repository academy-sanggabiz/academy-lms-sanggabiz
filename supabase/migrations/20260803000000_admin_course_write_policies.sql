-- Admin course-authoring write access (plan: "Admin Manage Courses", Phase 0).
--
-- courses/course_sections/lessons/resources/instructors/course_instructors/
-- quizzes/questions/question_options currently only have a
-- select-where-published-style read policy (or, for the join tables, no
-- write policy at all) -- nobody, including an admin, can write a course
-- through the app yet. This migration is purely additive: it adds an
-- admin-select policy (so admins can see draft rows too) plus
-- insert/update/delete policies, all gated by the same
-- "exists a profiles row for auth.uid() with role in (admin, superadmin)"
-- check already used by write policies elsewhere in this project (e.g.
-- lesson_progress, enrollments), rather than the JWT app_metadata.role
-- claim (unverified whether the custom_access_token_hook is enabled) or a
-- service-role client (none configured in this project).
--
-- Run this manually in the Supabase Dashboard SQL Editor -- there is no
-- linked Supabase CLI project here.

create policy "admins can select courses" on public.courses
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert courses" on public.courses
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can update courses" on public.courses
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete courses" on public.courses
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can select course_sections" on public.course_sections
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert course_sections" on public.course_sections
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can update course_sections" on public.course_sections
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete course_sections" on public.course_sections
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can select lessons" on public.lessons
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert lessons" on public.lessons
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can update lessons" on public.lessons
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete lessons" on public.lessons
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can select resources" on public.resources
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert resources" on public.resources
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can update resources" on public.resources
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete resources" on public.resources
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can select instructors" on public.instructors
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert instructors" on public.instructors
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can update instructors" on public.instructors
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete instructors" on public.instructors
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

-- course_instructors is a join table: no natural "update", reassignment is
-- delete + insert.
create policy "admins can select course_instructors" on public.course_instructors
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert course_instructors" on public.course_instructors
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete course_instructors" on public.course_instructors
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can select quizzes" on public.quizzes
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert quizzes" on public.quizzes
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can update quizzes" on public.quizzes
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete quizzes" on public.quizzes
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can select questions" on public.questions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert questions" on public.questions
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can update questions" on public.questions
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete questions" on public.questions
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can select question_options" on public.question_options
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert question_options" on public.question_options
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can update question_options" on public.question_options
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete question_options" on public.question_options
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

grant insert, update, delete on public.courses, public.course_sections, public.lessons,
  public.resources, public.instructors, public.course_instructors, public.quizzes,
  public.questions, public.question_options to authenticated;
