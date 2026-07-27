-- Curriculum core (erd.md build-order step 1, remaining piece): course_sections
-- and lessons under a course, plus lesson resources. Quiz question content and
-- lesson_progress are intentionally NOT included here (later slices).

create type public.lesson_content_type as enum ('video', 'text', 'quiz', 'mixed');

create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position int not null default 0
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections (id) on delete cascade,
  title text not null,
  position int not null default 0,
  content_type public.lesson_content_type not null default 'video',
  video_url text,
  content text,
  duration_seconds int
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null,
  file_url text not null,
  type text,
  position int not null default 0
);

alter table public.course_sections enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;

-- Curriculum (module/lesson titles + types) is part of the public "sales
-- page" for a course, so it's readable whenever the parent course is
-- published — same access model as courses itself, just via EXISTS checks
-- through the section/lesson chain.
--
-- KNOWN FOLLOW-UP: this also exposes lessons.video_url/content to
-- non-enrolled users, since RLS is row-level and can't hide columns. That's
-- fine today (the detail page only renders titles/types; no real lesson
-- content is seeded; the player isn't built). When the lesson player ships,
-- gate actual content access with a server-side enrollment check rather
-- than relying on this policy.
create policy "sections readable for published courses" on public.course_sections
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.courses c
    where c.id = course_sections.course_id and c.status = 'published'
  ));

create policy "lessons readable for published courses" on public.lessons
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.course_sections s
    join public.courses c on c.id = s.course_id
    where s.id = lessons.section_id and c.status = 'published'
  ));

create policy "resources readable for published courses" on public.resources
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.lessons l
    join public.course_sections s on s.id = l.section_id
    join public.courses c on c.id = s.course_id
    where l.id = resources.lesson_id and c.status = 'published'
  ));

grant select on public.course_sections, public.lessons, public.resources to anon, authenticated;
