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

-- Marketing content (Who This Course Is For / Requirements / language) for
-- the no-code-ai-bot course, matching the reference design handoff's Course
-- Overview screen. Plain UPDATE — safe to re-run.
update public.courses
set
  who_for = array[
    'Pemula Tanpa Latar Belakang IT: Anda yang ingin membuat chatbot AI profesional tanpa harus belajar bahasa pemrograman terlebih dahulu.',
    'Pemilik Bisnis & UMKM: Yang ingin mengotomatisasi layanan pelanggan dan menghemat biaya pengembangan sistem mereka.',
    'Tech Enthusiast & Automation Specialist: Siapa saja yang tertarik dengan efisiensi kerja, otomatisasi workflow, dan ingin mengeksplorasi kemampuan Prompt Engineering praktis menggunakan Google Gemini.'
  ],
  requirements = array[
    'Untuk mengikuti course ini, peserta tidak perlu memiliki latar belakang pemrograman yang rumit. Persyaratan utamanya adalah:',
    'Kemampuan Dasar Komputer & Internet: Peserta familiar dengan penggunaan browser, manajemen tab, dan navigasi web dasar.',
    'Akun Platform (Gratis): Peserta bersedia membuat akun gratis di platform Make.com dan Google AI Studio (untuk mendapatkan Gemini API Key) selama kelas berlangsung.',
    'Tanpa Wajib Coding (No-Code Friendly): Tidak ada prasyarat harus menguasai bahasa pemrograman seperti JavaScript atau Python. Semua logika akan dibangun menggunakan visual builder.',
    'Perangkat: Laptop atau PC (Windows/Mac/Linux) dengan koneksi internet yang stabil untuk mengakses cloud tools.'
  ],
  language = 'Bahasa Indonesia'
where slug = 'no-code-ai-bot';

-- Instructor for no-code-ai-bot, matching the reference design handoff.
insert into public.instructors (name, title)
select 'Muhammad Muchson Attoyibi muchson', 'Course Instructor'
where not exists (
  select 1 from public.instructors where name = 'Muhammad Muchson Attoyibi muchson'
);

insert into public.course_instructors (course_id, instructor_id)
select c.id, i.id
from public.courses c, public.instructors i
where c.slug = 'no-code-ai-bot' and i.name = 'Muhammad Muchson Attoyibi muchson'
  and not exists (
    select 1 from public.course_instructors ci
    where ci.course_id = c.id and ci.instructor_id = i.id
  );

-- Curriculum seed: ~2 sections x ~2 lessons per course, so the Course Detail
-- page has real content to render. No real video_url/content yet — this is
-- structure only. Guarded with `where not exists` per row (no unique
-- constraint on section/lesson titles) so this file stays safely re-runnable.
--
-- no-code-ai-bot's 3 modules are renamed/added below to reproduce the
-- reference design handoff's Course Content list exactly (module titles,
-- lesson titles, and the "Reading" text lesson under Modul 2).

update public.course_sections
set title = 'Modul 1: Pengenalan & Pondasi Dasar Chatbot AI'
where course_id = (select id from public.courses where slug = 'no-code-ai-bot')
  and title = 'Modul 1: Pengenalan & Pondasi Dasar';

insert into public.course_sections (course_id, title, position)
select c.id, s.title, s.position
from public.courses c
join (values
  ('no-code-ai-bot', 'Modul 1: Pengenalan & Pondasi Dasar Chatbot AI', 0),
  ('no-code-ai-bot', 'Modul 2: Kustomisasi & Fitur Lanjutan', 1),
  ('no-code-ai-bot', 'Modul 3: Studi Kasus & Implementasi Nyata', 2),
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

update public.lessons
set title = '#1. Dasar Chat Bot AI – Startup Bayar Puluhan Juta Buat Chatbot – Gue Cuma Pakai Make.com & Google Gemini'
where title = 'Pengenalan Chatbot AI';

update public.lessons
set title = 'Quiz'
where title = 'Quiz: Pondasi Dasar';

update public.lessons
set title = '#2. Kustomisasi Chatbot – Personalisasi Persona & Memory dengan Google Gemini'
where title = 'Personalisasi Persona & Memory';

insert into public.lessons (section_id, title, position, content_type)
select cs.id, l.title, l.position, l.content_type::public.lesson_content_type
from public.course_sections cs
join public.courses c on c.id = cs.course_id
join (values
  ('no-code-ai-bot', 'Modul 1: Pengenalan & Pondasi Dasar Chatbot AI', '#1. Dasar Chat Bot AI – Startup Bayar Puluhan Juta Buat Chatbot – Gue Cuma Pakai Make.com & Google Gemini', 0, 'video'),
  ('no-code-ai-bot', 'Modul 1: Pengenalan & Pondasi Dasar Chatbot AI', 'Quiz', 1, 'quiz'),
  ('no-code-ai-bot', 'Modul 2: Kustomisasi & Fitur Lanjutan', '#2. Kustomisasi Chatbot – Personalisasi Persona & Memory dengan Google Gemini', 0, 'video'),
  ('no-code-ai-bot', 'Modul 2: Kustomisasi & Fitur Lanjutan', 'Reading: Prompt Engineering Dasar untuk Persona Chatbot', 1, 'text'),
  ('no-code-ai-bot', 'Modul 3: Studi Kasus & Implementasi Nyata', '#3. Studi Kasus – Chatbot Customer Service untuk Bisnis Nyata', 0, 'video'),
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

-- Give lessons real content so the player has something to show. Idempotent
-- (only fills rows that are still empty) — safe to re-run.
update public.lessons
set video_url = 'https://youtu.be/TO3NFnTmItc'
where content_type = 'video' and video_url is null;

update public.lessons
set content = 'This is placeholder lesson content. Replace with real course material once the content authoring flow exists.'
where content_type = 'text' and content is null;

-- Duration labels for the lesson player sidebar ("Video · 18min" etc).
-- Arbitrary but reasonable durations, idempotent (only fills empty rows).
update public.lessons set duration_seconds = 1080 where content_type = 'video' and duration_seconds is null;
update public.lessons set duration_seconds = 360 where content_type = 'text' and duration_seconds is null;

-- One downloadable resource on the no-code-ai-bot course's first video
-- lesson, so the course-detail sidebar shows "1 resources" like the
-- reference design handoff.
insert into public.resources (lesson_id, title, file_url, type, position)
select l.id, 'Slide Deck: Pondasi Dasar Chatbot AI', 'https://example.com/placeholder-slides.pdf', 'pdf', 0
from public.lessons l
join public.course_sections cs on cs.id = l.section_id
join public.courses c on c.id = cs.course_id
where c.slug = 'no-code-ai-bot'
  and l.title = '#1. Dasar Chat Bot AI – Startup Bayar Puluhan Juta Buat Chatbot – Gue Cuma Pakai Make.com & Google Gemini'
  and not exists (
    select 1 from public.resources r where r.lesson_id = l.id
  );

-- Quiz for the no-code-ai-bot Modul 1 "Quiz" lesson: 1 multiple_choice + 1
-- essay question, matching the reference design handoff's quiz screens.
insert into public.quizzes (lesson_id, title, pass_score, max_attempts)
select l.id, 'Quiz: Pondasi Dasar', 50, 3
from public.lessons l
join public.course_sections cs on cs.id = l.section_id
join public.courses c on c.id = cs.course_id
where c.slug = 'no-code-ai-bot' and l.title = 'Quiz'
  and not exists (select 1 from public.quizzes q where q.lesson_id = l.id);

insert into public.questions (quiz_id, type, prompt, points, position)
select q.id, 'multiple_choice'::public.question_type, 'Apa tools yang di pakai dalam video tersebut? kecuali', 1, 0
from public.quizzes q
join public.lessons l on l.id = q.lesson_id
where l.title = 'Quiz'
  and not exists (
    select 1 from public.questions qu
    where qu.quiz_id = q.id and qu.prompt = 'Apa tools yang di pakai dalam video tersebut? kecuali'
  );

insert into public.questions (quiz_id, type, prompt, points, position)
select q.id, 'essay'::public.question_type, 'Jelaskan apa kegunaan dari make.com pada video diatas', 1, 1
from public.quizzes q
join public.lessons l on l.id = q.lesson_id
where l.title = 'Quiz'
  and not exists (
    select 1 from public.questions qu
    where qu.quiz_id = q.id and qu.prompt = 'Jelaskan apa kegunaan dari make.com pada video diatas'
  );

insert into public.question_options (question_id, text, is_correct, position)
select qu.id, o.text, o.is_correct, o.position
from public.questions qu
join public.quizzes q on q.id = qu.quiz_id
join public.lessons l on l.id = q.lesson_id
join (values
  ('make.com', false, 0),
  ('gemini', false, 1),
  ('telegram', true, 2),
  ('whatsapp', false, 3)
) as o(text, is_correct, position) on true
where l.title = 'Quiz'
  and qu.prompt = 'Apa tools yang di pakai dalam video tersebut? kecuali'
  and not exists (
    select 1 from public.question_options qo
    where qo.question_id = qu.id and qo.text = o.text
  );
