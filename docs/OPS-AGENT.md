# Agen Operasi: Supabase + Vercel

Setelah panduan ini dikerjakan, Anda cukup menulis perintah biasa di chat, misalnya:

- "Jalankan migrasi di Supabase."
- "Deploy v2 ke Vercel."
- "Tambahkan domain `academy.sanggabiz.com` ke Auth Supabase."
- "Kenapa deploy terakhir gagal? Cek lognya."

dan agen **`devops`** (`.claude/agents/devops.md`) yang mengerjakannya dengan Supabase CLI dan Vercel CLI. Ia memeriksa dulu, menunjukkan rencana, dan **meminta persetujuan Anda sebelum mengubah produksi**.

## Yang sudah siap (dikerjakan di repo ini)

- Supabase CLI dan Vercel CLI: dipasang otomatis oleh `bash scripts/ops-setup.sh` (bisa juga ditempel sebagai *Setup script* environment, lihat langkah 3).
- Agen `devops` dengan aturan keselamatan dan resep lengkap (migrasi berurutan, env var, deploy, Auth).
- `bash scripts/ops-preflight.sh`: pemeriksa yang menjelaskan apa yang masih kurang, dengan kata-kata sederhana.

## Yang hanya bisa Anda lakukan (sekali saja, sekitar 10 menit)

Ketiganya ada di akun Anda, jadi tidak bisa saya kerjakan dari dalam sesi. **Jangan menempelkan token ke chat.**

### Langkah 1. Buka akses jaringan
1. Di judul sesi Claude Code, buka menu **environment** → **Edit**.
2. Di **Network access**, pilih level **Limited** (atau Custom), lalu tambahkan ke **Allowed domains**:
   - `api.supabase.com`
   - `api.vercel.com`
   - `<project-ref>.supabase.co` (ID project ada di URL dashboard Supabase, mis. `ophdhuboqcvkeygjvzta`)
   - `*.pooler.supabase.com` dan `db.<project-ref>.supabase.co` (hanya jika ingin `db push` langsung)
3. Biarkan kotak **Allow package managers** tetap tercentang (agar `npm install` jalan).

### Langkah 2. Buat dan simpan token
Simpan di **Network secrets** (disebut *API credentials* di aplikasi yang belum diperbarui). Jika bagian itu tidak ada, pakai **Environment variables**.

| Nama | Cara mendapatkannya | Wajib? |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens → *Generate new token* | Ya |
| `SUPABASE_PROJECT_REF` | ID project Supabase (bukan rahasia) | Ya |
| `VERCEL_TOKEN` | vercel.com/account/tokens → *Create*, pilih scope team Anda | Ya |
| `SUPABASE_DB_PASSWORD` | Password database project Anda | Hanya untuk `db push` |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Dari `.vercel/project.json` setelah `vercel link` | Opsional |

Catatan keamanan: token Supabase memberi akses ke **semua project di akun itu**, dan token Vercel ke semua project di team-nya. Kalau Anda punya project lain, buat organisasi atau team khusus. Cabut kedua token setelah pekerjaan besar selesai (tinggal buat lagi kapan saja).

### Langkah 3. (Opsional tapi disarankan) Pasang CLI otomatis di setiap sesi
Di environment → **Setup script**, tempel satu baris ini:

```
npm install -g supabase@latest vercel@latest --no-audit --no-fund
```

### Langkah 4. Mulai sesi baru dan uji
Buka sesi baru dengan repo `v2-academy-lms-sanggabiz`, lalu ketik:

> Jalankan pemeriksa kesiapan agen operasi.

Hasil yang diharapkan: `SIAP: ... pemeriksaan lolos`. Kalau masih ada `[KURANG]`, bacanya sudah berisi petunjuk persisnya. Token dan akses jaringan baru berlaku di sesi baru, jadi memulai sesi baru itu wajib.

## Cara memakainya setelah siap

Tulis saja perintahnya. Beberapa contoh dan apa yang terjadi:

| Anda menulis | Agen melakukan | Perlu persetujuan Anda? |
|---|---|---|
| "Cek migrasi mana yang belum jalan di Supabase" | Mengecek tabel dan fungsi, menampilkan tabel sudah/belum | Tidak (hanya membaca) |
| "Jalankan migrasi yang belum" | Menampilkan daftar, menunggu "setuju", menjalankan berurutan, memverifikasi | **Ya** |
| "Cek keamanan database" | `supabase db advisors --type security` | Tidak |
| "Buat project Vercel dan isi env var-nya" | Menghubungkan repo, mengisi env var dari Supabase tanpa mencetak key | **Ya** |
| "Deploy ke produksi" | `vercel deploy --prod`, lalu uji halaman utama | **Ya** |
| "Daftarkan domain baru di Auth Supabase" | Membaca konfigurasi Auth, menampilkan perubahan, lalu menerapkannya | **Ya** |
| "Kenapa build gagal?" | Membaca log Vercel dan menjelaskan penyebabnya | Tidak |

Yang **tidak** akan dilakukan agen tanpa permintaan eksplisit: menghapus data/tabel/project, mereset database, membuat akun uji di produksi, atau mencetak token.

## Jika ada masalah

| Gejala | Artinya | Solusi |
|---|---|---|
| `request blocked: no rule or allowlist entry allows host "..."` | Host belum ada di Allowed domains | Langkah 1 |
| `AccessTokenRequiredError` | `SUPABASE_ACCESS_TOKEN` kosong di sesi ini | Langkah 2, lalu buka sesi baru |
| `token ditolak` pada pemeriksa | Token salah, kedaluwarsa, atau dicabut | Buat token baru di dashboard |
| Perintah jalan tapi project tidak ditemukan | `SUPABASE_PROJECT_REF` salah, atau token milik akun lain | Cek ID project di URL dashboard |
