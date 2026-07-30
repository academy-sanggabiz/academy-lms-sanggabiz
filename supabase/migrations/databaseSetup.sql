-- EaseLMS / Sanggabiz — full database setup.
--
-- This is the single source of truth for the schema: run once, top to bottom,
-- in the Supabase Dashboard SQL Editor to provision a fresh project (there is
-- no linked Supabase CLI project here, so there's no `db push` consuming a
-- sequence of incremental migrations — a single consolidated script is
-- clearer than the per-feature files this replaced). It represents the final
-- desired state, not the history of how it was built up (e.g. `courses` is
-- defined once with every column it ended up with, not created-then-altered).
--
-- After running this, also complete the dashboard-only steps: enable the
-- custom access token hook (Auth → Hooks) so `custom_access_token_hook` below
-- actually mirrors profiles.role into the JWT, configure Email/Google auth
-- providers and redirect URLs, and manually create the `lesson-content`
-- Storage bucket (public read) — like `course-thumbnails`/`certificate-assets`
-- below, it holds admin-authored content but was never scripted here either.

-- =============================================================================
-- 1. Enums
-- =============================================================================

create type public.user_role as enum ('learner', 'admin', 'superadmin');
create type public.course_status as enum ('draft', 'published');
create type public.lesson_content_type as enum ('video', 'text', 'quiz', 'mixed', 'ppt');
create type public.enrollment_status as enum ('active', 'completed');

-- Only multiple_choice/essay are authored/graded today; the remaining values
-- are reserved so adding true_false/matching/fill_in_blank later doesn't need
-- an enum migration.
create type public.question_type as enum (
  'multiple_choice',
  'true_false',
  'short_answer',
  'essay',
  'matching',
  'fill_in_blank'
);

-- =============================================================================
-- 2. profiles (1:1 with auth.users) + auto-provisioning + JWT role claim
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'learner',
  notification_email_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user may read/update only their own row. There is no insert policy —
-- rows are created only by the trigger below, never directly by clients.
create policy "own profile read" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "own profile update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Auto-create a profile row (default role 'learner') whenever a new
-- auth.users row is created, whether via email/password or Google OAuth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Custom access-token hook: injects the learner/admin/superadmin role into
-- app_metadata.role in the issued JWT, so the role is readable from the
-- session with no extra DB round trip. Requires enabling in the Supabase
-- Dashboard (Auth → Hooks) — creating the function alone isn't enough.
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role public.user_role;
begin
  select role into user_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if user_role is not null then
    if jsonb_typeof(claims -> 'app_metadata') is null then
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    end if;
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- The Auth service (not application clients) must be able to read profiles
-- and call the hook. Application roles must NOT be able to call it directly.
grant all on table public.profiles to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- security definer so admin-check policies below don't re-trigger RLS on
-- profiles for every row being evaluated (a self-referential exists() in a
-- plain policy predicate would recurse). Mirrors custom_access_token_hook's
-- definer-function approach to role checks.
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'superadmin')
  );
$$;

grant execute on function public.is_admin() to authenticated;

create policy "admins read all profiles" on public.profiles
  for select to authenticated
  using (public.is_admin());

-- =============================================================================
-- 3. courses
-- =============================================================================

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  thumbnail_url text,
  price numeric not null default 0,
  level text,
  lesson_count int not null default 0,
  duration_hours numeric not null default 0,
  status public.course_status not null default 'draft',
  who_for text[] not null default '{}',
  requirements text[] not null default '{}',
  language text not null default 'Bahasa Indonesia',
  require_prerequisites boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

-- Learners (and anonymous visitors, e.g. the public landing page) may read
-- only published courses.
create policy "published courses are readable" on public.courses
  for select
  to anon, authenticated
  using (status = 'published');

grant select on public.courses to anon, authenticated;

-- =============================================================================
-- 4. instructors / course_instructors
-- =============================================================================

create table public.instructors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  bio text,
  avatar_url text,
  profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.course_instructors (
  course_id uuid not null references public.courses (id) on delete cascade,
  instructor_id uuid not null references public.instructors (id) on delete cascade,
  primary key (course_id, instructor_id)
);

alter table public.instructors enable row level security;
alter table public.course_instructors enable row level security;

-- Instructor bios are marketing content, like courses/lessons — public read.
create policy "instructors are readable" on public.instructors
  for select
  to anon, authenticated
  using (true);

create policy "course_instructors readable for published courses" on public.course_instructors
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.courses c
    where c.id = course_instructors.course_id and c.status = 'published'
  ));

grant select on public.instructors to anon, authenticated;
grant select on public.course_instructors to anon, authenticated;

-- =============================================================================
-- 5. course_sections / lessons / resources
-- =============================================================================

create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position int not null default 0
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections (id) on delete cascade,
  title text not null,
  position int not null default 0,
  content_type public.lesson_content_type not null default 'video',
  video_url text,
  content text,
  duration_seconds int
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null,
  file_url text not null,
  type text,
  position int not null default 0
);

alter table public.course_sections enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;

-- Curriculum (module/lesson titles + types) is part of the public "sales
-- page" for a course, so it's readable whenever the parent course is
-- published — via EXISTS checks up the section/lesson chain.
--
-- KNOWN FOLLOW-UP: this also exposes lessons.video_url/content to
-- non-enrolled users, since RLS is row-level and can't hide columns. The
-- lesson player (app/learn/[courseId]/) gates access at the page level
-- (redirects to course detail if there's no enrollment), but a non-enrolled
-- authenticated user could still read lesson content directly via the
-- Supabase REST API. Fine while content is placeholder/seed data; real
-- content later should either move gating into RLS (a lessons select policy
-- requiring an enrollment, not just a published course) or accept this as a
-- deliberate page-level-only gate.
create policy "sections readable for published courses" on public.course_sections
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.courses c
    where c.id = course_sections.course_id and c.status = 'published'
  ));

create policy "lessons readable for published courses" on public.lessons
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.course_sections s
    join public.courses c on c.id = s.course_id
    where s.id = lessons.section_id and c.status = 'published'
  ));

create policy "resources readable for published courses" on public.resources
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    join public.courses c on c.id = s.course_id
    where l.id = resources.lesson_id and c.status = 'published'
  ));

grant select on public.course_sections, public.lessons, public.resources to anon, authenticated;

-- =============================================================================
-- 6. enrollments / lesson_progress
-- =============================================================================

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

-- A learner may only see and create their OWN enrollments — authenticated-only
-- (not anon-readable), enrollment data is private to the learner. There's no
-- update policy: enrollments.status is never auto-set to 'completed' yet
-- (course-level completion rollup is deferred; only per-lesson completion
-- exists via lesson_progress below).
create policy "own enrollments readable" on public.enrollments
  for select
  to authenticated
  using ((select auth.uid()) = learner_id);

create policy "own enrollments insertable" on public.enrollments
  for insert
  to authenticated
  with check ((select auth.uid()) = learner_id);

-- Admin Learner Management: admins can read every learner's enrollments and
-- enroll/unenroll them from the admin screen.
create policy "admins read all enrollments" on public.enrollments
  for select to authenticated
  using (public.is_admin());

create policy "admins insert enrollments" on public.enrollments
  for insert to authenticated
  with check (public.is_admin());

create policy "admins delete enrollments" on public.enrollments
  for delete to authenticated
  using (public.is_admin());

grant select, insert, delete on public.enrollments to authenticated;

-- Per-lesson completion, keyed by enrollment (has no learner_id column, so
-- every policy checks ownership via an EXISTS join through enrollments).
-- Powers the lesson player's mark-complete checkbox + progress bar.
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

-- Update (not just insert) is needed here — the reference's interaction is a
-- checkbox in the lesson sidebar (toggle on/off), not a one-way "mark
-- complete" button, so re-toggling has to actually update the row both ways.
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

create policy "admins read all lesson_progress" on public.lesson_progress
  for select to authenticated
  using (public.is_admin());

grant select, insert, update on public.lesson_progress to authenticated;

-- =============================================================================
-- 7. Quiz engine
-- =============================================================================

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

-- Quiz content (title, questions, option text) is part of the public "sales
-- page" for a course, readable whenever the parent course is published —
-- same EXISTS-up-the-chain pattern as course_sections/lessons.
--
-- KNOWN FOLLOW-UP: question_options.is_correct is exposed at the row level
-- here (RLS can't hide a single column), same tradeoff as lessons above. The
-- client-side fetch (lib/courses-server.ts) never selects is_correct, and
-- grading always happens server-side in app/learn/[courseId]/quiz-actions.ts
-- — but a non-enrolled authenticated user could still read it directly via
-- the Supabase REST API. Fine for now; real content later should move this
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

-- Attempts/responses are private to the learner who made them, same model as
-- enrollments/lesson_progress. Update is needed on quiz_attempts so
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

-- =============================================================================
-- 8. Prerequisites & Certificate settings (authoring only)
-- =============================================================================

-- Named explicitly (rather than relying on Postgres's default
-- <table>_<column>_fkey naming) so getCourseDetailForAdmin's embedded select
-- can disambiguate the two FKs to the same table via
-- course_prerequisites!course_prerequisites_course_id_fkey(...).
create table public.course_prerequisites (
  course_id uuid not null,
  prerequisite_course_id uuid not null,
  position int not null default 0,
  primary key (course_id, prerequisite_course_id),
  constraint course_prerequisites_course_id_fkey foreign key (course_id) references public.courses (id) on delete cascade,
  constraint course_prerequisites_prerequisite_course_id_fkey foreign key (prerequisite_course_id) references public.courses (id) on delete cascade,
  check (course_id <> prerequisite_course_id)
);

create table public.course_certificate_settings (
  course_id uuid primary key references public.courses (id) on delete cascade,
  enabled boolean not null default false,
  template_url text,
  certificate_type text not null default 'completion'
    check (certificate_type in ('completion', 'participation', 'achievement', 'custom')),
  custom_title text,
  description text,
  signature_url text,
  signer_name text,
  signer_title text,
  additional_text text
);

alter table public.course_prerequisites enable row level security;
alter table public.course_certificate_settings enable row level security;

-- Admin/superadmin only — not exposed to anon/authenticated learners yet.
create policy "admins can select course_prerequisites" on public.course_prerequisites
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert course_prerequisites" on public.course_prerequisites
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can delete course_prerequisites" on public.course_prerequisites
  for delete to authenticated
  using (public.is_admin());

create policy "admins can select course_certificate_settings" on public.course_certificate_settings
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert course_certificate_settings" on public.course_certificate_settings
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can update course_certificate_settings" on public.course_certificate_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete course_certificate_settings" on public.course_certificate_settings
  for delete to authenticated
  using (public.is_admin());

grant select, insert, delete on public.course_prerequisites to authenticated;
grant select, insert, update, delete on public.course_certificate_settings to authenticated;

-- =============================================================================
-- 9. Admin course-authoring write access
-- =============================================================================
--
-- Every table above only had a select-where-published-style read policy (or,
-- for join tables, no write policy at all) — nobody, including an admin,
-- could write a course through the app without these. Gated by is_admin()
-- rather than the JWT app_metadata.role claim (unverified whether the custom
-- access token hook is enabled in a given environment) or a service-role
-- client (none configured in this project).

create policy "admins can select courses" on public.courses
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert courses" on public.courses
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can update courses" on public.courses
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete courses" on public.courses
  for delete to authenticated
  using (public.is_admin());

create policy "admins can select course_sections" on public.course_sections
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert course_sections" on public.course_sections
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can update course_sections" on public.course_sections
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete course_sections" on public.course_sections
  for delete to authenticated
  using (public.is_admin());

create policy "admins can select lessons" on public.lessons
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert lessons" on public.lessons
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can update lessons" on public.lessons
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete lessons" on public.lessons
  for delete to authenticated
  using (public.is_admin());

create policy "admins can select resources" on public.resources
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert resources" on public.resources
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can update resources" on public.resources
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete resources" on public.resources
  for delete to authenticated
  using (public.is_admin());

create policy "admins can select instructors" on public.instructors
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert instructors" on public.instructors
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can update instructors" on public.instructors
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete instructors" on public.instructors
  for delete to authenticated
  using (public.is_admin());

-- course_instructors is a join table: no natural "update", reassignment is
-- delete + insert.
create policy "admins can select course_instructors" on public.course_instructors
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert course_instructors" on public.course_instructors
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can delete course_instructors" on public.course_instructors
  for delete to authenticated
  using (public.is_admin());

create policy "admins can select quizzes" on public.quizzes
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert quizzes" on public.quizzes
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can update quizzes" on public.quizzes
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete quizzes" on public.quizzes
  for delete to authenticated
  using (public.is_admin());

create policy "admins can select questions" on public.questions
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert questions" on public.questions
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can update questions" on public.questions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete questions" on public.questions
  for delete to authenticated
  using (public.is_admin());

create policy "admins can select question_options" on public.question_options
  for select to authenticated
  using (public.is_admin());

create policy "admins can insert question_options" on public.question_options
  for insert to authenticated
  with check (public.is_admin());

create policy "admins can update question_options" on public.question_options
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete question_options" on public.question_options
  for delete to authenticated
  using (public.is_admin());

grant insert, update, delete on public.courses, public.course_sections, public.lessons,
  public.resources, public.instructors, public.course_instructors, public.quizzes,
  public.questions, public.question_options to authenticated;

-- =============================================================================
-- 10. Storage buckets
-- =============================================================================

-- Course thumbnails: public read (matches published-course visibility on the
-- public landing page), admin/superadmin-only write.
insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do nothing;

create policy "public can read course thumbnails" on storage.objects
  for select to public
  using (bucket_id = 'course-thumbnails');

create policy "admins can upload course thumbnails" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-thumbnails' and public.is_admin());

create policy "admins can update course thumbnails" on storage.objects
  for update to authenticated
  using (bucket_id = 'course-thumbnails' and public.is_admin())
  with check (bucket_id = 'course-thumbnails' and public.is_admin());

create policy "admins can delete course thumbnails" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-thumbnails' and public.is_admin());

-- Certificate template/signature images: same public-read/admin-write shape.
insert into storage.buckets (id, name, public)
values ('certificate-assets', 'certificate-assets', true)
on conflict (id) do nothing;

create policy "public can read certificate assets" on storage.objects
  for select to public
  using (bucket_id = 'certificate-assets');

create policy "admins can upload certificate assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'certificate-assets' and public.is_admin());

create policy "admins can update certificate assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'certificate-assets' and public.is_admin())
  with check (bucket_id = 'certificate-assets' and public.is_admin());

create policy "admins can delete certificate assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'certificate-assets' and public.is_admin());

-- NOTE: the `lesson-content` bucket (Tiptap image uploads in the rich text
-- lesson editor) is NOT created here — like the two buckets above it needs
-- public read, but it must be created manually in the Supabase Dashboard
-- (see CLAUDE.md), not via SQL.
