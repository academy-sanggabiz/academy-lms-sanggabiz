-- Prerequisites & Certificate settings (authoring only -- see plan notes).
--
-- Neither table is in erd.md yet: erd.md's only certificate-related table is
-- `certificates` (already-issued certs, unrelated to this authoring UI).
-- This migration adds the schema for the reference design's Prerequisites
-- and Certificate Settings sections (EaseLMS Dashboard.dc.html lines
-- 806-911). Enforcement (blocking enrollment on unmet prerequisites,
-- generating real certificate PDFs) is explicitly out of scope -- both need
-- infrastructure that doesn't exist yet (completion rollup, PDF renderer).
--
-- Run this manually in the Supabase Dashboard SQL Editor -- there is no
-- linked Supabase CLI project here.

alter table public.courses add column if not exists require_prerequisites boolean not null default false;

-- Named explicitly (rather than relying on Postgres's default
-- <table>_<column>_fkey naming) so getCourseDetailForAdmin's embedded
-- select can disambiguate the two FKs to the same table via
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

-- Admin/superadmin only -- not exposed to anon/authenticated learners yet,
-- same pattern as 20260803000000_admin_course_write_policies.sql.
create policy "admins can select course_prerequisites" on public.course_prerequisites
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert course_prerequisites" on public.course_prerequisites
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete course_prerequisites" on public.course_prerequisites
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can select course_certificate_settings" on public.course_certificate_settings
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can insert course_certificate_settings" on public.course_certificate_settings
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can update course_certificate_settings" on public.course_certificate_settings
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

create policy "admins can delete course_certificate_settings" on public.course_certificate_settings
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin')));

grant select, insert, delete on public.course_prerequisites to authenticated;
grant select, insert, update, delete on public.course_certificate_settings to authenticated;

-- Storage bucket for certificate template/signature images, same
-- public-read/admin-write shape as 20260804000000_course_thumbnail_storage.sql.
insert into storage.buckets (id, name, public)
values ('certificate-assets', 'certificate-assets', true)
on conflict (id) do nothing;

create policy "public can read certificate assets" on storage.objects
  for select to public
  using (bucket_id = 'certificate-assets');

create policy "admins can upload certificate assets" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'certificate-assets'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin'))
  );

create policy "admins can update certificate assets" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'certificate-assets'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin'))
  )
  with check (
    bucket_id = 'certificate-assets'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin'))
  );

create policy "admins can delete certificate assets" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'certificate-assets'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'superadmin'))
  );
