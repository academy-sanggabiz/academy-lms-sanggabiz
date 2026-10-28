-- Per-question explanations shown to a learner after they submit a quiz
-- (v2, DL standard: feedback says what was right or wrong AND why, plus
-- what to do next -- not just a score).
--
-- A separate table, not a questions.explanation column: RLS is row-level,
-- and questions rows are readable by anyone who can read the course, so a
-- column there would let a learner fetch every explanation (often the
-- answer itself) through the REST API before attempting the quiz. Here the
-- learner policy only admits rows for a quiz the learner has already
-- submitted an attempt for.
create table if not exists public.question_explanations (
  question_id uuid primary key references public.questions (id) on delete cascade,
  explanation text not null default '' check (char_length(explanation) <= 5000),
  updated_at timestamptz not null default now()
);

alter table public.question_explanations enable row level security;

grant select, insert, update, delete on public.question_explanations to authenticated;

drop policy if exists "learners read explanations after submitting" on public.question_explanations;
create policy "learners read explanations after submitting" on public.question_explanations
  for select to authenticated
  using (exists (
    select 1 from public.questions qn
    join public.quiz_attempts qa on qa.quiz_id = qn.quiz_id
    where qn.id = question_explanations.question_id
      and qa.learner_id = auth.uid()
      and qa.status <> 'in_progress'
  ));

drop policy if exists "admins can select question_explanations" on public.question_explanations;
create policy "admins can select question_explanations" on public.question_explanations
  for select to authenticated
  using (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_explanations.question_id and public.owns_course(s.course_id)
  ));

drop policy if exists "admins can insert question_explanations" on public.question_explanations;
create policy "admins can insert question_explanations" on public.question_explanations
  for insert to authenticated
  with check (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_explanations.question_id and public.owns_course(s.course_id)
  ));

drop policy if exists "admins can update question_explanations" on public.question_explanations;
create policy "admins can update question_explanations" on public.question_explanations
  for update to authenticated
  using (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_explanations.question_id and public.owns_course(s.course_id)
  ))
  with check (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_explanations.question_id and public.owns_course(s.course_id)
  ));

drop policy if exists "admins can delete question_explanations" on public.question_explanations;
create policy "admins can delete question_explanations" on public.question_explanations
  for delete to authenticated
  using (exists (
    select 1 from public.questions qn
    join public.quizzes q on q.id = qn.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections s on s.id = l.section_id
    where qn.id = question_explanations.question_id and public.owns_course(s.course_id)
  ));
