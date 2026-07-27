-- Quiz engine (erd.md build-order step 3): quizzes -> questions ->
-- question_options, plus quiz_attempts/quiz_responses recording learner
-- submissions. Columns match erd.md's "Quiz engine (full)" section exactly.
--
-- This pass only seeds/renders `multiple_choice` and `essay`/`short_answer`
-- questions (see CLAUDE.md), but the enum includes all six erd.md values so
-- adding true_false/matching/fill_in_blank later doesn't need an enum
-- migration.

create type public.question_type as enum (
  'multiple_choice',
  'true_false',
  'short_answer',
  'essay',
  'matching',
  'fill_in_blank'
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid unique references public.lessons (id) on delete cascade,
  title text not null,
  pass_score int not null default 70,
  time_limit_seconds int,
  max_attempts int,
  shuffle boolean not null default false
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  type public.question_type not null,
  prompt text not null,
  points int not null default 1,
  position int not null default 0
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  match_key text,
  position int not null default 0
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  attempt_number int not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  passed boolean,
  unique (quiz_id, learner_id, attempt_number)
);

create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  response jsonb not null,
  is_correct boolean,
  points_awarded numeric
);

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_responses enable row level security;

-- Quiz content (title, questions, option text) is part of the public
-- "sales page" for a course, readable whenever the parent course is
-- published — same EXISTS-up-the-chain pattern as course_sections/lessons.
--
-- KNOWN FOLLOW-UP: `question_options.is_correct` is exposed at the row
-- level here (RLS can't hide a single column), same tradeoff already
-- documented for `lessons.video_url`/`content`. The client-side fetch
-- (lib/courses-server.ts) never selects `is_correct`, and grading always
-- happens server-side in app/learn/[courseId]/quiz-actions.ts — but a
-- non-enrolled authenticated user could still read it directly via the
-- Supabase REST API. Fine for now; real content later should move this
-- into RLS (e.g. only expose is_correct after an attempt is submitted) or
-- accept this as a deliberate page/action-level-only gate, same as lessons.
create policy "quizzes readable for published courses" on public.quizzes
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
    join public.courses c on c.id = cs.course_id
    where l.id = quizzes.lesson_id and c.status = 'published'
  ));

create policy "questions readable for published courses" on public.questions
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections cs on cs.id = l.section_id
    join public.courses c on c.id = cs.course_id
    where q.id = questions.quiz_id and c.status = 'published'
  ));

create policy "question_options readable for published courses" on public.question_options
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.questions qu
    join public.quizzes q on q.id = qu.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections cs on cs.id = l.section_id
    join public.courses c on c.id = cs.course_id
    where qu.id = question_options.question_id and c.status = 'published'
  ));

-- Attempts/responses are private to the learner who made them, same model
-- as enrollments/lesson_progress. Update is needed on quiz_attempts so
-- submitQuiz can write submitted_at/score/passed after grading.
create policy "own quiz attempts readable" on public.quiz_attempts
  for select
  to authenticated
  using ((select auth.uid()) = learner_id);

create policy "own quiz attempts insertable" on public.quiz_attempts
  for insert
  to authenticated
  with check ((select auth.uid()) = learner_id);

create policy "own quiz attempts updatable" on public.quiz_attempts
  for update
  to authenticated
  using ((select auth.uid()) = learner_id)
  with check ((select auth.uid()) = learner_id);

create policy "own quiz responses readable" on public.quiz_responses
  for select
  to authenticated
  using (exists (
    select 1 from public.quiz_attempts a
    where a.id = quiz_responses.attempt_id and a.learner_id = (select auth.uid())
  ));

create policy "own quiz responses insertable" on public.quiz_responses
  for insert
  to authenticated
  with check (exists (
    select 1 from public.quiz_attempts a
    where a.id = quiz_responses.attempt_id and a.learner_id = (select auth.uid())
  ));

grant select on public.quizzes, public.questions, public.question_options to anon, authenticated;
grant select, insert, update on public.quiz_attempts to authenticated;
grant select, insert on public.quiz_responses to authenticated;
