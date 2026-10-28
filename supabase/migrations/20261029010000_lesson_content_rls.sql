-- Lesson content visible to enrolled learners only (v2) + security review fixes.
--
-- Mirrored in databaseSetup.sql: the changed definitions are updated in place
-- (sections 2, 3, 5, 6, 7, 10) and the brand-new objects live in section 17.
-- Idempotent and safe on live data: only policies, grants, functions, views
-- and triggers change -- no table, column or row is dropped.
--
-- 1. Lesson content (lessons/resources/questions + question_options_public)
--    is readable only by learners enrolled in the course and by admins who
--    own it. Before this, every published public course's full lesson
--    content, video URLs, resource file URLs and quiz prompts were readable
--    by anon through the REST API; the player only gated at page level.
--    The public curriculum (the course "sales page") is served by the new
--    lessons_public view, which projects only non-content columns.
-- 2. profiles: a user could PATCH their own `role` to superadmin (the own-row
--    update policy checks only the row, and Supabase grants UPDATE on every
--    column by default). UPDATE is now granted on full_name and
--    notification_email_enabled only.
-- 3. quiz_attempts: learners could insert/update their own attempts with any
--    score/passed/status (forging a passed quiz, unlocking explanations, or
--    bypassing the attempt cap and the enrollment check). A trigger now only
--    lets learners open an in_progress attempt in a course they are enrolled
--    in (within the attempt cap) and change draft_answers while it is open;
--    scoring stays inside grade_attempt() (security definer).
-- 4. quiz_responses: the learner insert policy is dropped -- grade_attempt()
--    writes responses itself, and finalizeAttempt sums points_awarded over
--    every response row, so a pre-inserted row could inflate a manual grade.
-- 5. enrollments: a learner could UPDATE their enrollment's course_id to any
--    course (including a private one) and gain access to it. learner_id and
--    course_id are now immutable for app roles.
-- 6. transactions: a learner could insert arbitrary purchase rows (any
--    amount/status) for any course. The insert must now match an own
--    enrollment and the course's price.
-- 7. storage: the public buckets had a SELECT policy for everyone, which
--    allows anonymous LISTING of every object (e.g. every learner's
--    certificate PDF path). Public URLs keep working without it, so SELECT is
--    narrowed to admins (+ a learner's own certificate folder, needed by the
--    upsert in checkAndIssueCertificate).
-- 8. Housekeeping: internal helpers are no longer executable by anon.

-- -----------------------------------------------------------------------------
-- 1. Lesson content
-- -----------------------------------------------------------------------------

-- Content-level access, stricter than can_read_course() (which also admits
-- anyone for a published public course): the caller owns the course
-- (superadmin: every course), or the course is readable AND the caller is
-- enrolled in it. security definer for the same reasons as can_read_course().
create or replace function public.can_read_course_content(cid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select public.owns_course(cid)
    or (
      public.can_read_course(cid)
      and exists (
        select 1 from public.enrollments e
        where e.course_id = cid and e.learner_id = (select auth.uid())
      )
    );
$$;

revoke execute on function public.can_read_course_content(uuid) from public, anon;
grant execute on function public.can_read_course_content(uuid) to authenticated;

drop policy if exists "lessons readable for readable courses" on public.lessons;
drop policy if exists "lessons readable for enrolled learners" on public.lessons;
create policy "lessons readable for enrolled learners" on public.lessons
  for select
  to authenticated
  using (exists (
    select 1 from public.course_sections s
    where s.id = lessons.section_id and public.can_read_course_content(s.course_id)
  ));

drop policy if exists "resources readable for readable courses" on public.resources;
drop policy if exists "resources readable for enrolled learners" on public.resources;
create policy "resources readable for enrolled learners" on public.resources
  for select
  to authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    where l.id = resources.lesson_id and public.can_read_course_content(s.course_id)
  ));

-- Quiz prompts get the same treatment: the curriculum only needs the lesson
-- (title/type), and a prompt is the assessment itself -- reading every
-- question before enrolling defeats the quiz. quizzes rows (title,
-- pass_score, limits) stay readable with the course; they reveal nothing.
drop policy if exists "questions readable for readable courses" on public.questions;
drop policy if exists "questions readable for enrolled learners" on public.questions;
create policy "questions readable for enrolled learners" on public.questions
  for select
  to authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_sections cs on cs.id = l.section_id
    where q.id = questions.quiz_id and public.can_read_course_content(cs.course_id)
  ));

-- Same view as before (same columns, still owner-privileged so it can read
-- past the admin-only question_options RLS), now gated on content access.
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
      where q.id = qu.quiz_id and public.can_read_course_content(cs.course_id)
    );

revoke all on public.question_options_public from anon, authenticated;
grant select on public.question_options_public to anon, authenticated;

-- Public curriculum: what the course "sales page" shows before enrolling.
-- Deliberately security_invoker = false, like question_options_public: it has
-- to read past the (now enrollment-gated) lessons RLS, and it is safe because
-- it projects ONLY non-content columns (no video_url, no content, no resource
-- URLs) and re-applies can_read_course(), so draft and private courses stay
-- exactly as hidden as they are on public.courses.
create or replace view public.lessons_public
  with (security_invoker = false) as
  select
    l.id,
    l.section_id,
    s.course_id,
    l.title,
    l.position,
    l.content_type,
    l.duration_seconds,
    (select count(*)::int from public.resources r where r.lesson_id = l.id) as resource_count
  from public.lessons l
  join public.course_sections s on s.id = l.section_id
  where public.can_read_course(s.course_id);

revoke all on public.lessons_public from anon, authenticated;
grant select on public.lessons_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. profiles: no self-service role change
-- -----------------------------------------------------------------------------

revoke update on public.profiles from anon, authenticated;
grant update (full_name, notification_email_enabled) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- 3. quiz_attempts: learners cannot write their own grades
-- -----------------------------------------------------------------------------

create or replace function public.quiz_course_id(qid uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select cs.course_id
  from public.quizzes q
  join public.lessons l on l.id = q.lesson_id
  join public.course_sections cs on cs.id = l.section_id
  where q.id = qid;
$$;

revoke execute on function public.quiz_course_id(uuid) from public, anon;
grant execute on function public.quiz_course_id(uuid) to authenticated;

-- security INVOKER on purpose: current_user is then the role that ran the
-- statement. A learner's REST call runs as `authenticated`; grade_attempt()
-- (security definer) runs its own UPDATE as the function owner, so the
-- scoring path is unaffected. Admins who own the course (finalizeAttempt)
-- are let through too.
create or replace function public.guard_quiz_attempt_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_course uuid;
  v_quiz record;
  v_used int;
  v_max int;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  v_course := public.quiz_course_id(new.quiz_id);
  if v_course is not null and public.owns_course(v_course) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'in_progress'
      or new.submitted_at is not null
      or new.score is not null
      or new.passed is not null then
      raise exception 'A quiz attempt must start in progress' using errcode = '42501';
    end if;

    if v_course is null or not public.can_read_course_content(v_course) then
      raise exception 'Not enrolled' using errcode = '42501';
    end if;

    -- Mirrors the app-level cap (REGULAR_QUIZ_MAX_ATTEMPTS = 3 in
    -- lib/courses.ts for normal quizzes; quizzes.max_attempts, null =
    -- unlimited, for study cases) so it can't be bypassed over REST.
    select q.is_assessment, q.max_attempts into v_quiz
      from public.quizzes q where q.id = new.quiz_id;
    v_max := case when v_quiz.is_assessment then v_quiz.max_attempts else 3 end;
    if v_max is not null then
      select count(*) into v_used from public.quiz_attempts a
        where a.quiz_id = new.quiz_id and a.learner_id = new.learner_id;
      if v_used >= v_max then
        raise exception 'No attempts remaining' using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  -- UPDATE: only draft_answers on an attempt that is still open.
  if old.status <> 'in_progress' then
    raise exception 'Attempt already submitted' using errcode = '42501';
  end if;
  if (new.id, new.quiz_id, new.learner_id, new.attempt_number, new.started_at,
      new.submitted_at, new.score, new.passed, new.status)
     is distinct from
     (old.id, old.quiz_id, old.learner_id, old.attempt_number, old.started_at,
      old.submitted_at, old.score, old.passed, old.status) then
    raise exception 'Only draft answers can be changed' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_quiz_attempt_write on public.quiz_attempts;
create trigger guard_quiz_attempt_write
  before insert or update on public.quiz_attempts
  for each row
  execute function public.guard_quiz_attempt_write();

-- -----------------------------------------------------------------------------
-- 4. quiz_responses: written by grade_attempt() only
-- -----------------------------------------------------------------------------

drop policy if exists "own quiz responses insertable" on public.quiz_responses;

-- -----------------------------------------------------------------------------
-- 5. enrollments: learner_id / course_id are immutable
-- -----------------------------------------------------------------------------

create or replace function public.guard_enrollment_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (new.learner_id is distinct from old.learner_id
          or new.course_id is distinct from old.course_id) then
    raise exception 'An enrollment cannot be moved to another learner or course'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_enrollment_update on public.enrollments;
create trigger guard_enrollment_update
  before update on public.enrollments
  for each row
  execute function public.guard_enrollment_update();

-- -----------------------------------------------------------------------------
-- 6. transactions: a learner's own row must match an own enrollment + price
-- -----------------------------------------------------------------------------

drop policy if exists "own transactions insertable" on public.transactions;
create policy "own transactions insertable" on public.transactions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = learner_id
    and gateway is null
    and exists (
      select 1 from public.enrollments e
      where e.id = transactions.enrollment_id
        and e.learner_id = (select auth.uid())
        and e.course_id = transactions.course_id
    )
    and exists (
      select 1 from public.courses c
      where c.id = transactions.course_id
        and c.price = transactions.amount
        and transactions.status = (
          case when c.price > 0 then 'completed' else 'free' end
        )::public.transaction_status
    )
  );

-- -----------------------------------------------------------------------------
-- 7. storage: no anonymous listing
-- -----------------------------------------------------------------------------

drop policy if exists "public can read course thumbnails" on storage.objects;
drop policy if exists "admins can read course thumbnails" on storage.objects;
create policy "admins can read course thumbnails" on storage.objects
  for select to authenticated
  using (bucket_id = 'course-thumbnails' and public.is_admin());

drop policy if exists "public can read lesson content" on storage.objects;
drop policy if exists "admins can read lesson content" on storage.objects;
create policy "admins can read lesson content" on storage.objects
  for select to authenticated
  using (bucket_id = 'lesson-content' and public.is_admin());

drop policy if exists "public can read certificate assets" on storage.objects;
drop policy if exists "admins can read certificate assets" on storage.objects;
create policy "admins can read certificate assets" on storage.objects
  for select to authenticated
  using (bucket_id = 'certificate-assets' and public.is_admin());

drop policy if exists "learners can read own certificate pdfs" on storage.objects;
create policy "learners can read own certificate pdfs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'certificate-assets'
    and (storage.foldername(name))[1] = 'certificates'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- -----------------------------------------------------------------------------
-- 8. Housekeeping
-- -----------------------------------------------------------------------------

-- Only ever called from the lessons trigger (as the definer); no reason for
-- any API role to run it.
revoke execute on function public.recalculate_course_lesson_stats(uuid) from public, anon, authenticated;
-- grade_attempt() rejects anon anyway (auth.uid() is null); make it explicit.
revoke execute on function public.grade_attempt(uuid, jsonb) from anon;

notify pgrst, 'reload schema';
