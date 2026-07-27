-- Course-overview marketing content to match the reference design's
-- "Who This Course Is For" / "Requirements" / instructor sections and
-- sidebar language stat. Extends `courses` (three columns, not modeled in
-- erd.md today — an explicit product-approved addition) and adds
-- `instructors` / `course_instructors` exactly per erd.md's Identity &
-- Course-structure sections.

alter table public.courses
  add column who_for text[] not null default '{}',
  add column requirements text[] not null default '{}',
  add column language text not null default 'Bahasa Indonesia';

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
-- Write access is admin-only in intent; no write policy exists yet since
-- there's no admin authoring UI (mirrors the `courses` "no insert policy
-- yet" pattern — seed rows bypass RLS).
create policy "instructors are readable" on public.instructors
  for select
  to anon, authenticated
  using (true);

-- Readable only when the parent course is published, same EXISTS pattern
-- used by `course_sections`/`lessons`.
create policy "course_instructors readable for published courses" on public.course_instructors
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.courses c
    where c.id = course_instructors.course_id and c.status = 'published'
  ));

grant select on public.instructors to anon, authenticated;
grant select on public.course_instructors to anon, authenticated;
