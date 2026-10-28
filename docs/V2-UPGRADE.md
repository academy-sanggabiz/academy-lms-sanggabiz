# Sanggabiz LMS v2: catatan upgrade

v2 adalah upgrade dari v1 (`academy-sanggabiz/academy-lms-sanggabiz`, commit `24a958a`) agar platform mengikuti [Standar Digital Learning](./STANDAR-DIGITAL-LEARNING.md) kita. Setiap perubahan di bawah menyebut bagian standar yang dipenuhinya, dan sudah diverifikasi di aplikasi yang benar-benar berjalan: Supabase lokal, build produksi, dan browser.

| | v1 | v2 |
|---|---|---|
| Next.js | 16.2.11, `middleware.ts` (deprecated) | 16.4.3, `proxy.ts` |
| `npm ci` / build di Linux & CI | Gagal (lockfile hanya berisi binary macOS arm64) | Berhasil (binary semua platform) |
| Celah keamanan dependency produksi (`npm audit --omit=dev`) | 55 (3 critical, 17 high) | **0** |
| Pelanggaran axe-core WCAG 2.2 A/AA | Kontras teks 2,45:1 pada aksen; puluhan elemen tanpa nama | **0 di 26 halaman** (`npm run audit:a11y`) |
| Reflow di lebar 390 px (player) | Sidebar 360 px tetap; video melebar keluar layar | Tanpa scroll horizontal |
| "Continue learning" di dashboard | Selalu kosong | Pelajaran berikutnya + progres nyata |
| Feedback kuis | Skor + ikon warna | Benar/Salah dalam kata, penjelasan "Why", langkah berikutnya |
| Tab yang tidak berfungsi | AI Assistant, Notes (tidak menyimpan apa pun) | Dihapus |

---

## 1. Fondasi platform

- **`middleware.ts` → `proxy.ts`** dengan fungsi `proxy()`, sesuai konvensi Next.js 16. Peringatan "middleware deprecated" di setiap build hilang.
- **Next.js 16.2.11 → 16.4.3** (juga `eslint-config-next`). Versi ini diwajibkan oleh `@opennextjs/cloudflare` terbaru.
- **Lockfile portabel.** Lockfile v1 dibuat di Mac M-series dan hanya memuat `lightningcss-darwin-arm64` dan `@tailwindcss/oxide-darwin-arm64`, sehingga `npm ci && npm run build` di Linux (CI, Cloudflare) gagal dengan `Cannot find module '../lightningcss.linux-x64-gnu.node'`. Lockfile v2 dibuat ulang dan memuat binary untuk semua platform.
- **Keamanan dependency:**
  - `shadcn` (alat CLI) dipindah ke `devDependencies`.
  - `glob` di `@node-minify/core` dan `postcss-selector-parser` di `@tailwindcss/typography` disematkan ke versi yang sudah ditambal lewat `overrides`.
  - Hasilnya, `npm audit --omit=dev` menjadi **0**.

## 2. Aksesibilitas (standar §8, WCAG 2.2 AA)

**Kontras warna.** Semua pasangan teks kini ≥ 4,5:1 pada putih, kanvas `#f2f8f9`, dan tint teal.

| Token | v1 | v2 | Alasan |
|---|---|---|---|
| `--ring` (dipakai juga sebagai warna teks) | `#35b5c6` (2,45:1) | `#167384` (≥ 4,78:1) | Teks aksen gagal AA |
| `--primary`, `--secondary-foreground`, `--accent-foreground` | `#1a7f91` (4,13:1 pada tint) | `#13707f` | Gagal di atas `--secondary` |
| `--muted-foreground` | `#677a80` (4,49:1; 3,91:1 pada `--muted`) | `#566a70` | Teks sekunder |
| `--success-foreground` | `#1f8a45` (3,92:1) | `#18733a` | Badge sukses |
| `--input` (border field/tombol) | `#cde2e7` (1,34:1) | `#6f939c` (3,3:1) | WCAG 1.4.11 |
| `--brand-gradient` (CTA) | `#35b5c6 → #2e7ca6` (teks putih 2,45:1) | `#167384 → #2a6d93` (≥ 5,5:1) | Tombol utama |

**Fokus dan navigasi**
- Outline fokus 2 px solid di setiap elemen `:focus-visible` (sebelumnya `ring-ring/50`, terlalu pudar).
- Tautan "Skip to main content" dan `#main-content` di semua shell.
- `prefers-reduced-motion` dihormati.
- Judul halaman yang bermakna lewat template `%s · Sanggabiz Academy` (2.4.2).

**Nama aksesibel (4.1.2)**
- Semua tombol ikon, `SelectTrigger`, `Switch`, dan editor Tiptap (prop baru `ariaLabel`).
- Opsi kuis memakai peran `radio`/`checkbox` dengan `aria-checked`.
- Progress bar memakai `role="progressbar"` dengan nilai teks ("3 of 8 lessons done").

**Warna bukan satu-satunya penanda (1.4.1)**
- Status kuis tertulis "Correct"/"Incorrect", dan status pelajaran tertulis "Done".
- Tautan di dalam teks diberi garis bawah.

**Ukuran target sentuh (2.5.8)**
- Checkbox pelajaran, switch, handle reorder, dan tombol rename modul kini ≥ 24 px.

**Alternatif drag (2.5.7)**
- Urutan pelajaran bisa diubah dengan keyboard: fokus ke handle, tekan Space, panah, lalu Space.

**Alt text gambar (1.1.1)**
- Setelah upload gambar (toolbar, paste, atau drop), penulis diminta mengisi deskripsi. Kosong berarti gambar dekoratif.
- Tombol "Alt text" untuk mengubahnya pada gambar yang dipilih.

## 3. Pengalaman belajar

**Player (`/learn/[courseId]`, juga dipakai `/admin-preview`)** memakai komponen baru `components/learn/LearnShell.tsx`.
- **Responsif (§10):**
  - Di bawah breakpoint `lg`, daftar isi kursus menjadi drawer yang dibuka dari header dan ditutup dengan Escape atau klik di luar.
  - Video dan slides menyesuaikan lebar layar.
  - Teks dibatasi sekitar 72 karakter per baris (§3: 45–75).
- **Orientasi (§3):**
  - Header menampilkan "Lesson 3 of 8 · Modul 1", jumlah pelajaran selesai, dan sisa waktu.
  - Modul yang sedang aktif otomatis terbuka.
  - Pelajaran saat ini ditandai dengan `aria-current`.
- **Satu langkah berikutnya yang jelas (§5):**
  - Di bawah setiap pelajaran ada tombol **"Complete & continue"**: mencatat pelajaran selesai lalu membuka pelajaran berikutnya dalam satu klik (`toggleLessonComplete` menerima `continueTo`).
  - Setelah itu tombolnya menjadi "Next lesson" atau "Finish course".
- **Tidak ada kontrol palsu (§14):**
  - Tab **AI Assistant** (tanpa backend) dan **Notes** (tidak menyimpan apa pun) dihapus.
  - Tab Overview diganti bagian "About this course" yang memakai bahasa kursus dari DB, tidak lagi hardcode.

**Dashboard (§3, §5)**
- Kartu **Continue learning** (sebelumnya selalu "No courses in progress") kini menampilkan kursus aktif, urut dari yang terakhir dipelajari. Isinya: pelajaran berikutnya ("Next: lesson 2 of 4 · …"), progres nyata, dan tombol "Continue: lesson N".
- Data diambil lewat fungsi baru `getContinueLearning()` di `lib/enrollments-server.ts`, dengan dua query.
- Rekomendasi kursus kini berupa tautan nyata dengan thumbnail.

**Kuis (§5)**
- Setiap soal objektif bisa diberi **penjelasan** (opsional) di editor kuis.
- Setelah submit, peserta melihat:
  - "Correct" atau "Incorrect" dalam kata;
  - baris **"Why:"** berisi penjelasan;
  - status lulus atau belum;
  - kalimat langkah berikutnya, misalnya "Read the explanations below, review the lessons they point to, then try again."
- **Desain keamanan.** Penjelasan disimpan di tabel terpisah `public.question_explanations`, bukan sebagai kolom di `questions`.
  - Alasannya: baris `questions` bisa dibaca siapa saja yang bisa membaca kursus, dan RLS bekerja per baris, bukan per kolom. Kalau jadi kolom, penjelasan (yang sering berisi jawaban) bisa diambil lewat REST API sebelum kuis dikerjakan.
  - Policy RLS hanya mengizinkan peserta membaca penjelasan setelah punya attempt yang sudah disubmit untuk kuis itu. Pemilik kursus bisa mengelolanya.
  - Sudah diuji lewat REST: sebelum submit hasilnya `[]`, setelah submit 2 baris, dan percobaan menulis oleh peserta ditolak RLS.

## 4. Authoring (§4, §15)

- **Panduan menulis** (`components/admin/courses/LessonWritingGuide.tsx`) di bawah editor pelajaran teks:
  - jumlah kata dan estimasi waktu baca secara langsung;
  - target 5–7 menit dengan satu tujuan per pelajaran;
  - peringatan jika lebih dari 10 menit, dan tombol "Use N min as duration";
  - checklist konten (kalimat tujuan, heading, istilah dijelaskan, contoh nyata, cek di akhir).
- Field durasi pelajaran kini punya keterangan "Aim for 5–7 minutes per lesson".
- **Bug v1 diperbaiki:** menggeser pelajaran **ke bawah** di modul yang sama mendarat satu posisi terlalu tinggi, sehingga geser satu langkah ke bawah tidak berpengaruh, baik dengan mouse maupun keyboard. `moveLesson` kini mengikuti semantik `arrayMove`. Sudah dicek untuk ke-12 kombinasi dan end-to-end sampai posisi di database.

## 5. Verifikasi

Dijalankan pada build produksi dengan Supabase lokal (Postgres, GoTrue dengan custom access-token hook aktif, PostgREST, Storage):

| Cek | Hasil |
|---|---|
| `npx tsc --noEmit` | 0 error |
| `npm run lint` | 0 error (15 warning, sama seperti v1) |
| `npm run build` | Berhasil, tanpa peringatan deprecation |
| `npm run audit:a11y` (axe-core 4.10, WCAG 2.2 A/AA) | **26/26 halaman tanpa pelanggaran**: publik, learner, admin, detail kursus, player, keempat tab editor. Admin preview juga dicek: 0 |
| Reflow 390 px | Dashboard, player teks, dan player video tanpa scroll horizontal |
| Alur peserta | Dashboard "Next: lesson 1 of 4" → player "Lesson 1 of 4" → "Complete & continue" → pelajaran 2, "1 of 4 lessons done" → kuis → hasil "Incorrect/Correct" + 2 baris "Why" |
| Alur admin | Penjelasan soal diedit lalu disimpan, tersimpan di DB; urutan pelajaran diubah dengan keyboard lalu disimpan, posisi di DB berubah |
| RLS `question_explanations` | Sebelum submit `[]`; anonim `[]`; tulis oleh peserta ditolak; setelah submit terbaca |

Belum dilakukan: uji manual dengan screen reader (NVDA/VoiceOver) dan usability test dengan sekitar 5 peserta nyata (standar §12). Keduanya disarankan sebelum rilis ke peserta.

## 6. Cara upgrade deployment v1 yang sudah berjalan

1. Jalankan `supabase/migrations/20261028000000_question_explanations.sql` di SQL Editor Supabase. Migrasi ini aman diulang karena memakai `if not exists` dan `drop policy if exists`. Instalasi baru cukup menjalankan `databaseSetup.sql`; bagian 15 sudah memuatnya.
   Lalu jalankan `supabase/migrations/20261029000000_lesson_notes.sql` (tabel `lesson_notes` untuk "Catatan saya", juga aman diulang). Instalasi baru: bagian 16 `databaseSetup.sql`.
2. `npm ci && npm run build`. Lockfile baru sudah portabel, tidak perlu workaround.
3. Tidak ada perubahan variabel environment.
4. Draft kursus v1 yang tersimpan di localStorage browser admin tetap bisa dipulihkan, karena field `explanation` punya default `""`.

## 7. Definition of done untuk perubahan berikutnya

Setiap perubahan UI baru wajib lolos:

1. `npx tsc --noEmit`, `npm run lint`, `npm run build`.
2. `npm run audit:a11y` dengan exit code 0.
3. Cek manual di 390 px dan dengan keyboard saja: Tab, Enter, Space, Escape.
4. Checklist di [STANDAR-DIGITAL-LEARNING.md §18](./STANDAR-DIGITAL-LEARNING.md) untuk area yang disentuh.

## 8. Belum dikerjakan di v2 (roadmap)

- **Bahasa antarmuka.** UI masih berbahasa Inggris, sementara konten berbahasa Indonesia (§9: satu bahasa yang konsisten). Langkah berikutnya: i18n dengan bahasa Indonesia sebagai default.
- **Catatan saya (notes yang tersimpan): sudah dibangun.** Tabel `public.lesson_notes` (migrasi `20261029000000_lesson_notes.sql`), autosave di player di bawah pelajaran video/slide/teks, dan daftar catatan per kursus di `/learner/courses/[id]`. Catatan bersifat pribadi: admin tidak bisa membacanya.
- **Asisten AI.** Dihapus, bukan dibangun. Kalau mau dibangun, perlu backend AI yang jelas sumber datanya.
- **Alt text** masih memakai dialog `window.prompt` bawaan browser. Bisa diganti dialog sendiri.
- **Penjelasan untuk studi kasus/esai** belum ada. Esai dinilai manual, dan feedback pengajar per jawaban adalah fitur terpisah.
- **Analytics dan KPI** (§12): definisi completion rate, return rate 7 hari, dan drop-out minggu pertama belum dibangun menjadi dashboard.
- **Email notifikasi** (dari v1, belum ada provider).
- **Celah RLS v1 yang sudah tercatat:** isi `lessons.content` dan `video_url` masih bisa dibaca lewat REST oleh user yang belum enroll (lihat CLAUDE.md).
