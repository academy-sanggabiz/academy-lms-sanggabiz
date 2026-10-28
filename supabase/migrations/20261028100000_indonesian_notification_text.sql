-- UI language is Indonesian (docs/GLOSARIUM-UI.md). Notification titles are
-- written by this trigger, not the app, so the text lives here.
create or replace function public.notify_on_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only when SOMEONE ELSE enrolled you. A learner who just clicked "Enroll"
  -- doesn't need to be told they enrolled.
  if (select auth.uid()) is distinct from new.learner_id then
    insert into public.notifications (user_id, type, title, body, link)
    select
      new.learner_id,
      'enrollment',
      'Anda telah didaftarkan ke kursus baru',
      c.title,
      '/learner/courses/' || c.id
    from public.courses c
    where c.id = new.course_id;
  end if;

  return new;
end;
$$;

-- Existing rows were written with the old English title.
update public.notifications
set title = 'Anda telah didaftarkan ke kursus baru'
where type = 'enrollment' and title = 'You have been enrolled in a new course';
