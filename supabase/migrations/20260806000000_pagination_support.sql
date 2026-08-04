-- =============================================================================
-- Pagination support: indexes, flattening views, aggregate RPCs
-- =============================================================================
--
-- Run this once in the Supabase Dashboard SQL Editor, AFTER
-- 20260805000000_notifications.sql. databaseSetup.sql (the consolidated
-- from-scratch script) has already been updated with the equivalent objects
-- for future fresh setups -- this script applies the same change
-- incrementally.
--
-- Scope: every admin list (courses, learners, purchases, tracking, grading)
-- today fetches 100% of matching rows and filters/paginates in JS. This adds
-- what's needed to do it in Postgres instead: missing indexes, three
-- "flattening" views (PostgREST can't OR-filter across two different
-- embedded relations, e.g. search learner name OR course title), and
-- aggregate RPCs (PostgREST aggregates are disabled by default on Supabase).
--
-- All statements are written to be rerunnable.

-- -----------------------------------------------------------------------------
-- 1. Indexes
-- -----------------------------------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

-- courses: created_by/status/created_at are the scoping + sort columns for
-- every admin course query; title needs trigram search for ILIKE '%term%'.
create index if not exists courses_created_by_created_at_idx
  on public.courses (created_by, created_at desc);
create index if not exists courses_status_idx on public.courses (status);
create index if not exists courses_title_trgm_idx
  on public.courses using gin (title extensions.gin_trgm_ops);

-- enrollments: unique(learner_id, course_id) already covers a learner_id
-- prefix scan, but course_id alone -- what every admin scoping query filters
-- on -- has no index at all.
create index if not exists enrollments_course_id_idx on public.enrollments (course_id);
create index if not exists enrollments_enrolled_at_idx on public.enrollments (enrolled_at desc);
create index if not exists enrollments_status_idx on public.enrollments (status);

-- transactions: course_id/learner_id already indexed (databaseSetup.sql:573-574).
create index if not exists transactions_created_at_idx on public.transactions (created_at desc);
create index if not exists transactions_status_idx on public.transactions (status);

-- curriculum fan-out, used by the tracking view's lateral subqueries.
create index if not exists course_sections_course_id_idx on public.course_sections (course_id);
create index if not exists lessons_section_id_idx on public.lessons (section_id);
create index if not exists quizzes_lesson_id_idx on public.quizzes (lesson_id);

-- progress / attempts.
create index if not exists lesson_progress_enrollment_done_idx
  on public.lesson_progress (enrollment_id) where completed;
create index if not exists quiz_attempts_status_submitted_idx
  on public.quiz_attempts (status, submitted_at desc);
create index if not exists quiz_attempts_learner_quiz_idx
  on public.quiz_attempts (learner_id, quiz_id);
create index if not exists quiz_responses_attempt_id_idx
  on public.quiz_responses (attempt_id);

-- profiles: trigram search for the learner name/email search boxes.
create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index if not exists profiles_email_trgm_idx
  on public.profiles using gin (email extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 2. LIKE-escape helper
-- -----------------------------------------------------------------------------
--
-- app-layer search (via .ilike()/.or()) is sanitized by escapeForOrFilter()
-- (lib/pagination.ts), which strips characters that would break PostgREST's
-- filter syntax. RPC arguments bypass that path entirely -- this mirrors just
-- the ILIKE-wildcard-escaping part for use inside function bodies.
create or replace function public.like_escape(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(coalesce(p, ''), '\', '\\'), '%', '\%'), '_', '\_');
$$;

grant execute on function public.like_escape(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Flattening views
-- -----------------------------------------------------------------------------
--
-- IMPORTANT: security_invoker = true on every view below. The one existing
-- view in this schema, question_options_public, deliberately uses the
-- DEFAULT security_invoker = false because it needs to bypass RLS for
-- anon/authenticated alike. Copying that pattern here would run these views
-- as the view owner and expose every admin's learners/purchases/attempts to
-- every other admin -- and there is no service-role key in this project to
-- fall back on if that ever needs undoing. Do not drop this option when
-- editing these views.
--
-- Granted to `authenticated` only, never `anon`: all three touch
-- `enrollments` and/or `quiz_attempts`, which are authenticated-only tables.
-- An anon-reachable path through either breaks the public landing page (see
-- the can_read_course() note in CLAUDE.md for the same failure mode).

-- Purchases, flattened for search across learner name/email OR course title.
create or replace view public.admin_transactions_list
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

-- Online Tracking, flattened + pre-aggregated per enrollment. Replaces the
-- app-layer's 6-query .in()-fan-out + JS percentage math (lib/tracking-server.ts).
--
-- The lesson-total and quiz-total lateral subqueries are deliberately
-- SEPARATE from each other: a single `left join quizzes` would multiply
-- lesson rows whenever a lesson has more than one quiz, inflating
-- total_lessons. count(distinct q.id) for "done quizzes" mirrors the
-- existing JS semantics of "distinct quizzes with a submitted attempt".
create or replace view public.admin_tracking_enrollments
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

-- Grading: flat source for every level (course/quiz/attempt) of pending
-- manual-grading review. Replaces listPendingAttempts()'s deep embed +
-- JS-side ownership post-filter, which today returns platform-wide rows to
-- the client even for a scoped admin (lib/grading-server.ts:40-72).
create or replace view public.admin_pending_attempts
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
join public.profiles p on p.id = qa.learner_id
where qa.status = 'pending_review';

grant select on public.admin_pending_attempts to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Aggregate RPCs
-- -----------------------------------------------------------------------------
--
-- Aggregation removes the course_id column the app-layer owner filter
-- (getOwnedCourseIdsOrNull()'s .in("course_id", ids)) relies on, so each
-- function re-applies the same "created_by = auth.uid() or is_superadmin()"
-- check directly in SQL -- the ownership guard moves into the function
-- instead of disappearing. All `security invoker` (never definer): they must
-- run as the calling admin so RLS/ownership stays correct with no
-- service-role key involved.
--
-- Every paging function ends its ORDER BY with a unique tiebreak column
-- (learner_id / course_id / quiz_id) so a row can never appear on two
-- different pages, and returns count(*) over () as total_count so the
-- caller gets rows + total in a single round trip.

create or replace function public.admin_learner_page(
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
    join public.profiles pr on pr.id = s.learner_id
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

create or replace function public.admin_learner_stats()
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
  where c.created_by = (select auth.uid()) or public.is_superadmin();
$$;

grant execute on function public.admin_learner_stats() to authenticated;

create or replace function public.admin_purchase_stats()
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

create or replace function public.admin_tracking_stats()
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

create or replace function public.admin_grading_courses(
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

create or replace function public.admin_grading_quizzes(
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

create or replace function public.admin_grading_stats()
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
