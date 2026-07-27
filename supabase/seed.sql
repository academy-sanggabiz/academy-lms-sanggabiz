-- Sample published courses, mirroring lib/mock-courses.ts content so the
-- learner Courses page (built on real data) shows the same catalog the
-- landing page already displays from mock data. Idempotent via slug.

insert into public.courses (title, slug, description, price, lesson_count, duration_hours, status)
values
  (
    'No-Code AI Bot: Bangun Chatbot Pintar Setara Startup Tanpa Coding',
    'no-code-ai-bot',
    'Banyak startup dan perusahaan rela membayar puluhan juta rupiah hanya untuk mengintegrasikan chatbot AI ke dalam sistem mereka. Di kursus ini kamu akan membangunnya tanpa menulis satu baris kode pun.',
    0,
    3,
    1,
    'published'
  ),
  (
    'Automation Mastery: Bangun Workflow Bisnis Otomatis dengan Make.com',
    'automation-mastery-make-com',
    'Otomatiskan pekerjaan repetitif — dari input data, follow-up email, sampai laporan mingguan. Pelajari scenario design, webhooks, router, dan error handling untuk workflow yang andal di dunia nyata.',
    249000,
    8,
    4,
    'published'
  ),
  (
    'Data Analysis untuk Bisnis: Dari Spreadsheet ke Dashboard Interaktif',
    'data-analysis-untuk-bisnis',
    'Ubah data mentah penjualan menjadi insight. Belajar membersihkan data, pivot table lanjutan, dan membangun dashboard interaktif yang bisa dibaca siapa pun di tim Anda.',
    349000,
    10,
    6,
    'published'
  ),
  (
    'Digital Marketing Fundamental: Strategi Organik untuk UMKM',
    'digital-marketing-fundamental',
    'Bangun kehadiran digital tanpa budget iklan besar. Konten pilar, SEO lokal, dan funnel WhatsApp untuk mengubah followers menjadi pembeli.',
    0,
    6,
    3,
    'published'
  )
on conflict (slug) do nothing;

-- Curriculum seed: ~2 sections x ~2 lessons per course, so the Course Detail
-- page has real content to render. No real video_url/content yet — this is
-- structure only. Guarded with `where not exists` per row (no unique
-- constraint on section/lesson titles) so this file stays safely re-runnable.

insert into public.course_sections (course_id, title, position)
select c.id, s.title, s.position
from public.courses c
join (values
  ('no-code-ai-bot', 'Modul 1: Pengenalan & Pondasi Dasar', 0),
  ('no-code-ai-bot', 'Modul 2: Kustomisasi & Fitur Lanjutan', 1),
  ('automation-mastery-make-com', 'Modul 1: Dasar Automation', 0),
  ('automation-mastery-make-com', 'Modul 2: Workflow Lanjutan', 1),
  ('data-analysis-untuk-bisnis', 'Modul 1: Dasar Analisis Data', 0),
  ('data-analysis-untuk-bisnis', 'Modul 2: Dashboard Interaktif', 1),
  ('digital-marketing-fundamental', 'Modul 1: Fondasi Digital Marketing', 0),
  ('digital-marketing-fundamental', 'Modul 2: Funnel & Konversi', 1)
) as s(course_slug, title, position) on s.course_slug = c.slug
where not exists (
  select 1 from public.course_sections cs
  where cs.course_id = c.id and cs.title = s.title
);

insert into public.lessons (section_id, title, position, content_type)
select cs.id, l.title, l.position, l.content_type::public.lesson_content_type
from public.course_sections cs
join public.courses c on c.id = cs.course_id
join (values
  ('no-code-ai-bot', 'Modul 1: Pengenalan & Pondasi Dasar', 'Pengenalan Chatbot AI', 0, 'video'),
  ('no-code-ai-bot', 'Modul 1: Pengenalan & Pondasi Dasar', 'Quiz: Pondasi Dasar', 1, 'quiz'),
  ('no-code-ai-bot', 'Modul 2: Kustomisasi & Fitur Lanjutan', 'Personalisasi Persona & Memory', 0, 'video'),
  ('automation-mastery-make-com', 'Modul 1: Dasar Automation', 'Pengenalan Make.com', 0, 'video'),
  ('automation-mastery-make-com', 'Modul 1: Dasar Automation', 'Scenario Design Dasar', 1, 'text'),
  ('automation-mastery-make-com', 'Modul 2: Workflow Lanjutan', 'Webhooks & Router', 0, 'video'),
  ('data-analysis-untuk-bisnis', 'Modul 1: Dasar Analisis Data', 'Membersihkan Data Mentah', 0, 'video'),
  ('data-analysis-untuk-bisnis', 'Modul 1: Dasar Analisis Data', 'Pivot Table Lanjutan', 1, 'text'),
  ('data-analysis-untuk-bisnis', 'Modul 2: Dashboard Interaktif', 'Membangun Dashboard', 0, 'video'),
  ('digital-marketing-fundamental', 'Modul 1: Fondasi Digital Marketing', 'Konten Pilar & SEO Lokal', 0, 'video'),
  ('digital-marketing-fundamental', 'Modul 2: Funnel & Konversi', 'Funnel WhatsApp', 0, 'video'),
  ('digital-marketing-fundamental', 'Modul 2: Funnel & Konversi', 'Quiz: Funnel & Konversi', 1, 'quiz')
) as l(course_slug, section_title, title, position, content_type)
  on l.course_slug = c.slug and l.section_title = cs.title
where not exists (
  select 1 from public.lessons ls
  where ls.section_id = cs.id and ls.title = l.title
);
