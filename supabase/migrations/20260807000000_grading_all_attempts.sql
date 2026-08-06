-- Grading: surface every submitted attempt, not just the ones awaiting a human
--
-- Three related fixes so auto-graded quiz scores are actually reachable:
--
--   1. public.admin_pending_attempts was gated on `qa.status = 'pending_review'`.
--      All three grading RPCs read it, so /admin/grading only listed courses
--      containing something awaiting MANUAL review -- a course whose quizzes are
--      all objective never appeared, and the matrix is only reachable from that
--      list. It now covers every submitted attempt and exposes `status`.
--   2. admin_grading_stats() keeps attempt_count pending-only (it fronts the
--      "Attempts Pending Review" card) but now counts every course with a
--      submission.
--   3. grade_attempt() threw the objective sub-score away on the pending_review
--      branch, so computeCourseGrade() scored a mixed quiz 0 until an admin
--      graded the essay. It now persists that provisional score; `passed` stays
--      null so checkAndIssueCertificate still withholds the certificate.
--
-- Safe to re-run against a live DB.

-- 1 + 2 ---------------------------------------------------------------------
-- drop, not `create or replace`: `status` is inserted mid-column-list, which
-- replace cannot do.
drop view if exists public.admin_pending_attempts;

-- Flat source for every level (course/quiz/attempt) of the grading screens.
-- Replaces listPendingAttempts()'s deep embed + JS-side ownership
-- post-filter, which otherwise returns platform-wide rows to a scoped admin.
--
-- Covers EVERY submitted attempt, not just pending_review ones: gating the
-- view on pending_review made the whole /admin/grading entry point invisible
-- for a course whose quizzes are all auto-graded, so scores that existed in
-- the DB were unreachable in the UI. Rows needing a human are the ones with
-- pending_count > 0 (equivalently status = 'pending_review').
create view public.admin_pending_attempts
with (security_invoker = true) as
select
  qa.id as attempt_id,
  qa.submitted_at,
  qa.status,
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
where qa.status <> 'in_progress';

grant select on public.admin_pending_attempts to authenticated;

-- admin_grading_courses() is unchanged -- it inherits the broader view.


-- attempt_count stays pending-only (it fronts the "Attempts Pending Review"
-- card); course_count spans every course with a submission now that the view
-- is no longer gated on pending_review.
create or replace function public.admin_grading_stats()
returns table (attempt_count bigint, course_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where a.status = 'pending_review'),
    count(distinct a.course_id)
  from public.admin_pending_attempts a
  where a.course_created_by = (select auth.uid()) or public.is_superadmin();
$$;

grant execute on function public.admin_grading_stats() to authenticated;

-- 3 -------------------------------------------------------------------------
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
