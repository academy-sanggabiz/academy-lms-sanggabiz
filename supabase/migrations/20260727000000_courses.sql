-- Courses (learner-facing listing slice). See erd.md for the full target
-- schema — category_id and a real lessons table are intentionally deferred;
-- lesson_count/duration_hours stand in as denormalized card metadata until
-- the lessons table exists.

create type public.course_status as enum ('draft', 'published');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  thumbnail_url text,
  price numeric not null default 0,
  level text,
  lesson_count int not null default 0,
  duration_hours numeric not null default 0,
  status public.course_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

-- Learners (and anonymous visitors, e.g. the public landing page) may read
-- only published courses. There is no insert/update policy yet — course
-- authoring arrives with the admin course-builder; seed rows are inserted
-- directly by migration/seed scripts, which bypass RLS.
create policy "published courses are readable" on public.courses
  for select
  to anon, authenticated
  using (status = 'published');

grant select on public.courses to anon, authenticated;
