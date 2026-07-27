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
