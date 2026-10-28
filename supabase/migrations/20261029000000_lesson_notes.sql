-- Lesson notes (v2): a learner's own "Catatan saya" per lesson, autosaved
-- from the lesson player and listed on the course page.
--
-- v1 had a "Notes" tab that saved nothing; v2 removed it (a control that
-- does nothing is a defect under the digital learning standard). This is
-- the real backend for it.
--
-- Privacy: notes are private to the learner who wrote them. Every policy is
-- own-row (learner_id = auth.uid()); there is deliberately NO admin or
-- superadmin read policy -- a learner's notes are personal study material,
-- not assessment evidence, so course owners cannot read them. Writing
-- (insert/update) additionally requires an enrollment in the lesson's
-- course, so nobody can attach notes to courses they are not taking.
-- Delete stays own-row only, so a learner can still clear notes after an
-- admin removed their enrollment.
create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  content text not null default '' check (char_length(content) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learner_id, lesson_id)
);

create index if not exists lesson_notes_learner_id_idx on public.lesson_notes (learner_id);

alter table public.lesson_notes enable row level security;

-- authenticated only: anon has no grant at all, so it reads nothing even
-- before RLS is consulted.
revoke all on public.lesson_notes from anon;
grant select, insert, update, delete on public.lesson_notes to authenticated;

-- updated_at reflects the last real write, whatever the client sends.
create or replace function public.lesson_notes_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists lesson_notes_touch_updated_at on public.lesson_notes;
create trigger lesson_notes_touch_updated_at
  before insert or update on public.lesson_notes
  for each row
  execute function public.lesson_notes_touch_updated_at();

drop policy if exists "learners select own lesson notes" on public.lesson_notes;
create policy "learners select own lesson notes" on public.lesson_notes
  for select to authenticated
  using (learner_id = auth.uid());

drop policy if exists "learners insert own lesson notes" on public.lesson_notes;
create policy "learners insert own lesson notes" on public.lesson_notes
  for insert to authenticated
  with check (
    learner_id = auth.uid()
    and exists (
      select 1 from public.lessons l
      join public.course_sections s on s.id = l.section_id
      join public.enrollments e on e.course_id = s.course_id
      where l.id = lesson_notes.lesson_id
        and e.learner_id = auth.uid()
    )
  );

drop policy if exists "learners update own lesson notes" on public.lesson_notes;
create policy "learners update own lesson notes" on public.lesson_notes
  for update to authenticated
  using (learner_id = auth.uid())
  with check (
    learner_id = auth.uid()
    and exists (
      select 1 from public.lessons l
      join public.course_sections s on s.id = l.section_id
      join public.enrollments e on e.course_id = s.course_id
      where l.id = lesson_notes.lesson_id
        and e.learner_id = auth.uid()
    )
  );

drop policy if exists "learners delete own lesson notes" on public.lesson_notes;
create policy "learners delete own lesson notes" on public.lesson_notes
  for delete to authenticated
  using (learner_id = auth.uid());

-- No admin policy on purpose (see the privacy note at the top).
