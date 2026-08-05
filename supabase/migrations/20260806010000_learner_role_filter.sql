-- admin_learner_page() / admin_learner_stats() joined enrollments -> courses
-- -> profiles with no filter on profiles.role. An admin who has an
-- enrollment row on one of their own courses (e.g. from earlier testing)
-- therefore showed up in Learner Management like any other learner -- and
-- since the detail page (getAdminLearnerDetail) correctly requires
-- role = 'learner', clicking "View Details" on that row 404'd. Filtering to
-- role = 'learner' here stops the row from being surfaced in the first place.
-- Safe to run against existing data: create or replace function, no schema change.

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
  join public.profiles pr on pr.id = e.learner_id and pr.role = 'learner'
  where c.created_by = (select auth.uid()) or public.is_superadmin();
$$;

grant execute on function public.admin_learner_stats() to authenticated;
