-- Admin Learner Management: RLS on profiles/enrollments/lesson_progress is
-- currently owner-only (see learner_auth.sql, enrollments.sql,
-- lesson_progress.sql) -- an admin querying another learner's rows gets
-- nothing back today. erd.md documents "admins read all" as intended for
-- enrollments; this migration implements that (and the matching reads for
-- profiles/lesson_progress) plus insert/delete on enrollments so admins can
-- enroll/unenroll a learner from the Learner Management screen.

-- security definer so the policy check doesn't re-trigger RLS on profiles
-- for every row being evaluated (self-referential exists() in a plain
-- policy predicate). Mirrors custom_access_token_hook's definer-function
-- approach to role checks.
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

create policy "admins read all enrollments" on public.enrollments
  for select to authenticated
  using (public.is_admin());

create policy "admins insert enrollments" on public.enrollments
  for insert to authenticated
  with check (public.is_admin());

create policy "admins delete enrollments" on public.enrollments
  for delete to authenticated
  using (public.is_admin());

grant delete on public.enrollments to authenticated;

create policy "admins read all lesson_progress" on public.lesson_progress
  for select to authenticated
  using (public.is_admin());
