# Tinjauan Keamanan Akses Data — Sanggabiz LMS v2

Tanggal: 28 Oktober 2026 · Cabang: `fix/rls-security-review`

## Ruang lingkup

- RLS setiap tabel di `public` (kecuali `lesson_notes`, milik pekerjaan catatan pelajaran), termasuk `question_explanations`, view, dan grant default Supabase.
- Kebijakan bucket Storage (`course-thumbnails`, `lesson-content`, `certificate-assets`).
- Fungsi `security definer` (search_path, siapa yang boleh memanggil, kepercayaan argumen) dan RPC (`grade_attempt`, `admin_*`).
- Otorisasi server action (learner dan admin), klien service-role (`lib/supabase/admin.ts`), parameter redirect (`/auth/callback?next=`, `continueTo`).
- Penggunaan `dangerouslySetInnerHTML` dan aturan pendaftaran kursus privat.

## Metode

1. Membaca `supabase/migrations/databaseSetup.sql`, semua migrasi, `lib/*` dan semua `actions.ts`/`route.ts`.
2. Mengecek keadaan nyata di basis data (`pg_policies`, `pg_proc`, grant tabel/kolom).
3. Membuktikan setiap temuan lewat REST API Supabase dengan token anon / learner / admin (tanpa melewati aplikasi Next.js), lalu mengulang uji yang sama setelah perbaikan. Uji ini sekarang otomatis: `npm run test:rls`.

## Temuan

| ID | Tingkat | Lokasi | Deskripsi | Status | Rekomendasi / perbaikan |
|---|---|---|---|---|---|
| C-01 | Critical | `profiles` (grant + policy "own profile update") | Setiap pengguna bisa `PATCH /profiles?id=eq.<diri sendiri>` dengan `{"role":"superadmin"}`. Policy hanya memeriksa baris, dan Supabase memberi UPDATE ke semua kolom secara default. Terbukti: akun learner baru menjadi superadmin. | Fixed | UPDATE hanya diberikan pada kolom `full_name` dan `notification_email_enabled`. Peran hanya diubah lewat SQL/service role. |
| C-02 | High | `lessons`, `resources`, `questions`, `question_options_public` | Isi pelajaran (`content`, `video_url`), URL berkas resource, dan soal kuis setiap kursus publik bisa dibaca anon lewat REST. Player hanya menjaga di tingkat halaman. | Fixed | Policy baca kini memakai `can_read_course_content()` (terdaftar di kursus, atau admin pemilik/superadmin). Kurikulum publik lewat view `lessons_public` tanpa kolom konten. |
| C-03 | High | `quiz_attempts` (policy own insert/update) | Learner bisa menulis `score/passed/status` attempt sendiri (memalsukan lulus kuis), membuat attempt tanpa terdaftar dan tanpa batas percobaan, serta membuka `question_explanations` (kunci jawaban) sebelum mengerjakan. | Fixed | Trigger `guard_quiz_attempt_write`: learner hanya boleh membuka attempt `in_progress` di kursus yang diikuti (maks. 3 untuk kuis biasa, `max_attempts` untuk studi kasus) dan mengubah `draft_answers` selama masih terbuka. Penilaian tetap hanya di `grade_attempt()`. |
| C-04 | High | `enrollments` (policy "own enrollments updatable") | Learner bisa mengubah `course_id` enrollment miliknya ke kursus lain, termasuk kursus privat, lalu membacanya. | Fixed | Trigger `guard_enrollment_update`: `learner_id` dan `course_id` tidak bisa diubah oleh peran API. |
| C-05 | High | `certificates`, `enrollments.status`, Storage `certificates/<uid>/`, `lesson_progress` | Penerbitan sertifikat berjalan di sesi learner, sehingga learner bisa langsung `INSERT certificates`, mengubah `enrollments.status` menjadi `completed`, mengunggah PDF sendiri, dan mencentang pelajaran kuis sebagai selesai. Terbukti: sertifikat palsu bisa dibuat lewat REST. | Open | Pindahkan penerbitan ke RPC `security definer` (mis. `issue_certificate(enrollment_id)`) yang menghitung ulang syarat (semua pelajaran selesai, semua kuis lulus, nilai akhir ≥ `passing_grade`) di SQL; cabut policy insert/update learner pada `certificates` dan update `status` pada `enrollments`; buat PDF di server dengan service role. Selama belum, jangan memakai sertifikat sebagai bukti resmi tanpa verifikasi admin. |
| C-06 | Medium | `quiz_responses` (policy "own quiz responses insertable") | Learner bisa menyisipkan baris jawaban dengan `points_awarded` besar ke attempt sendiri; `finalizeAttempt` menjumlahkan semua baris, sehingga nilai penilaian manual bisa dinaikkan. | Fixed | Policy dihapus; hanya `grade_attempt()` yang menulis jawaban. |
| C-07 | Medium | `app/auth/callback/route.ts` | Open redirect: `?next=@evil.com` atau `.evil.com` digabung ke origin dan mengarahkan pengguna ke domain lain setelah login. | Fixed | `safeNextPath()` (`lib/auth/safe-next.ts`) hanya menerima path absolut di origin yang sama; diuji di `scripts/redirect-check.mjs`. |
| C-08 | Medium | Storage, policy SELECT `to public` | Anon bisa **mendaftar** semua objek bucket (mis. semua path PDF sertifikat learner). Terbukti lewat `/storage/v1/object/list`. | Fixed | SELECT hanya untuk admin (+ folder sertifikat milik learner sendiri untuk upsert). URL publik tetap berfungsi. |
| C-09 | Medium | `components/learn/LessonPane.tsx`, `QuestionPrompt.tsx`, `app/page.tsx` | HTML buatan admin (isi pelajaran, soal) dirender dengan `dangerouslySetInnerHTML` tanpa sanitasi, termasuk saat SSR. Admin biasa bisa menyimpan HTML apa pun lewat server action, yang lalu berjalan di browser learner dan superadmin (`/admin-preview`). Landing page hanya superadmin (Info). | Open | Sanitasi saat simpan di server (`saveCourseDraft`) dengan sanitizer yang jalan di Workers (mis. simpan JSON Tiptap dan bangkitkan HTML dari skema yang diizinkan), ditambah Content-Security-Policy. DOMPurify di komponen klien tidak cukup karena SSR tidak punya DOM. |
| C-10 | Low | `transactions` (policy "own transactions insertable") | Learner bisa membuat transaksi palsu (jumlah/status apa pun, kursus apa pun) yang mengacaukan statistik pendapatan admin pemilik. | Fixed | Insert learner harus cocok dengan enrollment sendiri dan harga kursus (`free` ↔ 0, `completed` ↔ harga). Gateway pembayaran nanti harus menulis di server dengan service role. |
| C-11 | Low | Fungsi `recalculate_course_lesson_stats`, `grade_attempt` | Fungsi internal `security definer` bisa dipanggil anon lewat `/rpc`. | Fixed | `EXECUTE` dicabut dari anon (dan dari semua peran API untuk fungsi statistik). |
| C-12 | Low | Bucket publik | Gambar pelajaran (juga kursus privat) dan PDF sertifikat bisa diunduh siapa pun yang tahu URL-nya (nama acak/UUID, tidak bisa ditebak). | Open | Diterima untuk saat ini. Bila konten berbayar/rahasia: bucket privat + signed URL. |
| C-13 | Low | `toggleLessonComplete` (`app/learn/[courseId]/actions.ts`) | Tidak memeriksa bahwa `lessonId` milik kursus tersebut, dan pelajaran kuis bisa dicentang tanpa lulus. Dampak terbatas (sertifikat tetap memeriksa attempt lulus), lihat C-05. | Open | Validasi lesson ↔ course dan tolak pelajaran tipe kuis di action (atau di policy `lesson_progress`). |
| C-14 | Info | `grade_attempt` | `search_path = public`, bukan `''`. Tidak bisa dieksploitasi: peran API tidak punya CREATE di skema `public`, dan semua relasi sudah dikualifikasi. | Open | Ubah ke `search_path = ''` pada perubahan berikutnya. |
| C-15 | Info | `getCourseDetail` `enrolled_count` | Untuk learner, RLS hanya mengembalikan enrollment miliknya, sehingga "N learners enrolled" bernilai 0/1. Bug fungsional, bukan kebocoran. | Open | Sediakan hitungan lewat view/fungsi agregat. |
| C-16 | Info | Grant default Supabase | anon/authenticated punya TRUNCATE/TRIGGER/REFERENCES di tabel `public`; tidak terjangkau lewat PostgREST. | Open | Cabut untuk pertahanan berlapis. |
| C-17 | Info | Diperiksa, aman | `deleteAccount` memakai `sub` dari klaim sendiri (tidak bisa menghapus akun lain); `continueTo` di-encode dan berawalan `/learn/<id>`; jawaban esai disanitasi DOMPurify sebelum ditampilkan ke admin; semua action admin memanggil `requireAdmin`/`requireSuperAdmin`; RPC `admin_*` `security invoker` + pembatasan pemilik; self-enroll ke kursus privat/draft ditolak; `question_explanations` hanya setelah attempt terkirim. | — | — |

Ringkasan: 1 Critical, 4 High, 4 Medium, 4 Low, 4 Info. Diperbaiki: C-01, C-02, C-03, C-04, C-06, C-07, C-08, C-10, C-11.

## Desain baru konten pelajaran

- `can_read_course_content(course_id)` (security definer): `owns_course()` **atau** (`can_read_course()` **dan** terdaftar).
- Tabel `lessons`, `resources`, `questions` dan view `question_options_public` hanya terbaca lewat fungsi itu (plus policy admin pemilik yang sudah ada). Anon tidak mendapat baris apa pun.
- View `lessons_public` (pemilik view, seperti `question_options_public`) hanya memproyeksikan `id, section_id, course_id, title, position, content_type, duration_seconds, resource_count` dan memakai `can_read_course()`, jadi kursus draft/privat tetap tersembunyi.
- `getCourseDetail()` (`lib/courses-server.ts`) membangun kurikulum dari `lessons_public` dan mengisi konten dari tabel dasar bila diizinkan; selain itu konten `null`, resource kosong, `quiz` `null` (kurikulum menampilkan "Quiz").
- `quizzes` (judul, nilai lulus) tetap terbaca bersama kursus; soal tidak, karena soal adalah asesmennya.

Migrasi: `supabase/migrations/20261029010000_lesson_content_rls.sql` (idempoten). `databaseSetup.sql` diperbarui di tempat dan objek baru ada di bagian 17; skrip penuh sudah diuji pada basis data kosong.

## Menjalankan uji

```bash
npm run test:rls
```

Menjalankan `scripts/redirect-check.mjs` (unit `safeNextPath`) lalu `scripts/rls-check.mjs` terhadap Supabase di `.env.local`. Skrip membuat pengguna sementara `c-rls-*@test.local`, memakai kursus seed `11111111-…` dan admin pemilik `admin@test.local` (ubah dengan `RLS_COURSE_ID`, `RLS_QUIZ_ID`, `RLS_ADMIN_EMAIL`, `RLS_ADMIN_PASSWORD`). Dengan `SUPABASE_SERVICE_ROLE_KEY` skrip juga menguji admin non-pemilik dan menghapus pengguna sementaranya. Keluar dengan kode 1 bila ada asersi yang gagal.
