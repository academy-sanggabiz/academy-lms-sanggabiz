-- Course thumbnail upload via Supabase Storage.
--
-- The "Course Thumbnail" field in the admin Basic Info tab previously took a
-- pasted URL only (no Storage bucket had been decided). This adds a public
-- bucket for thumbnails plus admin/superadmin-only write policies, following
-- the same "exists a profiles row for auth.uid() with role in (admin,
-- superadmin)" pattern used for every table in
-- 20260803000000_admin_course_write_policies.sql. Public read matches the
-- visibility of published courses (shown on the public landing page).
--
-- Run this manually in the Supabase Dashboard SQL Editor -- there is no
-- linked Supabase CLI project here.

insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do nothing;

create policy "public can read course thumbnails" on storage.objects
  for select to public
  using (bucket_id = 'course-thumbnails');

create policy "admins can upload course thumbnails" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-thumbnails'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin'))
  );

create policy "admins can update course thumbnails" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'course-thumbnails'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin'))
  )
  with check (
    bucket_id = 'course-thumbnails'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin'))
  );

create policy "admins can delete course thumbnails" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-thumbnails'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin'))
  );
