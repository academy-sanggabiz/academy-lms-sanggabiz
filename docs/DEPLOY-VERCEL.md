# Deploy ke Vercel

Panduan men-deploy Sanggabiz LMS v2 (`academy-sanggabiz/v2-academy-lms-sanggabiz`) ke Vercel. Vercel menjalankan Next.js secara native, jadi tidak perlu build OpenNext/Cloudflare. Skrip `npm run preview|deploy|upload` di `package.json` hanya untuk Cloudflare dan tidak dipakai di Vercel.

## 1. Siapkan database Supabase (sekali saja)

1. **Instalasi baru:** jalankan seluruh `supabase/migrations/databaseSetup.sql` di SQL Editor.
   **Upgrade dari v1:** cukup jalankan `supabase/migrations/20261028000000_question_explanations.sql`. Tanpa migrasi ini, fitur penjelasan kuis tidak jalan.
2. **Auth → Hooks:** aktifkan `custom_access_token_hook` (Postgres function `public.custom_access_token_hook`).
3. **Storage:** pastikan bucket `course-thumbnails`, `certificate-assets`, dan `lesson-content` ada dan bisa dibaca publik. `databaseSetup.sql` membuatnya, tapi cek di dashboard.

## 2. Import project di Vercel

1. https://vercel.com/new → **Import Git Repository** → pilih `academy-sanggabiz/v2-academy-lms-sanggabiz`. Kalau repo tidak muncul, beri Vercel GitHub App akses ke repo itu.
2. Framework Preset: **Next.js**. Build Command (`next build`), Install Command (`npm ci` dari lockfile), dan Output Directory dibiarkan default.
3. **Root Directory:** `/`. **Node.js Version:** 22.x (Project Settings → General).
4. **Function Region** (Project Settings → Functions): pilih region yang paling dekat dengan region project Supabase. Contoh: Supabase di Singapore (`ap-southeast-1`) → Vercel `sin1`. Setiap halaman membuat beberapa query ke Supabase, jadi jarak region sangat terasa di kecepatan.

## 3. Environment variables

Isi di Project Settings → Environment Variables untuk **Production** dan **Preview**. Nama variabel sama dengan `.env.example`:

| Nama | Wajib | Isi | Catatan |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Ya | `https://<project-ref>.supabase.co` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ya | anon / publishable key | Aman di browser; semua akses dijaga RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Opsional | service role key | **Server saja**, jangan pernah diberi prefix `NEXT_PUBLIC_`. Hanya dipakai untuk "Delete account" di Settings |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | Opsional | site key hCaptcha | Hanya berpengaruh jika hCaptcha diaktifkan di Supabase → Authentication → Attack Protection |

Variabel `NEXT_PUBLIC_*` ditanam ke bundle saat build. Setiap kali nilainya diubah, lakukan **Redeploy**.

## 4. Daftarkan URL Vercel di Supabase Auth

Supabase → Authentication → URL Configuration:

- **Site URL:** domain produksi, misalnya `https://academy.sanggabiz.com` atau `https://v2-academy-lms-sanggabiz.vercel.app`.
- **Redirect URLs:** tambahkan
  - `https://<domain-produksi>/auth/callback`
  - `https://*-<nama-team-vercel>.vercel.app/**` (preview deployment; ganti dengan slug team Vercel Anda)
  - `http://localhost:3000/**` (pengembangan lokal)

Login Google (`signInWithOAuth`) dan link konfirmasi email memakai `origin` domain yang sedang dibuka. Tanpa langkah ini, login Google dan konfirmasi email di Vercel akan gagal dengan "redirect URL not allowed".

**Google OAuth:** di Google Cloud Console, *Authorized redirect URI* tetap `https://<project-ref>.supabase.co/auth/v1/callback`. Domain Vercel tidak perlu didaftarkan di Google.

## 5. Setelah deploy pertama

1. Buka domain Vercel, daftar akun, lalu jadikan admin pertama dengan mengubah `public.profiles.role` menjadi `superadmin` di Table Editor.
2. Logout lalu login lagi, supaya JWT memuat peran baru lewat access-token hook.
3. Uji alur inti sesuai checklist `docs/V2-UPGRADE.md` §5: buat kursus → publish → enroll sebagai learner → "Complete & continue" → kuis dengan penjelasan.
4. Jalankan audit aksesibilitas terhadap URL produksi:
   ```bash
   AUDIT_BASE_URL=https://<domain> AUDIT_LEARNER_EMAIL=... AUDIT_LEARNER_PASSWORD=... \
   AUDIT_ADMIN_EMAIL=... AUDIT_ADMIN_PASSWORD=... npm run audit:a11y
   ```

## 6. Alur kerja selanjutnya

- **Push ke `main`** → deploy Production otomatis.
- **Push ke branch lain / Pull Request** → Preview deployment dengan URL sendiri. Uji di sana dulu, lalu merge.
- Definition of done sebelum merge: lihat `docs/V2-UPGRADE.md` §7.

## Catatan

- `next.config.ts` hanya menyalakan emulator Cloudflare (`initOpenNextCloudflareForDev`) di luar Vercel. Untuk development lokal yang menargetkan Vercel, set `DEPLOY_TARGET=vercel` di `.env.local` supaya `npm run dev` tidak menyalakan wrangler/miniflare.
- File `wrangler.jsonc` dan `open-next.config.ts` diabaikan oleh Vercel. Keduanya tetap disimpan supaya opsi deploy ke Cloudflare masih tersedia.
