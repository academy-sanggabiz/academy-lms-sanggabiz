-- =============================================================================
-- Column-mutability guards on self-updatable rows
-- =============================================================================
--
-- Run this once in the Supabase Dashboard SQL Editor, AFTER
-- 20260810000000_drop_unused_admin_grading_quizzes.sql. databaseSetup.sql
-- (the consolidated from-scratch script) has already been updated with the
-- equivalent objects for future fresh setups -- this script applies the same
-- change incrementally.
--
-- Three tables let an authenticated user UPDATE their own row (profiles,
-- enrollments, quiz_attempts) via a `with check ((select auth.uid()) = ...)`
-- policy. RLS is row-level -- it can authorize "this row" but has no way to
-- say "these columns only". Each of those rows happens to also carry a
-- security-relevant column on the same row the user may otherwise freely
-- write:
--   - profiles.role            -- promotes the caller to admin/superadmin
--   - enrollments.course_id    -- repoints a paid-for/open enrollment onto a
--                                  private course, which can_read_course()
--                                  then treats as proof of legitimate access
--   - quiz_attempts.score/passed/status/submitted_at -- bypasses grading
--
-- Fixed here with BEFORE UPDATE triggers, since RLS cannot express this.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles.role immutable except by a superadmin
-- -----------------------------------------------------------------------------
--
-- No application code path ever updates profiles.role (only full_name, via
-- app/{admin,learner}/profile/actions.ts) -- role is set once at signup by
-- handle_new_user() and otherwise only meant to change through an
-- out-of-band superadmin action. Without this trigger, "own profile update"
-- (databaseSetup.sql) authorizes a learner to PATCH their own row's role to
-- 'superadmin' directly via the REST API.
create or replace function public.enforce_profile_role_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_superadmin() then
    raise exception 'Only a superadmin may change profiles.role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_immutable on public.profiles;
create trigger profiles_role_immutable
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_immutable();

-- -----------------------------------------------------------------------------
-- 2. enrollments.course_id / learner_id immutable
-- -----------------------------------------------------------------------------
--
-- Verified there is exactly one UPDATE call site on enrollments in the app
-- (lib/certificates.ts, `.update({ status, completed_at })`) -- nothing ever
-- legitimately repoints an existing row onto a different course or learner.
-- Without this trigger, "own enrollments updatable" lets a learner self-
-- enroll in any open course, then PATCH that row's course_id onto a private
-- course's id; can_read_course() grants full read access on the mere
-- existence of an enrollment row, so this is a paywall/invite-only bypass.
--
-- Deliberately does NOT re-check is_open_enrollment_course(course_id) on
-- every update (as opposed to just pinning the column) -- that would also
-- block the legitimate completed_at/status flip that checkAndIssueCertificate
-- performs for a learner enrolled in a private course (is_open_enrollment_
-- course() is false for private courses by design).
create or replace function public.enforce_enrollment_pivot_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.course_id is distinct from old.course_id
    or new.learner_id is distinct from old.learner_id
  then
    raise exception 'enrollments.course_id and learner_id are immutable; delete and re-insert instead';
  end if;
  return new;
end;
$$;

drop trigger if exists enrollments_pivot_immutable on public.enrollments;
create trigger enrollments_pivot_immutable
  before update on public.enrollments
  for each row
  execute function public.enforce_enrollment_pivot_immutable();

-- -----------------------------------------------------------------------------
-- 3. quiz_attempts: learners may only write draft_answers directly
-- -----------------------------------------------------------------------------
--
-- "own quiz attempts updatable" exists so saveDraft (app/learn/[courseId]/
-- quiz-actions.ts) can persist draft_answers while a study case is in
-- progress. But the same policy also lets a learner PATCH their own attempt's
-- score/passed/status/submitted_at directly, bypassing grade_attempt()
-- entirely -- e.g. {"score":100,"passed":true,"status":"graded"}.
--
-- grade_attempt() (below) is the one legitimate path that writes those
-- columns while running as the learner themself (it's SECURITY DEFINER, but
-- auth.uid() inside it still resolves to the calling learner, so it can't be
-- distinguished from a direct PATCH by auth.uid() alone). It sets a
-- transaction-local GUC immediately before its writes; this trigger trusts
-- that signal and otherwise blocks any learner-initiated write to the
-- grading columns. Admin writes (finalizeAttempt, via the separate "admins
-- update quiz attempts" policy) are unaffected -- the auth.uid() = learner_id
-- check below is false for an admin, so the trigger doesn't inspect their
-- writes at all; RLS ownership scoping already gated that path.
create or replace function public.enforce_quiz_attempt_learner_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.grading_write', true), '') = 'on' then
    return new;
  end if;

  if (select auth.uid()) = old.learner_id then
    if new.score is distinct from old.score
      or new.passed is distinct from old.passed
      or new.status is distinct from old.status
      or new.submitted_at is distinct from old.submitted_at
      or new.attempt_number is distinct from old.attempt_number
      or new.quiz_id is distinct from old.quiz_id
    then
      raise exception 'Learners may only update draft_answers directly; grading writes go through grade_attempt()';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists quiz_attempts_learner_columns_guard on public.quiz_attempts;
create trigger quiz_attempts_learner_columns_guard
  before update on public.quiz_attempts
  for each row
  execute function public.enforce_quiz_attempt_learner_columns();

-- Re-create grade_attempt() to set the trusted-write GUC before its two
-- `update quiz_attempts` statements, and to fix search_path to '' (it was
-- the only definer function in the schema still on `set search_path =
-- public` -- every reference inside the body is already schema-qualified,
-- so this is a pure hygiene fix with no behavior change). Body is otherwise
-- unchanged from 20260807000000_grading_all_attempts.sql.
create or replace function public.grade_attempt(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
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

  -- Trusts the two `update quiz_attempts` statements below as the one
  -- legitimate learner-driven write to the grading columns -- see
  -- enforce_quiz_attempt_learner_columns() above. is_local = true, so this
  -- reverts automatically at the end of the current transaction.
  perform set_config('app.grading_write', 'on', true);

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

  v_score := case when v_total > 0 then round(v_award / v_total * 100) else 100 end;

  if v_ungraded then
    -- Persist the objective portion instead of leaving score null. Without
    -- it computeCourseGrade() (lib/course-grade.ts) counts a mixed quiz as 0
    -- until a human grades the essay, and the grading matrix shows nothing
    -- for a learner who already answered every auto-gradable question.
    -- `passed` stays null, so checkAndIssueCertificate's `passed = true` gate
    -- still withholds the certificate; finalizeAttempt (lib/grading-admin.ts)
    -- overwrites this provisional score on manual grading.
    update public.quiz_attempts
      set submitted_at = now(), score = v_score, passed = null, status = 'pending_review'
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

-- -----------------------------------------------------------------------------
-- 4. certificates.serial immutable once issued
-- -----------------------------------------------------------------------------
--
-- "own certificates updatable" exists so the PDF-upload step
-- (lib/certificates.ts) can write pdf_url back onto the row after insert --
-- verified that's the only UPDATE call site on certificates in the app.
-- Nothing legitimately changes serial after issuance; without this trigger a
-- learner could PATCH their own certificate's serial to any string. pdf_url
-- stays freely updatable (by the owning learner or an owning admin) --
-- unlike the guards above, no legitimate-write case needs distinguishing
-- here, since serial has no legitimate post-insert writer at all.
create or replace function public.enforce_certificate_serial_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.serial is distinct from old.serial then
    raise exception 'certificates.serial is immutable once issued';
  end if;
  return new;
end;
$$;

drop trigger if exists certificates_serial_immutable on public.certificates;
create trigger certificates_serial_immutable
  before update on public.certificates
  for each row
  execute function public.enforce_certificate_serial_immutable();

-- -----------------------------------------------------------------------------
-- Deliberately NOT touched: lesson_progress.completed
-- -----------------------------------------------------------------------------
--
-- A learner manually flipping any lesson's completed checkbox -- quiz-type
-- included, with no gate -- is documented, intentional product behavior (see
-- the comment on "own progress updatable" in databaseSetup.sql and the doc
-- comment on checkAndIssueCertificate() in lib/certificates.ts), not a bug:
-- certificate issuance never trusts lesson_progress.completed as a "quiz
-- passed" signal on its own, it separately re-checks quiz_attempts.passed.
-- Adding a column guard here would break the reference-mandated toggle
-- interaction for no security benefit.
