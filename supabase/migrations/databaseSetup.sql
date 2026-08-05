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
-- actually mirrors profiles.role into the JWT, and configure Email/Google auth
-- providers and redirect URLs. Storage buckets (including `lesson-content`) are
-- created by §10 below, so no manual bucket setup is required.

-- =============================================================================
-- 1. Enums
-- =============================================================================

create type public.user_role as enum ('learner', 'admin', 'superadmin');
create type public.course_status as enum ('draft', 'published');
create type public.lesson_content_type as enum ('video', 'text', 'quiz', 'mixed', 'ppt');
create type public.enrollment_status as enum ('active', 'completed');
create type public.transaction_status as enum ('completed', 'pending', 'refunded', 'free');

-- multiple_choice/true_false/short_answer/essay/file_upload are authored and
-- graded today (file_upload learners upload a PDF instead of typing, graded
-- manually like essay); matching/fill_in_blank remain reserved so adding them
-- later doesn't need an enum migration.
create type public.question_type as enum (
  'multiple_choice',
  'true_false',
  'short_answer',
  'essay',
  'matching',
  'fill_in_blank',
  'file_upload'
);

-- Lifecycle of a quiz_attempts row. 'pending_review' is needed because essay
-- questions can't be auto-graded: an attempt containing any essay answer is
-- held here (score/passed left null, lesson not completed) until an admin
-- grades it through Admin > Grading, at which point it becomes 'graded'.
create type public.quiz_attempt_status as enum ('in_progress', 'pending_review', 'graded');

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

-- Stricter than is_admin() — some settings (like site-wide public content,
-- and cross-admin course oversight) are reserved for superadmin, not every
-- admin. Defined here (rather than near landing_content further down) so
-- owns_course() below can reference it.
create function public.is_superadmin()
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
  -- Invite-only course: orthogonal to status, so a private course can still be
  -- draft or published. Only the owning admin and learners an admin has
  -- explicitly enrolled can read it -- see can_read_course() below.
  is_private boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

-- -----------------------------------------------------------------------------
-- enrollments (table only -- its policies live in section 6 with
-- lesson_progress, which is where the rest of the enrollment story is)
-- -----------------------------------------------------------------------------
--
-- Hoisted up here out of section 6 purely for dependency ordering: `language
-- sql` function bodies are parsed and validated at CREATE FUNCTION time, so
-- can_read_course() below cannot be defined until both courses and
-- enrollments exist -- and the read policies in sections 4/5 that call it
-- come well before section 6.
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

-- -----------------------------------------------------------------------------
-- Course visibility / ownership helpers
-- -----------------------------------------------------------------------------
--
-- All three read `courses` (and can_read_course also reads `enrollments`), so
-- they must be defined after those tables -- see the note above.

-- Per-admin course ownership: an admin only "owns" a course they created
-- (courses.created_by); superadmin is a superset and owns every course.
-- security definer for the same recursion-avoidance reason as is_admin().
create function public.owns_course(cid uuid)
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

-- Learner/anon visibility for a course and everything derived from it.
-- Every read policy below on course_sections/lessons/resources/quizzes/
-- questions/course_instructors/course_certificate_settings (and the
-- question_options_public view) used to inline `courses.status = 'published'`
-- as its visibility test; they all call this instead, so the rule has one
-- definition rather than nine copies to keep in sync.
--
-- A private course (courses.is_private) is readable only by learners who have
-- actually been enrolled in it -- admins reach their own private courses
-- through the separate owns_course()-based policies further down. For anon,
-- auth.uid() is null, so the enrollment EXISTS is always false and private
-- courses stay invisible on the public landing page.
--
-- security definer for the same recursion-avoidance reason as is_admin(): it
-- reads courses/enrollments with the owner's privileges, so the policies that
-- call it don't re-enter RLS.
create function public.can_read_course(cid uuid)
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

-- Whether a learner may enroll THEMSELVES into a course. Deliberately not the
-- same as can_read_course(): an already-enrolled learner can read a private
-- course, but that must not make it self-enrollable. Used only by the
-- enrollments insert policy in section 6.
create function public.is_open_enrollment_course(cid uuid)
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

-- Learners (and anonymous visitors, e.g. the public landing page) may read
-- published courses -- but a published course marked is_private is readable
-- only by learners who have actually been enrolled in it by an admin.
--
-- Calls can_read_course() rather than inlining the enrollment EXISTS. Two
-- reasons, both load-bearing:
--   1. Privileges. A policy's subquery runs with the *caller's* table
--      privileges, and `enrollments` is granted to authenticated only -- an
--      inlined `select ... from enrollments` therefore fails outright with
--      "permission denied for table enrollments" for anon, breaking the whole
--      public landing page. can_read_course() is security definer, so it
--      reads enrollments with the owner's privileges instead.
--   2. No recursion. Being security definer, it also reads `courses` as the
--      owner, which bypasses this very policy -- the same mechanism that lets
--      is_admin() read `profiles` from inside a `profiles` policy.
create policy "readable courses" on public.courses
  for select
  to anon, authenticated
  using (public.can_read_course(courses.id));

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

create policy "course_instructors readable for readable courses" on public.course_instructors
  for select
  to anon, authenticated
  using (public.can_read_course(course_instructors.course_id));

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
create policy "sections readable for readable courses" on public.course_sections
  for select
  to anon, authenticated
  using (public.can_read_course(course_sections.course_id));

create policy "lessons readable for readable courses" on public.lessons
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.course_sections s
    where s.id = lessons.section_id and public.can_read_course(s.course_id)
  ));

create policy "resources readable for readable courses" on public.resources
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = resources.lesson_id and public.can_read_course(s.course_id)
  ));

grant select on public.course_sections, public.lessons, public.resources to anon, authenticated;

-- courses.lesson_count/duration_hours are denormalized for cheap list-view
-- reads, but nothing in the app writes them after course creation -- keep
-- them correct automatically via a trigger on lessons instead of relying on
-- every lesson-CRUD call site to remember to update the parent course.
create or replace function public.recalculate_course_lesson_stats(target_course_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.courses c
  set lesson_count = (
        select count(*) from public.lessons l
        join public.course_sections s on s.id = l.section_id
        where s.course_id = c.id
      ),
      duration_hours = (
        select coalesce(round(sum(l.duration_seconds) / 3600.0, 1), 0) from public.lessons l
        join public.course_sections s on s.id = l.section_id
        where s.course_id = c.id
      )
  where c.id = target_course_id;
$$;

create or replace function public.handle_lesson_stats_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_course_id uuid;
  old_course_id uuid;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    select course_id into new_course_id from public.course_sections where id = new.section_id;
    perform public.recalculate_course_lesson_stats(new_course_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    select course_id into old_course_id from public.course_sections where id = old.section_id;
    if tg_op = 'DELETE' or old_course_id is distinct from new_course_id then
      perform public.recalculate_course_lesson_stats(old_course_id);
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists on_lesson_stats_change on public.lessons;

create trigger on_lesson_stats_change
after insert or update of duration_seconds, section_id or delete on public.lessons
for each row execute function public.handle_lesson_stats_change();

-- One-time backfill so already-existing courses reflect their real curriculum.
update public.courses c
set lesson_count = (
      select count(*) from public.lessons l
      join public.course_sections s on s.id = l.section_id
      where s.course_id = c.id
    ),
    duration_hours = (
      select coalesce(round(sum(l.duration_seconds) / 3600.0, 1), 0) from public.lessons l
      join public.course_sections s on s.id = l.section_id
      where s.course_id = c.id
    );

-- =============================================================================
-- 6. enrollments / lesson_progress
-- =============================================================================

-- NOTE: the enrollments table itself is created up in section 3, next to
-- courses -- can_read_course() has to be defined after both tables exist, and
-- the read policies in sections 4/5 call it. Only its policies live here.

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
  with check (
    (select auth.uid()) = learner_id
    and public.is_open_enrollment_course(course_id)
  );

-- Admin Learner Management: admins can read/enroll/unenroll learners only
-- for courses they own (superadmin: every course) — see owns_course().
create policy "admins read all enrollments" on public.enrollments
  for select to authenticated
  using (public.owns_course(course_id));

create policy "admins insert enrollments" on public.enrollments
  for insert to authenticated
  with check (public.owns_course(course_id));

create policy "admins delete enrollments" on public.enrollments
  for delete to authenticated
  using (public.owns_course(course_id));

grant select, insert, delete on public.enrollments to authenticated;

-- Purchase record for an enrollment. Courses are free-only today (courses.price
-- defaults to 0), but every enrollment still gets a transaction row (amount 0,
-- status 'free') so Admin Purchase Management has one place to look regardless
-- of whether commerce is live yet. enrollment_id is nullable (on delete set
-- null) so the purchase record survives if the enrollment itself is later
-- deleted by an admin.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrollment_id uuid references public.enrollments (id) on delete set null,
  amount numeric not null default 0,
  currency text not null default 'IDR',
  status public.transaction_status not null default 'free',
  gateway text,
  created_at timestamptz not null default now()
);

create index transactions_course_id_idx on public.transactions (course_id);
create index transactions_learner_id_idx on public.transactions (learner_id);

alter table public.transactions enable row level security;

-- Same ownership model as enrollments: a learner can read/insert only their
-- own purchase records (for a future learner Purchase History page); admins
-- can read every transaction for Purchase Management.
create policy "own transactions readable" on public.transactions
  for select
  to authenticated
  using ((select auth.uid()) = learner_id);

create policy "own transactions insertable" on public.transactions
  for insert
  to authenticated
  with check ((select auth.uid()) = learner_id);

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

grant select, insert, update on public.transactions to authenticated;

-- Backfill: give every enrollment that predates this table a matching
-- transaction row, so Admin Purchase Management isn't empty on first load.
-- Idempotent (safe to re-run) via the not-exists guard on enrollment_id.
insert into public.transactions (learner_id, course_id, enrollment_id, amount, status, created_at)
select
  e.learner_id,
  e.course_id,
  e.id,
  c.price,
  case when c.price > 0 then 'completed'::public.transaction_status else 'free'::public.transaction_status end,
  e.enrolled_at
from public.enrollments e
join public.courses c on c.id = e.course_id
where not exists (
  select 1 from public.transactions t where t.enrollment_id = e.id
);

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
  using (exists (
    select 1 from public.enrollments e
    where e.id = lesson_progress.enrollment_id and public.owns_course(e.course_id)
  ));

-- finalizeAttempt (Admin > Grading) completes a lesson on the learner's
-- behalf when a manually-graded quiz attempt passes, same as submitQuiz does
-- for auto-graded attempts — needs an admin write path here too.
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
  shuffle boolean not null default false,
  -- is_assessment: renders this quiz as an essay/study-case assessment instead
  -- of the normal timed quiz -- no "Start Quiz" gate, a wide multi-question
  -- layout, server-side drafts (quiz_attempts.draft_answers), and no timer.
  -- Grading stays manual (Admin > Grading), same as any essay question.
  is_assessment boolean not null default false
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  type public.question_type not null,
  prompt text not null,
  points int not null default 1,
  position int not null default 0,
  -- allow_multiple: multiple_choice questions accept >1 correct option (checkbox
  -- grading, exact-set match) instead of the default single-select radio.
  allow_multiple boolean not null default false,
  -- case_sensitive: short_answer questions grade against question_options rows
  -- (text = accepted keyword, is_correct = true) case-sensitively when set.
  case_sensitive boolean not null default false
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
  status public.quiz_attempt_status not null default 'in_progress',
  -- draft_answers: in-progress assessment responses ({ [question_id]: text }),
  -- saved via the saveDraft action so a learner can resume a study case across
  -- days before submitting. Only meaningful while status = 'in_progress';
  -- grade_attempt() ignores it and reads the answers passed to it at submit.
  draft_answers jsonb,
  unique (quiz_id, learner_id, attempt_number)
);

create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  response jsonb not null,
  is_correct boolean,
  points_awarded numeric,
  -- Set only when an admin manually grades an essay response (Admin > Grading
  -- or the CSV re-import path) — both write through the same finalizeAttempt
  -- codepath, so these are always populated together.
  graded_by uuid references public.profiles (id) on delete set null,
  graded_at timestamptz
);

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_responses enable row level security;

-- Quiz content (title, questions) is part of the public "sales page" for a
-- course, readable whenever the parent course is published — same
-- EXISTS-up-the-chain pattern as course_sections/lessons.
--
-- question_options deliberately has NO anon/authenticated read policy below
-- (RLS is row-level, not column-level, so it can't hide just is_correct) —
-- the base table is admin-only (see "admins can select question_options"
-- further down). Learner/anon option rendering instead reads the
-- public.question_options_public view (declared right after the quiz engine
-- RLS block), which never exposes is_correct. Scoring runs inside the
-- public.grade_attempt() SECURITY DEFINER function, which reads is_correct
-- with the function owner's privileges — the app-level "grading always
-- happens server-side" tradeoff this used to rely on is now enforced by the
-- database itself, closing the direct-REST-API leak.
create policy "quizzes readable for readable courses" on public.quizzes
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
    where l.id = quizzes.lesson_id and public.can_read_course(cs.course_id)
  ));

create policy "questions readable for readable courses" on public.questions
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections cs on cs.id = l.section_id
    where q.id = questions.quiz_id and public.can_read_course(cs.course_id)
  ));

-- Learner/anon rendering of option text goes through this view instead of a
-- select policy on question_options itself -- a view runs with its owner's
-- privileges, so it can read past the (now admin-only) base-table RLS while
-- only ever projecting the columns listed here. is_correct is not one of
-- them, so it is unreachable from anon/authenticated regardless of what
-- REST query a client sends.
-- short_answer questions store their accepted keyword(s) as
-- question_options rows (is_correct = true, no "wrong" options), so text
-- itself is the answer for that type -- excluded here for the same reason
-- is_correct is excluded for every type (matches the app-level scrub this
-- view replaces in lib/courses-server.ts).
create view public.question_options_public
  with (security_invoker = false) as
  select qo.id, qo.question_id, qo.text, qo.position
  from public.question_options qo
  join public.questions qu on qu.id = qo.question_id
  where qu.type <> 'short_answer'
    and exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.course_sections cs on cs.id = l.section_id
      join public.courses c on c.id = cs.course_id
      where q.id = qu.quiz_id and public.can_read_course(cs.course_id)
    );

grant select on public.question_options_public to anon, authenticated;

-- Server-side quiz grading. Runs SECURITY DEFINER (owner privileges) so it
-- can read question_options.is_correct even though the base table has no
-- anon/authenticated select policy -- this is the only place is_correct is
-- ever read on behalf of a learner. Also re-derives the course from the quiz
-- and requires an active enrollment before grading anything, so it doubles
-- as the enrollment gate for quiz submission (paired with the equivalent
-- check added to startQuiz in app/learn/[courseId]/quiz-actions.ts).
-- p_answers is a JSON object of { [question_id]: response_string }, mirroring
-- the client's QuizAnswer[] flattened by question id.
create or replace function public.grade_attempt(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_att public.quiz_attempts%rowtype;
  v_pass int;
  v_lesson uuid;
  v_course uuid;
  v_enr uuid;
  q public.questions%rowtype;
  v_resp text;
  v_ok boolean;
  v_total numeric := 0;
  v_award numeric := 0;
  v_correct int := 0;
  v_question_count int := 0;
  v_ungraded boolean := false;
  v_score numeric;
  v_passed boolean;
  v_per jsonb := '{}'::jsonb;
  v_sel text[];
  v_cor text[];
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  select * into v_att from public.quiz_attempts
    where id = p_attempt_id and learner_id = v_uid;
  if not found then
    raise exception 'Attempt not found';
  end if;
  if v_att.status <> 'in_progress' then
    raise exception 'Attempt already submitted';
  end if;

  select pass_score, lesson_id into v_pass, v_lesson
    from public.quizzes where id = v_att.quiz_id;

  select cs.course_id into v_course
    from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
    where l.id = v_lesson;

  select id into v_enr from public.enrollments
    where learner_id = v_uid and course_id = v_course;
  if v_enr is null then
    raise exception 'Not enrolled';
  end if;

  for q in select * from public.questions where quiz_id = v_att.quiz_id loop
    v_question_count := v_question_count + 1;
    v_resp := p_answers ->> q.id::text;

    if q.type = 'multiple_choice' and q.allow_multiple then
      v_sel := array(
        select trim(x) from unnest(string_to_array(coalesce(v_resp, ''), ',')) x
        where trim(x) <> ''
      );
      v_cor := array(
        select id::text from public.question_options
        where question_id = q.id and is_correct
      );
      v_ok := coalesce(array_length(v_sel, 1), 0) = coalesce(array_length(v_cor, 1), 0)
        and not exists (
          select unnest(v_sel)
          except
          select unnest(v_cor)
        );
    elsif q.type = 'multiple_choice' or q.type = 'true_false' then
      v_ok := v_resp is not null and exists (
        select 1 from public.question_options
        where question_id = q.id and id::text = v_resp and is_correct
      );
    elsif q.type = 'short_answer' and exists (
      select 1 from public.question_options where question_id = q.id and is_correct
    ) then
      v_ok := exists (
        select 1 from public.question_options o
        where o.question_id = q.id and o.is_correct
          and (
            case when q.case_sensitive
              then btrim(o.text) = btrim(coalesce(v_resp, ''))
              else lower(btrim(o.text)) = lower(btrim(coalesce(v_resp, '')))
            end
          )
      );
    else
      v_ok := null;
    end if;

    v_total := v_total + q.points;
    if v_ok is null then
      v_ungraded := true;
    elsif v_ok then
      v_award := v_award + q.points;
      v_correct := v_correct + 1;
    end if;
    v_per := v_per || jsonb_build_object(q.id::text, to_jsonb(v_ok));

    insert into public.quiz_responses (attempt_id, question_id, response, is_correct, points_awarded)
    values (
      p_attempt_id,
      q.id,
      to_jsonb(v_resp),
      v_ok,
      case when v_ok is null then null when v_ok then q.points else 0 end
    );
  end loop;

  if v_ungraded then
    update public.quiz_attempts
      set submitted_at = now(), status = 'pending_review'
      where id = p_attempt_id;

    return jsonb_build_object(
      'pending', true,
      'score', null,
      'passed', null,
      'correctCount', v_correct,
      'total', v_question_count,
      'perQuestion', v_per
    );
  end if;

  v_score := case when v_total > 0 then round(v_award / v_total * 100) else 100 end;
  v_passed := v_score >= v_pass;

  update public.quiz_attempts
    set submitted_at = now(), score = v_score, passed = v_passed, status = 'graded'
    where id = p_attempt_id;

  if v_passed then
    insert into public.lesson_progress (enrollment_id, lesson_id, completed, completed_at)
    values (v_enr, v_lesson, true, now())
    on conflict (enrollment_id, lesson_id)
    do update set completed = true, completed_at = now();
  end if;

  return jsonb_build_object(
    'pending', false,
    'score', v_score,
    'passed', v_passed,
    'correctCount', v_correct,
    'total', v_question_count,
    'perQuestion', v_per
  );
end;
$$;

revoke all on function public.grade_attempt(uuid, jsonb) from public;
grant execute on function public.grade_attempt(uuid, jsonb) to authenticated;

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

-- Admin > Grading needs to see every attempt/response awaiting review and
-- write the manual essay grade (quiz_responses) plus the recomputed
-- score/passed/status (quiz_attempts) once finalizeAttempt runs. Scoped to
-- the admin's own courses via owns_course() (superadmin: every course).
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

-- question_options is deliberately not granted here -- anon/authenticated
-- read option text only via question_options_public (granted above); the
-- base table stays admin-only (grant further down, paired with is_admin()
-- policies).
grant select on public.quizzes, public.questions to anon, authenticated;
grant select, insert, update on public.quiz_attempts to authenticated;
grant select, insert, update on public.quiz_responses to authenticated;

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
-- Scoped by owns_course(course_id): the course the prerequisite is being
-- attached to must be owned by the acting admin (the prerequisite_course_id
-- being referenced can belong to any admin — it's just a pointer).
create policy "admins can select course_prerequisites" on public.course_prerequisites
  for select to authenticated
  using (public.owns_course(course_id));

create policy "admins can insert course_prerequisites" on public.course_prerequisites
  for insert to authenticated
  with check (public.owns_course(course_id));

create policy "admins can delete course_prerequisites" on public.course_prerequisites
  for delete to authenticated
  using (public.owns_course(course_id));

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

grant select, insert, delete on public.course_prerequisites to authenticated;
grant select, insert, update, delete on public.course_certificate_settings to authenticated;

-- Learners need to read a course's certificate settings to render/compose a
-- certificate on completion (checkAndIssueCertificate, lib/certificates.ts) --
-- same published-course gate as lessons/quizzes below, not enrollment-scoped
-- (the settings themselves aren't sensitive, just authoring content).
create policy "certificate settings readable for readable courses" on public.course_certificate_settings
  for select to authenticated
  using (public.can_read_course(course_certificate_settings.course_id));

-- =============================================================================
-- 8b. Certificates (issued)
-- =============================================================================
--
-- Issued once a learner has completed every lesson in a course AND passed
-- every quiz-type lesson (checkAndIssueCertificate, lib/certificates.ts).
-- Generation runs under the learner's own session (auto-triggered from the
-- learn player) or an admin's session (triggered via manual essay grading in
-- Admin > Grading) -- there's no service-role client in this project, so RLS
-- has to allow both paths rather than a single privileged writer.

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments (id) on delete cascade,
  serial text not null unique,
  issued_at timestamptz not null default now(),
  pdf_url text
);

alter table public.certificates enable row level security;

create policy "own certificates readable" on public.certificates
  for select
  to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = certificates.enrollment_id and e.learner_id = (select auth.uid())
  ));

create policy "own certificates insertable" on public.certificates
  for insert
  to authenticated
  with check (exists (
    select 1 from public.enrollments e
    where e.id = certificates.enrollment_id and e.learner_id = (select auth.uid())
  ));

-- Update (not just insert) is needed so the PDF-upload step can write
-- pdf_url back onto the row after the initial insert.
create policy "own certificates updatable" on public.certificates
  for update
  to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = certificates.enrollment_id and e.learner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.enrollments e
    where e.id = certificates.enrollment_id and e.learner_id = (select auth.uid())
  ));

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

grant select, insert, update on public.certificates to authenticated;

-- enrollments had no update policy until now -- status/completed_at were
-- never written anywhere (see comment on the enrollments table above).
-- checkAndIssueCertificate needs to flip status to 'completed' from both the
-- learner's own session and an admin's (manual essay grading), so both paths
-- get a policy here.
create policy "own enrollments updatable" on public.enrollments
  for update
  to authenticated
  using ((select auth.uid()) = learner_id)
  with check ((select auth.uid()) = learner_id);

create policy "admins update enrollments" on public.enrollments
  for update to authenticated
  using (public.owns_course(course_id))
  with check (public.owns_course(course_id));

grant update on public.enrollments to authenticated;

-- =============================================================================
-- 9. Admin course-authoring write access
-- =============================================================================
--
-- Every table above only had a select-where-published-style read policy (or,
-- for join tables, no write policy at all) — nobody, including an admin,
-- could write a course through the app without these. Gated by owns_course()
-- (courses/course_sections/lessons/resources/quizzes/questions/
-- question_options/course_instructors/course_prerequisites/
-- course_certificate_settings) rather than a flat is_admin() check, so each
-- admin only sees/edits courses they created; superadmin owns every course
-- (see owns_course() definition in section 2). instructors itself (the
-- shared bio directory, not course-specific) stays is_admin()-gated —
-- multiple admins' courses can reference the same instructor.
-- Also rather than the JWT app_metadata.role claim (unverified whether the
-- custom access token hook is enabled in a given environment) or a
-- service-role client (none configured in this project).

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
  using (public.owns_course(course_id));

create policy "admins can insert course_instructors" on public.course_instructors
  for insert to authenticated
  with check (public.owns_course(course_id));

create policy "admins can delete course_instructors" on public.course_instructors
  for delete to authenticated
  using (public.owns_course(course_id));

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

-- Generated certificate PDFs live in the same bucket, under
-- certificates/{learner_id}/{enrollment_id}.pdf (checkAndIssueCertificate,
-- lib/certificates.ts). Admin uploads are already covered by the
-- bucket-wide is_admin() policies above; this adds the learner-owned path so
-- the auto-issue flow can upload under the learner's own session too, since
-- there's no service-role client in this project.
create policy "learners can upload own certificate pdfs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'certificate-assets'
    and (storage.foldername(name))[1] = 'certificates'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "learners can update own certificate pdfs" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'certificate-assets'
    and (storage.foldername(name))[1] = 'certificates'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'certificate-assets'
    and (storage.foldername(name))[1] = 'certificates'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- Lesson content images: Tiptap uploads from the rich text lesson/quiz editor
-- (toolbar button, paste, and drag-and-drop). Same public-read / admin-write
-- shape as the two buckets above.
insert into storage.buckets (id, name, public)
values ('lesson-content', 'lesson-content', true)
on conflict (id) do nothing;

create policy "public can read lesson content" on storage.objects
  for select to public
  using (bucket_id = 'lesson-content');

create policy "admins can upload lesson content" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lesson-content' and public.is_admin());

create policy "admins can update lesson content" on storage.objects
  for update to authenticated
  using (bucket_id = 'lesson-content' and public.is_admin())
  with check (bucket_id = 'lesson-content' and public.is_admin());

create policy "admins can delete lesson content" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lesson-content' and public.is_admin());

-- Note: file_upload quiz questions used to have learners upload a PDF into a
-- private `quiz-submissions` bucket here; they now submit a plain link
-- instead (quiz_responses.response is an untyped jsonb string, so no schema
-- change was needed), so that bucket + its policies are no longer created.
-- See supabase/migrations/20260804010000_drop_quiz_submissions_bucket.sql for
-- the incremental removal from an already-provisioned database.

-- =============================================================================
-- 11. Public landing page content (superadmin-authored)
-- =============================================================================
--
-- Replaces the earlier PayloadCMS-backed landing global: the public "/"
-- page's hero + feature cards are now editable in-app at /admin/landing,
-- superadmin-only, and stored here as a single-row table (there is only ever
-- one landing page).
--
-- is_superadmin() is defined in section 2 (near is_admin()), not here, since
-- owns_course() in section 3 needs it before this section is reached.

-- `id` is fixed to `true` so the check constraint enforces a single row.
create table public.landing_content (
  id boolean primary key default true check (id),
  heading text not null,
  highlight_word text not null,
  subheading text not null,
  primary_cta_text text not null,
  primary_cta_href text not null,
  features jsonb not null default '[]',
  featured_course_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.landing_content enable row level security;

-- Public read — the "/" page renders this with the anon key, same as
-- published courses.
create policy "public can read landing content" on public.landing_content
  for select to anon, authenticated
  using (true);

create policy "superadmins can insert landing content" on public.landing_content
  for insert to authenticated
  with check (public.is_superadmin());

create policy "superadmins can update landing content" on public.landing_content
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

grant select, insert, update on public.landing_content to anon, authenticated;

-- Seed the single row with the same copy app/page.tsx previously used as its
-- hardcoded fallback, so the public page has real content from the start.
insert into public.landing_content (
  id, heading, highlight_word, subheading, primary_cta_text, primary_cta_href, features
)
values (
  true,
  'Learn. Grow.',
  'Succeed.',
  'Transform your life through knowledge with Sanggabiz. Access world-class courses designed to help you achieve your goals and unlock your potential.',
  'Start Your Journey',
  '/auth/login',
  '[
    {"icon": "graduation-cap", "title": "Expert-Led Courses", "description": "Learn from industry professionals and academic experts with years of experience."},
    {"icon": "layers", "title": "Flexible Learning", "description": "Study at your own pace with lifetime access to course materials and updates."},
    {"icon": "award", "title": "Certified Learning", "description": "Earn recognized certificates upon course completion to showcase your achievements."}
  ]'::jsonb
)
on conflict (id) do nothing;

-- =============================================================================
-- 12. In-app notifications
-- =============================================================================
--
-- The learner needs to find out when an admin enrolls them in a course --
-- particularly a private one, which they can't discover by browsing. In-app
-- only (a bell in the learner header): there is no email provider in this
-- project yet, so profiles.notification_email_enabled stays decorative until
-- there is one.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 'enrollment' is the only kind today; text rather than an enum so adding a
  -- kind later doesn't need a migration.
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
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Own-row read, and own-row update so the bell can mark rows read. There is
-- deliberately NO insert policy and no delete policy: rows are created only by
-- the trigger below, never directly by a client -- the same arrangement as
-- public.profiles, whose rows only ever come from handle_new_user().
create policy "own notifications readable" on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "own notifications updatable" on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, update on public.notifications to authenticated;

-- A trigger rather than app code, because there are already three ways an
-- enrollment row appears -- toggleLearnerEnrollmentAction (the learner-centric
-- EnrollModal), enrollLearnerAction (the course-centric Learners tab), and the
-- learner's own `enroll` action -- and a trigger covers all of them at once
-- with no way to add a fourth path and forget the notification.
--
-- security definer: it writes a row belonging to a DIFFERENT user than the
-- caller (the admin is acting on the learner's behalf), which no RLS policy on
-- notifications permits.
--
-- AFTER INSERT only. enrollLearnerInCourse upserts with
-- onConflict: "learner_id,course_id", so re-enrolling an existing learner is an
-- UPDATE and correctly produces no second notification.
create function public.notify_on_enrollment()
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

create trigger on_enrollment_created
  after insert on public.enrollments
  for each row
  execute function public.notify_on_enrollment();

-- =============================================================================
-- 13. Pagination support: indexes, flattening views, aggregate RPCs
-- =============================================================================
--
-- Every admin list (courses, learners, purchases, tracking, grading) fetches
-- 100% of matching rows and filters/paginates in JS by default. This section
-- adds what's needed to do it in Postgres instead: missing indexes, three
-- "flattening" views (PostgREST can't OR-filter across two different
-- embedded relations, e.g. search learner name OR course title), and
-- aggregate RPCs (PostgREST aggregates are disabled by default on Supabase).

create extension if not exists pg_trgm with schema extensions;

create index courses_created_by_created_at_idx on public.courses (created_by, created_at desc);
create index courses_status_idx on public.courses (status);
create index courses_title_trgm_idx on public.courses using gin (title extensions.gin_trgm_ops);

create index enrollments_course_id_idx on public.enrollments (course_id);
create index enrollments_enrolled_at_idx on public.enrollments (enrolled_at desc);
create index enrollments_status_idx on public.enrollments (status);

create index transactions_created_at_idx on public.transactions (created_at desc);
create index transactions_status_idx on public.transactions (status);

create index course_sections_course_id_idx on public.course_sections (course_id);
create index lessons_section_id_idx on public.lessons (section_id);
create index quizzes_lesson_id_idx on public.quizzes (lesson_id);

create index lesson_progress_enrollment_done_idx
  on public.lesson_progress (enrollment_id) where completed;
create index quiz_attempts_status_submitted_idx
  on public.quiz_attempts (status, submitted_at desc);
create index quiz_attempts_learner_quiz_idx on public.quiz_attempts (learner_id, quiz_id);
create index quiz_responses_attempt_id_idx on public.quiz_responses (attempt_id);

create index profiles_full_name_trgm_idx on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index profiles_email_trgm_idx on public.profiles using gin (email extensions.gin_trgm_ops);

-- app-layer search (via .ilike()/.or()) is sanitized by escapeForOrFilter()
-- (lib/pagination.ts); RPC arguments bypass that path, so RPC bodies below
-- use this to escape ILIKE wildcards instead.
create function public.like_escape(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(coalesce(p, ''), '\', '\\'), '%', '\%'), '_', '\_');
$$;

grant execute on function public.like_escape(text) to authenticated;

-- IMPORTANT: security_invoker = true on every view below -- unlike
-- question_options_public (section 7), which deliberately bypasses RLS.
-- Copying that pattern here would expose every admin's learners/purchases/
-- attempts to every other admin, with no service-role key to fall back on.
-- Granted to `authenticated` only, never `anon`: all three touch
-- `enrollments` and/or `quiz_attempts`, which are authenticated-only tables.

create view public.admin_transactions_list
with (security_invoker = true) as
select
  t.id,
  t.course_id,
  t.learner_id,
  t.amount,
  t.currency,
  t.status,
  t.created_at,
  coalesce(c.title, 'Untitled course') as course_title,
  c.created_by as course_created_by,
  coalesce(nullif(p.full_name, ''), p.email, 'Unnamed learner') as learner_name,
  coalesce(p.email, '') as learner_email
from public.transactions t
left join public.courses c on c.id = t.course_id
left join public.profiles p on p.id = t.learner_id;

grant select on public.admin_transactions_list to authenticated;

-- Pre-aggregated per enrollment, replacing the app-layer's 6-query
-- .in()-fan-out + JS percentage math. The lesson-total and quiz-total
-- lateral subqueries are deliberately separate: a single `left join quizzes`
-- would multiply lesson rows whenever a lesson has more than one quiz.
create view public.admin_tracking_enrollments
with (security_invoker = true) as
select
  e.id as enrollment_id,
  e.enrolled_at,
  e.status,
  e.learner_id,
  e.course_id,
  coalesce(c.title, 'Untitled course') as course_title,
  c.created_by as course_created_by,
  coalesce(nullif(p.full_name, ''), p.email, 'Unnamed learner') as learner_name,
  coalesce(p.email, '') as learner_email,
  case when tl.total_lessons = 0 then 0
       else round(100.0 * pr.done_lessons / tl.total_lessons)::int end as module_pct,
  case when tq.total_quizzes = 0 then 0
       else round(100.0 * qd.done_quizzes / tq.total_quizzes)::int end as assignment_pct
from public.enrollments e
join public.courses c on c.id = e.course_id
join public.profiles p on p.id = e.learner_id
cross join lateral (
  select count(*)::int as total_lessons
  from public.course_sections cs
  join public.lessons l on l.section_id = cs.id
  where cs.course_id = e.course_id
) tl
cross join lateral (
  select count(distinct q.id)::int as total_quizzes
  from public.course_sections cs
  join public.lessons l on l.section_id = cs.id
  join public.quizzes q on q.lesson_id = l.id
  where cs.course_id = e.course_id
) tq
cross join lateral (
  select count(*)::int as done_lessons
  from public.lesson_progress lp
  where lp.enrollment_id = e.id and lp.completed
) pr
cross join lateral (
  select count(distinct q.id)::int as done_quizzes
  from public.course_sections cs
  join public.lessons l on l.section_id = cs.id
  join public.quizzes q on q.lesson_id = l.id
  join public.quiz_attempts qa
    on qa.quiz_id = q.id and qa.learner_id = e.learner_id and qa.submitted_at is not null
  where cs.course_id = e.course_id
) qd;

grant select on public.admin_tracking_enrollments to authenticated;

-- Flat source for every level (course/quiz/attempt) of pending manual-grading
-- review. Replaces listPendingAttempts()'s deep embed + JS-side ownership
-- post-filter, which otherwise returns platform-wide rows to a scoped admin.
create view public.admin_pending_attempts
with (security_invoker = true) as
select
  qa.id as attempt_id,
  qa.submitted_at,
  q.id as quiz_id,
  q.title as quiz_title,
  l.id as lesson_id,
  l.title as lesson_title,
  cs.title as section_title,
  c.id as course_id,
  c.title as course_title,
  c.created_by as course_created_by,
  p.id as learner_id,
  coalesce(nullif(p.full_name, ''), p.email, 'Unknown learner') as learner_name,
  coalesce(p.email, '') as learner_email,
  (
    select count(*)::int from public.quiz_responses r
    where r.attempt_id = qa.id and r.is_correct is null
  ) as pending_count
from public.quiz_attempts qa
join public.quizzes q on q.id = qa.quiz_id
join public.lessons l on l.id = q.lesson_id
join public.course_sections cs on cs.id = l.section_id
join public.courses c on c.id = cs.course_id
join public.profiles p on p.id = qa.learner_id and p.role = 'learner'
where qa.status = 'pending_review';

grant select on public.admin_pending_attempts to authenticated;

-- Aggregation removes the course_id column the app-layer owner filter
-- (getOwnedCourseIdsOrNull()'s .in("course_id", ids)) relies on, so each
-- function below re-applies "created_by = auth.uid() or is_superadmin()"
-- directly in SQL. All `security invoker`: they must run as the calling
-- admin so ownership scoping stays correct with no service-role key
-- involved. Every paging function ends its ORDER BY with a unique tiebreak
-- column so a row can never appear on two different pages.

create function public.admin_learner_page(
  p_q text default '',
  p_filter text default 'all',
  p_sort text default 'name',
  p_dir text default 'asc',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  learner_id uuid,
  name text,
  email text,
  enrolled_count bigint,
  completed_count bigint,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as (
    select e.learner_id, e.status
    from public.enrollments e
    join public.courses c on c.id = e.course_id
    where c.created_by = (select auth.uid()) or public.is_superadmin()
  ),
  agg as (
    select
      s.learner_id,
      coalesce(nullif(pr.full_name, ''), pr.email, 'Unnamed learner') as name,
      coalesce(pr.email, '') as email,
      count(*) as enrolled_count,
      count(*) filter (where s.status = 'completed') as completed_count
    from scoped s
    join public.profiles pr on pr.id = s.learner_id and pr.role = 'learner'
    group by s.learner_id, pr.full_name, pr.email
  ),
  filtered as (
    select * from agg
    where (
      coalesce(p_q, '') = ''
      or name ilike '%' || public.like_escape(p_q) || '%' escape '\'
      or email ilike '%' || public.like_escape(p_q) || '%' escape '\'
    )
    and (p_filter <> 'enrolled' or enrolled_count > 0)
    and (p_filter <> 'completed' or completed_count > 0)
  )
  select
    f.learner_id, f.name, f.email, f.enrolled_count, f.completed_count,
    count(*) over () as total_count
  from filtered f
  order by
    case when p_sort = 'name' and p_dir = 'asc' then f.name end asc nulls last,
    case when p_sort = 'name' and p_dir = 'desc' then f.name end desc nulls last,
    case when p_sort = 'enrolled' and p_dir = 'desc' then f.enrolled_count end desc,
    case when p_sort = 'enrolled' and p_dir = 'asc' then f.enrolled_count end asc,
    f.learner_id
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.admin_learner_page(text, text, text, text, int, int) to authenticated;

create function public.admin_learner_stats()
returns table (total_learners bigint, total_enrollments bigint, total_completed bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(distinct e.learner_id),
    count(*),
    count(*) filter (where e.status = 'completed')
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  join public.profiles pr on pr.id = e.learner_id and pr.role = 'learner'
  where c.created_by = (select auth.uid()) or public.is_superadmin();
$$;

grant execute on function public.admin_learner_stats() to authenticated;

create function public.admin_purchase_stats()
returns table (total_revenue numeric, total_purchases bigint, paid_purchases bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(t.amount) filter (where t.status = 'completed'), 0),
    count(*),
    count(*) filter (where t.status = 'completed')
  from public.transactions t
  join public.courses c on c.id = t.course_id
  where c.created_by = (select auth.uid()) or public.is_superadmin();
$$;

grant execute on function public.admin_purchase_stats() to authenticated;

create function public.admin_tracking_stats()
returns table (total_enrollments bigint, avg_module_pct int)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*),
    coalesce(round(avg(v.module_pct)), 0)::int
  from public.admin_tracking_enrollments v
  where v.course_created_by = (select auth.uid()) or public.is_superadmin();
$$;

grant execute on function public.admin_tracking_stats() to authenticated;

create function public.admin_grading_courses(
  p_q text default '',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  course_id uuid,
  course_title text,
  quiz_count bigint,
  learner_count bigint,
  attempt_count bigint,
  oldest_submitted_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with g as (
    select
      a.course_id,
      a.course_title,
      count(distinct a.quiz_id) as quiz_count,
      count(distinct a.learner_id) as learner_count,
      count(*) as attempt_count,
      min(a.submitted_at) as oldest_submitted_at
    from public.admin_pending_attempts a
    where (a.course_created_by = (select auth.uid()) or public.is_superadmin())
      and (coalesce(p_q, '') = '' or a.course_title ilike '%' || public.like_escape(p_q) || '%' escape '\')
    group by a.course_id, a.course_title
  )
  select g.*, count(*) over () as total_count
  from g
  order by g.course_title, g.course_id
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.admin_grading_courses(text, int, int) to authenticated;

create function public.admin_grading_quizzes(
  p_course_id uuid,
  p_q text default '',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  quiz_id uuid,
  quiz_title text,
  lesson_title text,
  section_title text,
  attempt_count bigint,
  pending_response_count bigint,
  oldest_submitted_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with g as (
    select
      a.quiz_id,
      a.quiz_title,
      min(a.lesson_title) as lesson_title,
      min(a.section_title) as section_title,
      count(*) as attempt_count,
      sum(a.pending_count) as pending_response_count,
      min(a.submitted_at) as oldest_submitted_at
    from public.admin_pending_attempts a
    where a.course_id = p_course_id
      and (a.course_created_by = (select auth.uid()) or public.is_superadmin())
      and (
        coalesce(p_q, '') = ''
        or a.quiz_title ilike '%' || public.like_escape(p_q) || '%' escape '\'
        or a.lesson_title ilike '%' || public.like_escape(p_q) || '%' escape '\'
      )
    group by a.quiz_id, a.quiz_title
  )
  select g.*, count(*) over () as total_count
  from g
  order by g.quiz_title, g.quiz_id
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.admin_grading_quizzes(uuid, text, int, int) to authenticated;

create function public.admin_grading_stats()
returns table (attempt_count bigint, course_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*), count(distinct a.course_id)
  from public.admin_pending_attempts a
  where a.course_created_by = (select auth.uid()) or public.is_superadmin();
$$;

grant execute on function public.admin_grading_stats() to authenticated;
