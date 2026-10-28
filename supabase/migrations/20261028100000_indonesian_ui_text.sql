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

-- The landing page row seeded by databaseSetup.sql was English. Replace it
-- only if a superadmin never edited it (heading still the seeded default), so
-- authored copy is never overwritten.
update public.landing_content
set
  heading = 'Belajar. Berkembang.',
  highlight_word = 'Sukses.',
  subheading = 'Kembangkan diri Anda melalui pengetahuan bersama Sanggabiz. Akses kursus berkualitas yang dirancang untuk membantu Anda mencapai tujuan dan mengembangkan potensi.',
  primary_cta_text = 'Mulai Perjalanan Anda',
  features = '[
    {"icon": "graduation-cap", "title": "Dibimbing Para Ahli", "description": "Belajar dari praktisi industri dan akademisi berpengalaman."},
    {"icon": "layers", "title": "Belajar Fleksibel", "description": "Belajar sesuai ritme Anda dengan akses seumur hidup ke materi dan pembaruan kursus."},
    {"icon": "award", "title": "Bersertifikat", "description": "Dapatkan sertifikat setelah menyelesaikan kursus untuk menunjukkan pencapaian Anda."}
  ]'::jsonb
where id = true
  and heading = 'Learn. Grow.'
  and primary_cta_text = 'Start Your Journey';
