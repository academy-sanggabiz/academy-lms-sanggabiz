-- admin_pending_attempts joined quiz_attempts -> profiles with no filter on
-- profiles.role, the same gap 20260806010000_learner_role_filter.sql fixed
-- for admin_learner_page()/admin_learner_stats(). An admin/superadmin with a
-- pending_review quiz_attempt on their own course (e.g. from earlier testing)
-- therefore surfaced as a learner in Grading (course list, quiz list, and
-- stats all read from this view). Filtering to role = 'learner' here stops
-- the row from being surfaced in the first place.
-- Safe to run against existing data: create or replace view, no schema change.

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
join public.profiles p on p.id = qa.learner_id and p.role = 'learner'
where qa.status = 'pending_review';

grant select on public.admin_pending_attempts to authenticated;
