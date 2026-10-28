# Glosarium UI (Bahasa Indonesia)

Seluruh antarmuka Sanggabiz Academy memakai Bahasa Indonesia (STANDAR-DIGITAL-LEARNING.md §9: satu bahasa yang konsisten). Teks diterjemahkan langsung di komponen; tidak ada library i18n, pengalih bahasa, atau lapisan kamus. Pakai istilah di bawah ini persis sama setiap kali menulis teks UI baru.

## Gaya

- Formal, sapaan "Anda", kalimat pendek, tanpa tanda seru dan tanpa emoji.
- Istilah teknis yang memang lazim dipakai profesional Indonesia boleh tetap Inggris (Dashboard, Email, Filter, Status, URL, CSV). "Login" tidak termasuk: pakai "Masuk".
- Tanggal dan angka memakai `id-ID` (`toLocaleDateString("id-ID", ...)`). Uang memakai `formatPrice()` ("Rp 150.000").
- Identifier kode, nilai enum database, path route, kelas CSS, dan data tersimpan tetap dalam bahasa Inggris.

## Istilah baku

| Inggris | Indonesia |
| --- | --- |
| Course | Kursus |
| Lesson | Pelajaran |
| Module | Modul |
| Quiz | Kuis |
| Study case / Assessment | Studi kasus |
| Question | Soal |
| Answer | Jawaban |
| Learner | Peserta |
| Instructor | Instruktur |
| Admin | Admin |
| Dashboard | Dashboard |
| Enroll | Daftar kursus (tombol: "Ikuti kursus") |
| Enrolled | Terdaftar |
| Progress | Progres |
| Certificate | Sertifikat |
| Notes / My notes | Catatan / Catatan saya |
| Save / Saved | Simpan / Tersimpan |
| Cancel | Batal |
| Delete | Hapus |
| Edit | Ubah |
| Settings | Pengaturan |
| Profile | Profil |
| Purchase | Pembelian |
| Grading | Penilaian |
| Online Tracking | Pelacakan |
| Landing Page | Halaman Depan |
| Log in / Sign in | Masuk |
| Sign up | Daftar |
| Log out | Keluar |
| Search | Cari |
| Filter | Filter |
| Draft | Draf |
| Published / Publish | Terbit / Terbitkan |
| Preview | Pratinjau |
| Next lesson | Pelajaran berikutnya |
| Previous | Sebelumnya |
| Complete & continue | Selesai & lanjut |
| Lesson 3 of 8 | Pelajaran 3 dari 8 |
| 3 of 8 lessons done | 3 dari 8 pelajaran selesai |
| Continue learning | Lanjutkan belajar |
| Course content | Isi kursus |
| Correct / Incorrect | Benar / Salah |
| Pending review | Menunggu penilaian |
| Passed / Not passed yet | Lulus / Belum lulus |
| Why: | Penjelasan: |
| Skip to main content | Langsung ke konten utama |
| My learning (judul halaman) | Belajar saya |

## Istilah turunan yang sudah dipakai

| Inggris | Indonesia |
| --- | --- |
| Basic Info | Info Dasar |
| Resources | Sumber belajar |
| Multiple choice / True-False / Short answer / Essay | Pilihan Ganda / Benar / Salah / Isian Singkat / Esai |
| Attempt | Percobaan |
| Pass score / Passing grade | Nilai lulus / Nilai kelulusan |
| Public / Private / Paid (akses kursus) | Publik / Privat / Berbayar |
| Pending / Refunded (status transaksi) | Tertunda / Dikembalikan |
| Beginner / Intermediate / Advanced | Pemula / Menengah / Lanjutan |
| Invite learner | Undang peserta |
| Reading (jenis pelajaran) | Bacaan |
| Slides | Slide |
| Untitled course / lesson | Kursus / Pelajaran tanpa judul |

## Yang sengaja tetap bahasa Inggris

- Header kolom CSV ekspor/impor nilai (`Attempt ID`, `Learner ID`, `Quiz Score`, `Q N Score (<id>)`, `Course Grade`): jalur impor membaca header ini secara harfiah.
- Penanda deskripsi sertifikat lama `[Student Name]` / `[Course Name]` tetap didukung; penanda baru adalah `[Nama Peserta]` / `[Nama Kursus]`.
- Pesan error dari database/Supabase diterjemahkan lewat `lib/db-error-message.ts` dan `lib/auth/auth-error-message.ts`; pesan aslinya hanya masuk ke log server.
