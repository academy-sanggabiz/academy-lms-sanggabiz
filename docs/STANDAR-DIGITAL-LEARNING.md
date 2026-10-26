# Standar Digital Learning yang Baik

**Panduan untuk merancang platform belajar (LMS) dan materi kursus yang berpusat pada peserta**

| | |
|---|---|
| Disusun untuk | Sanggabiz Academy |
| Sumber utama | Kursus *Educational UX/UI Design* (Habmann AufstiegsAkademie, 16 hari), repo `AION-HABMANN/aion-digital-learning`: materi Day 1–16 (`materi-task-docx/_source/`), `DL-STANDARD.md` v1.8, `CLAUDE.md`, `MATERIAL-GUIDE.md`, `CURRICULUM-GUIDE.md` |
| Situs referensi | https://aion-dl.vercel.app/ (playground kursus, satu halaman per hari: `/day/N/`) |
| Tanggal | 26 Oktober 2026 |

> **Catatan sumber.** Isi dokumen ini diringkas dan diterjemahkan dari materi di repo tersebut. Nama teori, standar, dan tahun ditulis sesuai kutipan di materi aslinya; daftar referensi lengkap ada di bagian 12. Aturan hukum (BFSG, EU AI Act, EN 301 549) sedang berubah, jadi cek ulang teks dan tanggalnya sebelum dijadikan dasar keputusan.

---

## Daftar isi

1. Sepuluh prinsip inti
2. Fondasi: UX, UI, dan desain berpusat pada pengguna
3. Struktur, arsitektur informasi, dan navigasi
4. Psikologi belajar dan beban kognitif (desain materi)
5. Feedback dan progres
6. Motivasi dan gamifikasi
7. Adaptive learning dan personalisasi
8. Aksesibilitas dan desain inklusif (WCAG 2.2)
9. Bahasa sederhana dan antarmuka yang intuitif
10. Mobile learning, microlearning, dan lintas perangkat
11. Persona dan user journey
12. Testing, data, dan KPI
13. Mengambil keputusan desain di bawah ketidakpastian
14. Standar desain tugas dan latihan (dari cara AION membangun kursusnya)
15. Standar penulisan materi
16. Angka acuan cepat
17. Daftar anti-pattern
18. Checklist audit sebuah kursus/LMS
19. Penerapan ke Sanggabiz LMS
20. Referensi

---

## 1. Sepuluh prinsip inti

1. **Keberhasilan belajar adalah keberhasilan UX.** Peserta yang tidak bisa menemukan, memahami, atau menyelesaikan pelajaran tidak akan belajar, sebagus apa pun isinya.
2. **Desain dari tujuan peserta, bukan dari logika sistem.** Contohnya kartu "Lanjutkan: Pelajaran 3 dari 8", bukan menu 8 fitur.
3. **Struktur dulu, baru tampilan.** Perbaikan warna tidak memperbaiki masalah struktur ("structure beats visual design").
4. **Kurangi beban yang tidak membantu belajar, tetapi pertahankan usaha yang memang membuat orang belajar.** Kesulitan yang perlu, seperti latihan mengingat dan soal penerapan, tetap dipertahankan.
5. **Setiap aksi dijawab.** Feedback menyatakan apa yang terjadi, kenapa, dan apa langkah berikutnya.
6. **Progres harus jujur.** Progres dihitung dari hal nyata (pelajaran selesai), bukan dari klik.
7. **Hadiahi pembelajaran, bukan aktivitas.** Poin untuk login atau membuka halaman hanya melatih orang untuk login dan membuka halaman.
8. **Aksesibilitas adalah standar, bukan tambahan.** WCAG 2.2 AA adalah batas minimum, bukan tujuan akhir.
9. **Data menunjukkan gejala, bukan penyebab.** Angka memberi tahu *di mana* masalahnya, pengamatan pengguna memberi tahu *kenapa*.
10. **Uji kecil dan cepat, lalu ulangi.** Mulai dari prototipe kasar, uji ke sekitar 5 pengguna, perbaiki, lalu uji lagi.

---

## 2. Fondasi: UX, UI, dan desain berpusat pada pengguna

**Definisi**
- **UX** adalah keseluruhan pengalaman pengguna dengan layanan dan produk (Norman & Nielsen). **UI** hanyalah permukaannya.
- **Usability** menurut ISO 9241-11: pengguna tertentu mencapai tujuan tertentu secara efektif, efisien, dan memuaskan dalam konteks penggunaan tertentu.
- **Human-centred design** menurut ISO 9241-210 punya enam prinsip:
  1. Pahami pengguna, tugas, dan lingkungannya secara eksplisit.
  2. Libatkan pengguna di seluruh proses.
  3. Gerakkan dan perbaiki desain lewat evaluasi oleh pengguna.
  4. Kerjakan secara iteratif.
  5. Tangani seluruh pengalaman, bukan hanya layar.
  6. Kerjakan dalam tim multidisiplin.

**Tiga pertanyaan peserta yang tidak terucap:** *Bisa saya temukan? Bisa saya pahami? Bisa saya selesaikan?*

**Tiga kelompok pengguna LMS dengan tujuan berbeda**

| Kelompok | Yang dibutuhkan |
|---|---|
| Peserta | Jalur yang jelas, pelajaran yang mudah dibaca, tanda kemajuan |
| Pengajar/admin | Alat sederhana untuk membuat dan memperbarui kursus serta melihat status peserta |
| Organisasi/klien | Laporan penyelesaian, sertifikat, keandalan |

**Tiga prinsip layar belajar yang baik:** (1) orientasi yang jelas: saya di mana dan apa berikutnya; (2) beban kognitif rendah; (3) feedback dan progres.

**Aturan keputusan**
- Jelaskan masalah sebagai *apa yang tidak bisa dilakukan, dipahami, atau dirasakan peserta*, bukan sebagai "apa yang kelihatan jelek".
- Tanyakan pada setiap layar dan fitur: *tujuan siapa yang dilayani?* Layar yang hanya melayani struktur sistem (misalnya menu admin yang terlihat oleh peserta) adalah kegagalan.
- Kelompokkan temuan ke tiga area:
  - **Orientasi:** saya di mana, apa berikutnya.
  - **Pemahaman:** panjang teks, struktur, istilah yang tidak dijelaskan.
  - **Motivasi:** progres, feedback setelah kuis.
- Angka drop-out adalah **akibat**, bukan penyebab.
- Gunakan model Kano (Kano et al. 1984):
  - Kebutuhan dasar (*must-be*), misalnya "menemukan kursus saya", baru disadari ketika tidak ada.
  - Fitur baru tidak menyelamatkan kebutuhan dasar yang rusak.
- Setiap fitur baru wajib punya **masalah pengguna yang bernama, metrik, dan pemilik** sebelum masuk roadmap. Ini mencegah *feature creep* (Norman 2013).

---

## 3. Struktur, arsitektur informasi, dan navigasi

**Prinsip**
- Arsitektur informasi (IA) punya empat sistem (Rosenfeld, Morville & Arango 2015): organisasi, pelabelan, navigasi, dan pencarian.
- Navigasi menjawab tiga pertanyaan:
  - **Menu:** ke mana saya bisa pergi.
  - **Path/breadcrumb:** saya di mana.
  - **Indikator progres:** sejauh mana saya dan berapa yang tersisa.
- **Krug's trunk test** (2014): dari halaman mana pun, pengunjung harus bisa menyebut situs apa ini, halaman apa ini, bagian-bagian utamanya, pilihannya, dan posisinya.
- **Progressive disclosure** (Nielsen 2006): pemula melihat sedikit, sedangkan opsi lanjutan diletakkan di balik "Lainnya".

**Aturan**
- **Satu konten, satu rumah.** Konten yang sama di dua tempat atau dengan dua nama adalah masalah struktur.
- **Beri nama bagian sesuai tindakan peserta**, misalnya *Belajar, Cari, Progres, Bantuan*, bukan nama modul sistem seperti "Hub" atau "Content Repository".
- **Menu utama pendek (sekitar 6 entri).** Hick's law (Hick 1952): waktu memilih bertambah seiring jumlah opsi.
- Jika butuh lebih dari 3 tingkat (bagian → grup → item) untuk mencapai sebuah pelajaran, pertanyakan apakah struktur atau isinya yang terlalu besar.
- **Satu aksi utama per layar.** Aksi utama mendapat bobot visual terkuat, sedangkan aksi sekunder dibuat lebih tenang.
- **Label CTA berbentuk kata kerja + objek**, misalnya "Lanjutkan: Pelajaran 3" atau "Mulai kuis", bukan "Submit form".
- **Fungsi yang sama selalu tampil sama** (heuristik konsistensi, Nielsen 1994).
- **Hierarki visual** memakai ukuran, warna, kontras, dan posisi. Prinsip Gestalt kedekatan dan kemiripan sudah mengelompokkan elemen tanpa perlu kotak.
- **Fitts's law** (Fitts 1954): target utama dibuat besar dan dekat dengan titik perhatian, terutama di ponsel.
- **Waktu respons** (Nielsen 1993):
  - ±0,1 detik terasa instan.
  - ±1 detik masih menjaga alur pikir.
  - 10 detik adalah batas perhatian.
  - Jika lebih lama dari ±1 detik, tunjukkan bahwa sesuatu sedang diproses.
- **Uji struktur sebelum membangun:** card sort untuk pengelompokan dan tree test untuk kemudahan menemukan (Spencer 2009).

**Urutan prioritas lapisan desain**

| Urutan | Lapisan | Dampak bisnis tipikal |
|---|---|---|
| 1 | Struktur | Penyelesaian kursus, jumlah tiket support |
| 2 | Hierarki | Task success, waktu untuk mulai |
| 3 | Pemandu (path, Next, progres) | Progres, return rate |
| 4 | Permukaan (warna, ilustrasi) | Persepsi merek; efek ke belajar kecil kecuali strukturnya sudah benar |

**Tiga masalah navigasi dan obatnya**

| Masalah | Obat |
|---|---|
| Terlalu banyak pilihan | Kelompokkan, pangkas, urutkan, beri filter |
| Label tidak jelas | Gunakan nama tindakan ("Mulai kuis") |
| Tidak ada orientasi | Path, "Pelajaran 3 dari 8", tombol Next, judul halaman |

**Interaksi.** Interaksi baru berguna jika terikat pada tujuan, membuat peserta berpikir, dan menjawab balik.
- ICAP (Chi & Wylie 2014): pasif < aktif < konstruktif < interaktif.
- Letakkan pertanyaan pendek di dalam pelajaran, bukan kuis yang memblokir halaman berikutnya.
- Satu interaksi bertarget per bagian sudah cukup.

| Tempat | Cocok | Tidak cocok |
|---|---|---|
| Awal | Satu pertanyaan pemanasan, polling tingkat percaya diri | Kuis panjang |
| Tengah | Pertanyaan pendek setelah satu bagian, skenario klik | Pop-up yang memblokir halaman berikutnya |
| Akhir | Tugas penerapan, catatan refleksi | Skor tanpa penjelasan atau langkah berikutnya |

---

## 4. Psikologi belajar dan beban kognitif (desain materi)

**Tiga langkah belajar.** Layar bisa gagal di setiap langkah (Atkinson & Shiffrin 1968):

| Langkah | Gejala jika gagal |
|---|---|
| Intake (perhatian memilih) | "Tidak tahu harus lihat apa" |
| Processing (working memory mengolah) | "Kehilangan alur" |
| Storage (memori jangka panjang menyimpan) | "Lupa kemudian" |

**Tiga tingkat belajar** (Bloom revisi, Anderson & Krathwohl 2001):
- Menyajikan materi paling banter mendukung *mengingat*.
- *Memahami* butuh contoh dan kaitan dengan apa yang sudah diketahui peserta.
- *Menerapkan* butuh tugas dan feedback.

**Cognitive Load Theory** (Sweller 1988; Sweller et al. 1998)

| Jenis beban | Asalnya | Tindakan |
|---|---|---|
| Intrinsic | Dari materi itu sendiri | Atur urutannya, jangan hapus konten yang diperlukan |
| Extraneous | Dari desain | **Pangkas** |
| Germane | Usaha untuk memahami | Beri ruang |

**Aturan desain materi**
- **Working memory:** rencanakan sekitar **4 potongan** untuk materi baru (Cowan 2001). Angka 7±2 dari Miller (1956) terlalu optimistis untuk hal baru.
- **Unit 5–7 menit dengan satu tujuan.**
- **Urutan baca pelajaran:** judul → kalimat kunci → penjelasan.
- **79% pengguna memindai halaman; hanya 16% membaca kata per kata** (Nielsen 1997). Jadi gunakan heading dan satu gagasan per paragraf.
- **Prinsip multimedia** (Mayer & Moreno 2003; Mayer 2009):
  - *Coherence:* buang yang tidak relevan.
  - *Signalling:* tandai yang penting.
  - *Segmenting:* pecah materi.
  - *Spatial contiguity:* label diletakkan di dalam gambar, bukan di keterangan terpisah.
- **Seductive details**, yaitu dekorasi menarik yang tidak relevan, justru menurunkan hasil belajar (Harp & Mayer 1998).
- **Retrieval mengalahkan membaca ulang** (Roediger & Karpicke 2006), dan **spacing** membantu (Cepeda et al. 2006). Pertanyaan mengingat singkat di awal pelajaran berikutnya memakai keduanya; tombol "ulangi seluruh pelajaran" tidak memakai keduanya.
- **Expertise reversal** (Kalyuga et al. 2003): bantuan yang pas untuk pemula memperlambat orang yang sudah ahli. Beri pemula banyak dukungan, dan biarkan yang ahli melewatinya.
- **Checklist konten setiap pelajaran baru:**
  1. Satu tujuan.
  2. Ukuran yang muat di waktu yang tersedia.
  3. Kalimat kunci ditandai.
  4. Istilah dijelaskan.
  5. Ada cek di akhir.

**Aturan keputusan**
- Sebagian besar keluhan "terlalu rumit" berasal dari beban extraneous: terlalu banyak sekaligus, tidak ada struktur visual, tidak ada urutan.
- **Kurangi dulu sebelum menambah.**
- Peserta yang berhenti di awal biasanya menunjukkan masalah intake atau processing, bukan motivasi. Periksa layarnya sebelum menyalahkan motivasi.
- Nilai dari dua lensa sekaligus: efektivitas dan efisiensi. Usaha yang lebih ringan tetapi hasil belajar yang lebih rendah bukan perbaikan.
- Dua risiko yang harus dibedakan:
  - **Terlalu sederhana:** angka penyelesaian tinggi, tetapi peserta merasa paham tanpa bisa menerapkan.
  - **Terlalu kompleks:** drop-out tinggi dan waktu lama di pelajaran awal.
  - Membedakan keduanya butuh dua ukuran: ukuran *penyelesaian* dan ukuran *bisa melakukan*.
- **Definisi UX yang efektif untuk belajar:** "peserta dengan level yang dituju bisa mencapai tujuan belajar yang dinyatakan dengan usaha non-belajar seminimal mungkin, dibuktikan dengan apa yang bisa mereka jelaskan atau lakukan sesudahnya."
- **Cek efektivitas murah:** minta 5 pemula menjelaskan poin kunci pelajaran. Jika kurang dari 4 dari 5 bisa, perbaiki pelajarannya.

---

## 5. Feedback dan progres

**Feedback yang baik menjawab tiga pertanyaan** (Hattie & Timperley 2007): *Mau ke mana? Bagaimana saya sekarang? Apa berikutnya?*

| Jenis | Contoh | Dipakai untuk |
|---|---|---|
| Langsung | Benar/salah dengan penjelasan, centang "tersimpan" | Aksi tunggal |
| Tidak langsung | Progress bar, status pelajaran, catatan milestone | Kursus secara keseluruhan |

**Aturan feedback**
- Feedback harus **informatif**, bukan hiasan. "4 dari 5 benar. Pelajari lagi soal 2" lebih berguna daripada "Kerja bagus!".
- **Pesan error** menyebut apa yang salah dan apa yang harus dilakukan. "Tambahkan file, lalu tekan Kirim" lebih baik daripada "Error 4012".
- Beri feedback di titik yang penting (tugas selesai, kesalahan, milestone) dan diam di tempat lain.
- Maksimal satu pesan per tugas. Detailnya diletakkan di balik tautan "Kenapa?".
- Setiap aksi mendapat feedback, dan setiap tugas punya penutup yang jelas (Shneiderman et al. 2016).

**Aturan progres**
- Hitung dari hal nyata dan beri label, misalnya "3 dari 8 pelajaran selesai · sekitar 20 menit lagi".
- Status pelajaran cukup **tiga keadaan**: belum, sedang, selesai.
- Untuk kursus panjang, tampilkan juga target kecil pertama, misalnya modul pertama.
- Efek *goal-gradient* dan *endowed progress* (Kivetz et al. 2006; Nunes & Drèze 2006): orang berusaha lebih keras saat mendekati target, dan memberi "awal" membantu. **Tetapi awal yang tidak nyata adalah kecurangan.**
- Kemajuan dalam pekerjaan yang bermakna adalah motivator harian terkuat (Amabile & Kramer 2011).
- Untuk aksesibilitas, status ditulis dengan kata, tidak hanya dengan warna, dan progress bar punya nama serta nilai yang bisa dibaca screen reader.

| Elemen progres | Risiko |
|---|---|
| Bar yang menghitung klik | Menyesatkan |
| Level yang tidak menyebut apa yang diukur | Tanpa makna |
| Estimasi waktu pada kursus sangat panjang | Mengecilkan semangat |
| Bar yang melompat ke 90% setelah satu pelajaran lalu merayap | Merusak kepercayaan |

**Konflik dan aturannya**

| Konflik | Aturan |
|---|---|
| Kepadatan vs kejelasan | Tampilkan yang menentukan langkah berikutnya (selesai, sisa waktu, pelajaran berikutnya); sisanya satu klik di bawah |
| Feedback vs kelebihan beban | Feedback di titik penting, diam di tempat lain |
| Fleksibilitas vs konsistensi | Layout boleh menyesuaikan; komponen dan maknanya tetap |

---

## 6. Motivasi dan gamifikasi

**Self-Determination Theory** (Ryan & Deci 2000)

| Kebutuhan | Dipenuhi platform dengan |
|---|---|
| Otonomi | Pilihan topik atau urutan, kecepatan sendiri, alasan untuk setiap langkah |
| Kompetensi | Tujuan jelas, hasil dengan langkah berikutnya, catatan keterampilan, tingkat kesulitan yang pas |
| Keterhubungan | Tujuan kelompok, kelompok belajar, komentar pengajar |

**Prinsip**
- **Motivasi tidak sama dengan gamifikasi.**
- Motivasi ekstrinsik (hadiah atau hukuman) memudar ketika hadiahnya hilang. Motivasi intrinsik (minat, makna) bertahan.
- **Overjustification:** hadiah nyata yang diharapkan untuk sekadar ikut serta menurunkan minat yang sudah ada. Feedback yang informatif tidak berdampak demikian (Lepper et al. 1973; meta-analisis Deci, Koestner & Ryan 1999).
- Gamifikasi adalah elemen permainan di konteks non-permainan (Deterding et al. 2011). Efeknya sering positif tetapi bergantung konteks (Hamari, Koivisto & Sarsa 2014). Jadi nilai **per elemen**, bukan secara keseluruhan.
- Lima prinsip desain yang memotivasi:
  1. Kejelasan: satu kalimat tujuan per unit.
  2. Aktivasi: tugas pendek di dalam unit.
  3. Feedback: hasil plus langkah berikutnya.
  4. Progresi: "3 dari 8 selesai".
  5. Relevansi: contoh dari pekerjaan nyata sebelum aturannya.
- **Flow** muncul ketika tantangan sepadan dengan kemampuan (Csikszentmihalyi 1990). Tujuan yang spesifik dan menantang lebih efektif daripada tujuan yang samar (Locke & Latham 2002).
- **Fogg Behavior Model** (2009): perilaku = motivasi + kemampuan + pemicu. Periksa kemampuan dan pemicu sebelum menambah motivasi.

| Elemen | Fungsinya | Yang bisa dihadiahinya |
|---|---|---|
| Poin | Menghitung aksi | Aksi, entah mengajarkan sesuatu atau tidak |
| Badge | Menandai pencapaian | Hasil nyata atau sekadar usaha, tergantung aturannya |
| Level | Menunjukkan tahap | Bermakna hanya jika menyebut apa yang dikuasai |
| Leaderboard | Membandingkan orang | Peringkat; kebanyakan orang tidak bisa menang |
| Progress bar | Menunjukkan sejauh mana | Kemajuan, jika menghitung hal nyata |

**Aturan**
- Setiap elemen harus melayani satu tujuan belajar. Elemen yang tidak melayani tujuan apa pun dibuang.
- Urutan pembangunan: **progres dan feedback dulu → pilihan/suara peserta → hadiah dan kompetisi paling akhir.**
- **Cek insentif terbalik:** untuk setiap hadiah, tuliskan cara termurah untuk mendapatkannya. Contohnya, poin untuk membuka pelajaran menghasilkan pelajaran yang dibuka tetapi tidak dibaca.
- **Uji etika:** jika Anda tidak nyaman menjelaskan mekanismenya kepada peserta, jangan dirilis.
- Jangan pernah meletakkan hadiah di antara peserta dan tugasnya.
- Jangan memakai rasa takut kehilangan sebagai pendorong utama. Streak yang menghukum hari yang terlewat memanfaatkan loss aversion (Kahneman et al. 1993).
- Biarkan peserta tetap memegang kendali, misalnya bisa mematikan badge.
- **Buktikan dengan pilot dan kelompok kontrol:** separuh peserta mendapat mekanisme baru, lalu bandingkan return rate dan tujuan yang dikuasai.

| Konflik | Aturan |
|---|---|
| Jangka pendek vs berkelanjutan | Pilih yang tetap bekerja saat hadiah berhenti |
| Motivasi vs manipulasi | Jangan jadikan rasa kehilangan atau takut sebagai pendorong utama |
| Engagement vs kelebihan beban | Tambah satu elemen, buang satu elemen |
| Motivasi vs usability | Hadiah tidak boleh menghalangi tugas |

---

## 7. Adaptive learning dan personalisasi

**Cara kerja sistem adaptif:** kumpulkan data perilaku → analisis (progres, kesalahan, kecepatan) → sesuaikan konten atau tingkat kesulitan (Brusilovsky 2001).

| Langkah | Titik gagal |
|---|---|
| Kumpulkan | Data terlalu sedikit atau salah |
| Analisis | Kesimpulan besar dari satu data |
| Sesuaikan | Perubahan diam-diam atau tidak bisa dibatalkan |

**Tiga tingkat adaptasi**
1. Pilihan peserta.
2. Aturan, misalnya "jika pre-test ≥ 80%, lewati unit 1".
3. Algoritma/machine learning. Ini butuh banyak peserta, data yang baik, dan varian konten. Risikonya: cold start, black box, bias, dan kewajiban hukum.

| | Berbasis aturan (if-then) | Model (machine learning) |
|---|---|---|
| Kebutuhan | Data sedikit; aturan ditulis orang | Banyak data bagus, keahlian membangun dan memeriksa |
| Menjelaskan | Mudah ("karena Anda lulus tes") | Sulit; alasannya ada di dalam kotak |
| Risiko tipikal | Aturan terlalu kasar untuk sebagian peserta | Tebakan salah dari data tipis atau bias |

**Aturan**
- **Lebih banyak teknologi bukan berarti UX lebih baik.** Pilih teknik paling sederhana yang cocok dengan data yang ada.
- Bangun dalam dua tahap: aturan yang bisa dijelaskan dulu, model kemudian jika datanya sudah cukup.
- **"Personalisasi hanya sejauh Anda bisa menjelaskannya."** Peserta harus bisa *melihat, memahami, dan mengubah* adaptasinya (Amershi et al. 2019).
- Empat pola personalisasi yang layak:
  - Rekomendasi dengan alasan, dan daftar lengkap tetap bisa dijangkau.
  - Tingkat kesulitan yang ditampilkan, dengan tombol batal.
  - Jalur dinamis yang bagian adaptasinya ditandai di peta.
  - Feedback yang menyebut perilaku dan langkah berikutnya.
- **Hindari over-adaptation:** jangan bereaksi keras terhadap satu kesalahan. Sesuaikan perlahan dan sediakan jalan kembali.
- **Cold start:** gunakan kuesioner awal singkat yang bisa diedit, lalu biarkan perilaku peserta menyempurnakannya.
- Personalisasi di bagian yang peserta memang berbeda dan datanya bisa dipercaya. Selebihnya distandarkan.
- **Hukum:** GDPR Pasal 22 membatasi keputusan yang sepenuhnya otomatis. EU AI Act menggolongkan AI pendidikan yang menilai hasil atau mengarahkan belajar sebagai berisiko tinggi; aturan ini masih berubah, jadi cek dulu.

---

## 8. Aksesibilitas dan desain inklusif (WCAG 2.2)

**Prinsip**
- Usability bertanya apakah pengguna tipikal merasa mudah. **Desain inklusif bertanya siapa yang tertinggal.** Dasarnya Universal Design for Learning (CAST 2024) dan Microsoft Inclusive Design (2016).
- **Persona spectrum:** keterbatasan bisa permanen, sementara, atau situasional. Takarir (caption) melayani orang tuli, orang yang sedang infeksi telinga, dan orang di kereta yang bising.
- Sekitar 1,3 miliar orang, kira-kira 1 dari 6, hidup dengan disabilitas signifikan (WHO 2022).
- Dampak sebuah hambatan bisa **memperlambat** (masih ada jalan pintas), **menghentikan** (tidak ada jalan), atau **membuat orang hilang diam-diam**. Hambatan yang menghentikan sebuah kelompok lebih berat daripada yang memperlambat.
- **WCAG adalah lantai, bukan tujuan.** Level **AA** adalah target yang lazim dan yang diminta standar Eropa.

**Empat prinsip POUR**

| Prinsip | Arti | Contoh hambatan |
|---|---|---|
| Perceivable | Bisa dilihat/didengar | Teks pucat, gambar tanpa deskripsi |
| Operable | Bisa dioperasikan dengan berbagai perangkat | Menu hanya-mouse, tombol kecil, kuis hanya drag |
| Understandable | Bisa diikuti | Dinding teks, menu 7 tingkat, batas waktu kaku |
| Robust | Bekerja dengan teknologi bantu | Kontrol custom tanpa nama/peran |

**Kriteria WCAG 2.2 yang paling relevan untuk LMS**

| Kriteria | Level | Isi |
|---|---|---|
| 1.1.1 Text alternatives | A | Alt text untuk setiap gambar/grafik yang berisi informasi; gambar dekoratif tanpa alt |
| 1.2.2 Captions | A | Takarir untuk video rekaman |
| 1.4.1 Use of colour | A | Warna bukan satu-satunya penanda (mis. status benar/salah) |
| 1.4.3 Contrast | AA | Teks normal ≥ **4,5:1**, teks besar ≥ **3:1** |
| 1.4.4 Resize text | AA | Bisa diperbesar sampai 200% |
| 1.4.10 Reflow | AA | Tanpa scroll dua arah pada lebar 320 CSS px |
| 2.1.1 Keyboard | A | Semua fungsi bisa dipakai dengan keyboard |
| 2.2.1 Timing adjustable | A | Batas waktu (mis. kuis berwaktu) bisa diatur/diperpanjang |
| 2.4.7 Focus visible | AA | Fokus keyboard terlihat |
| 2.4.11 Focus not obscured | AA (baru) | Fokus tidak tertutup header lengket |
| 2.5.7 Dragging movements | AA (baru) | Ada alternatif untuk setiap drag-and-drop |
| 2.5.8 Target size | AA (baru) | Target sentuh ≥ **24×24 CSS px** (sasaran praktis 44 px) |
| 3.1.1 Language of page | A | Bahasa halaman diset |
| 3.3.2 Labels or instructions | A | Setiap input punya label/instruksi |
| 3.3.8 Accessible authentication | AA (baru) | Login tidak menuntut tes kognitif (teka-teki, mengingat); izinkan password manager |
| 4.1.2 Name, role, value | A | Kontrol custom terbaca teknologi bantu |

WCAG 2.2 adalah W3C Recommendation sejak Oktober 2023, berisi 86 kriteria (9 kriteria baru dibanding 2.1, dan 4.1.1 Parsing dihapus). Aturan pertama ARIA: pakai HTML native jika HTML native sudah cukup.

**Aturan proses: sisipkan aksesibilitas ke setiap tahap**

| Tahap | Praktik |
|---|---|
| Perencanaan | Persona dan journey memasukkan peserta dengan kebutuhan akses |
| Desain | Pattern library dicek terhadap WCAG |
| Pengembangan | Aksesibilitas masuk *definition of done* + cek otomatis tiap rilis |
| Konten | Standar bahasa sederhana dan takarir untuk penulis materi |
| Pembelian | Tool pihak ketiga dicek sebelum dibeli |
| Support | Kanal pelaporan hambatan akses dengan janji waktu balas |

**Aturan keputusan**
- Alat otomatis hanya menemukan sebagian hambatan. Tetap uji manual dengan keyboard ("simpan mouse, tekan Tab") dan screen reader, lalu uji dengan pengguna.
- Perbaiki sumbernya (konten, kode) sebelum menambah lapisan di atasnya.
- **Jangan memakai overlay/plugin aksesibilitas** yang menjanjikan kepatuhan otomatis. Itu risiko, bukan solusi.
- **Jangan membuat "versi aksesibel" terpisah**: tidak inklusif, dan pemeliharaannya jadi dua kali.
- Prioritaskan perbaikan murah yang luas jangkauannya, lalu yang mahal dan luas secara bertahap mulai dari kursus yang paling sering dipakai. Hindari yang mahal dan sempit.
- Ukur per kelompok pengguna, karena rata-rata menyembunyikan kelompok yang tersisih.
- Jangan pernah mengklaim "sepenuhnya aksesibel". Pernyataan aksesibilitas adalah klaim, bukan ukuran.
- **Konteks hukum** (masih berubah; cek dengan ahli hukum):
  - EN 301 549 adalah standar Eropa yang merujuk WCAG.
  - BFSG di Jerman, implementasi European Accessibility Act, berlaku sejak 28 Juni 2025 untuk banyak layanan digital konsumen.
  - Untuk Indonesia, cek regulasi aksesibilitas yang berlaku, misalnya turunan UU No. 8/2016 tentang Penyandang Disabilitas. Bagian ini tambahan penyusun, bukan dari materi sumber.

---

## 9. Bahasa sederhana dan antarmuka yang intuitif

**Prinsip:** "Bahasa adalah akses, dan akses adalah penggunaan." Dasarnya ISO 24495-1 (plain language) dan panduan *How to write clearly* dari Komisi Eropa (2011).

**Aturan menulis**
- Satu gagasan per kalimat, kata sehari-hari, hal terpenting di depan.
  - Contoh: satu kalimat 52 kata dipecah menjadi tiga kalimat masing-masing ±15 kata.
- Istilah teknis dijelaskan saat pertama muncul. Lebih baik lagi, sediakan glosarium yang bisa diklik (lihat bagian 14).
- Kalimat pendek saja tidak cukup jika istilahnya tetap sulit.
- Pisahkan **kompleksitas materi** (dipertahankan) dari **kompleksitas antarmuka** (dihilangkan). Gunakan lapisan: poin utama sederhana di depan, detail satu klik di bawah.
- Pihak yang paling dirugikan oleh bahasa yang sulit: peserta baru, pembaca bahasa kedua, orang dengan disleksia atau perhatian rendah.

**Tiga prinsip usability untuk antarmuka intuitif** (Nielsen 1994)

| Prinsip | Kegagalan tipikal | Perbaikan |
|---|---|---|
| Efisiensi | 5 klik untuk menandai pelajaran selesai | Satu tombol |
| Pencegahan error | Tombol Kirim jalan tanpa file, error muncul belakangan | Kirim baru aktif/menjelaskan setelah file ditambahkan |
| Konsistensi | "Save/Submit/Apply" untuk satu aksi yang sama | Satu kata di mana-mana |

**Aturan keputusan**
- **Sederhanakan dulu, tambah fungsi kemudian.** Menambah chat, manual 40 halaman, atau pusat bantuan tidak memperbaiki platform yang membingungkan.
- Uji dengan pemula dan ahli sekaligus, supaya penyederhanaan tidak membuang konten yang dibutuhkan.

---

## 10. Mobile learning, microlearning, dan lintas perangkat

**Prinsip:** konteks penggunaan menentukan desain. **Mobile bukan desktop yang dikecilkan** (Budiu 2015; Sharples et al. 2007).

| | Di meja | Di perjalanan dengan ponsel |
|---|---|---|
| Waktu | Satu jam atau lebih | Beberapa menit |
| Perhatian | Tinggi | Rendah, sering terputus |
| Tangan/layar | Dua tangan, layar besar, keyboard | Satu tangan, layar kecil, jempol |
| Yang cocok | Bacaan panjang, tabel, proyek | Unit pendek, cek cepat, pengingat |

**Standar unit microlearning** (Hug 2005)
- Satu tujuan per unit.
- Durasi sekitar **3–7 menit**, bisa selesai di sela waktu istirahat.
- Berdiri sendiri, tetapi menunjukkan posisinya di dalam kursus.
- Diakhiri cek singkat, ditambah cek di level kursus. Ini mencegah pengetahuan terfragmentasi.
- Ada kartu "Lanjutkan" yang mengingat posisi terakhir.
- Prinsipnya bukan "pendek pasti lebih baik", melainkan "setiap unit punya satu tujuan dan satu cek".

**Aturan**
- **Mobile first** (Wroblewski 2011) adalah cara kerja, bukan klaim bahwa semua orang memakai ponsel.
- Satu aksi utama per layar. Tabel diubah menjadi kartu. Teks panjang dipecah. Aksi utama diletakkan di jangkauan jempol.
- Target sentuh: aim ±44 px; minimum WCAG 2.2 AA adalah 24 px.
- **Lintas perangkat = satu pengalaman.** Progres, bookmark, dan posisi terakhir tersinkron; nama dan logika sama di semua perangkat; hanya layout yang menyesuaikan.
- Satu platform dan satu akun. Tolak situs mobile terpisah (jadi dua produk), dan tolak aplikasi native tanpa kebutuhan yang jelas karena itu keputusan yang sulit dibatalkan.
- Tentukan konten mana yang *phone-first*, mana yang *desktop-first*, dan mana yang *identik di semua perangkat* (progres, bookmark, nama).
- Uji di ponsel peserta sendiri, sebagian sambil bergerak, dengan 5–8 orang. Pecah angka drop-out dan penyelesaian per perangkat.

| Perangkat | Penggunaan tipikal | Yang ditaruh di depan |
|---|---|---|
| Ponsel | Beberapa menit, satu jempol | Lanjutkan, progres, pertanyaan pendek |
| Tablet | Duduk, waktu sedang | Pelajaran dengan daftar pelajaran di samping |
| Desktop | Sesi panjang | Pelajaran, catatan, katalog lengkap |

---

## 11. Persona dan user journey

**Persona** adalah profil representatif yang dipakai sebagai alat keputusan, bukan hiasan (Cooper 1999). Persona baru berguna jika berbasis data dan dipakai untuk memutuskan sesuatu (Pruitt & Grudin 2003).

**Isi persona:**
- Tujuan, ditulis sebagai alasan dalam hidup orang itu.
- Masalah, ditulis sebagai situasi, bukan vonis.
- Konteks penggunaan: waktu, perangkat, sukarela atau wajib.
- Harapan terhadap platform belajar.

**Aturan**
- 2–3 persona biasanya cukup. Buat persona terpisah untuk peserta, pengajar, dan organisasi pembeli.
- Segmentasikan berdasarkan perilaku, tujuan, dan situasi, **bukan demografi**. "Wanita usia 30–45" bukan segmen yang berguna.
- Setiap pernyataan dalam persona diberi sumber: wawancara, tiket support, atau log. Pernyataan tanpa sumber adalah hipotesis. Proto-persona dari asumsi harus diberi label hipotesis (Gothelf & Seiden 2013).
- **Uji persona:** keputusan apa yang berubah karena persona ini? Jika tidak ada, persona itu hanya dekorasi.
- Tetapkan **satu persona primer**. Persona sekunder dilayani selama tidak merugikan yang primer.

**User journey**
- Isi journey map: satu aktor (satu persona), skenario, fase, aksi dan pikiran, emosi, serta pain point (Gibbons 2018).
- Fase journey belajar: **masuk (onboarding) → belajar (pemakaian) → progres → penyelesaian.** Untuk pengajar: siapkan → jalankan → tinjau.
- "Berpikir dalam proses, bukan layar." Masukkan juga touchpoint di luar layar: email, pengingat, laporan.
- Tandai fase kritis, yaitu saat emosi paling rendah atau saat orang berhenti.
- **Peak-end rule** (Kahneman et al. 1993): fase penyelesaian (sertifikat, ringkasan hasil) lebih berbobot dalam ingatan daripada durasinya.
- Pain point yang muncul berulang di beberapa persona menunjukkan penyebab sistemik yang bisa diatasi dengan satu perbaikan.

---

## 12. Testing, data, dan KPI

**Dua jenis pengujian. Biasanya butuh keduanya: angka menemukan *di mana*, pengamatan menemukan *kenapa*.**

| Jenis | Metode | Memberi tahu |
|---|---|---|
| Kualitatif | Usability test, observasi, think-aloud, wawancara | Kenapa (dari sedikit orang) |
| Kuantitatif | Analytics, A/B test (Kohavi et al. 2020), survei | Berapa banyak, versi mana lebih baik |

**Metode cepat**

| Metode | Cara | Menunjukkan |
|---|---|---|
| Usability test | 5–8 peserta, tugas yang ditetapkan, ada pengamat | Di mana pengguna nyata tersangkut |
| Five-second test | Layar ditampilkan 5 detik, lalu "tentang apa tadi?" | Dipahami sekilas atau tidak |
| Comprehension check | Peserta menjelaskan ulang teks | Teksnya dipahami atau tidak |
| Think-aloud | Peserta bicara sambil bekerja | Alasan di balik berhenti |
| Card sort / tree test | Mengelompokkan / mencari di struktur | Struktur menu yang benar |
| SUS (Brooke 1996) | 10 butir kuesioner, skor 0–100 | Kepuasan usability secara umum |

- **Aturan 5 pengguna** (Nielsen 2000; Nielsen & Landauer 1993): 1 pengguna menemukan ±31% masalah, 3 pengguna ±65%, 5 pengguna ±85%. Jalankan beberapa tes kecil per kelompok pengguna dan perbaiki di antara tes. Aturan ini untuk menemukan masalah, bukan untuk mengukur.
- **"Amati apa yang dilakukan pengguna, bukan apa yang mereka katakan"** (Nielsen 2001). "Apakah Anda suka?" bukan tes.
- **Prototipe:** mulai dari low-fi untuk struktur, urutan, dan kata-kata; naik ke high-fi hanya jika pertanyaannya menuntut. Tulis pertanyaannya sebelum membangun prototipe. Siklusnya Build–Measure–Learn (Ries 2011).

**KPI**
- Batasi KPI utama sekitar **tiga**. Setiap KPI punya **nama, definisi, baseline, dan target** yang ditulis sebelum perubahan dilakukan. Kerangka **HEART** (Rodden et al. 2010) bisa membantu memilih: Happiness, Engagement, Adoption, Retention, Task success.

| KPI | Definisi | Jebakan |
|---|---|---|
| Completion rate | Selesai ÷ mulai | Hanya menghitung yang bertahan sampai akhir |
| Engagement | Perilaku yang dinyatakan, mis. kembali dalam 7 hari | Didefinisikan sebagai jumlah klik |
| Drop-out rate | Keluar dalam rentang waktu tertentu ÷ mulai | Rentang waktunya terbuka |

- Hindari *vanity metric*: page views, total pendaftar, time on page sebagai satu-satunya KPI. Mengoptimalkan time on page justru membuat halaman lebih lambat.
- Pastikan metrik mengukur apa yang diklaimnya. Klik bukan engagement, dan tab yang terbuka bukan perhatian. Pasangkan setiap KPI dengan sebuah outcome.
- Waktu pengerjaan bermakna ganda: bisa karena bingung, bisa karena membaca dengan dalam. Drop-out per pelajaran menunjukkan *di mana*, bukan *kenapa*.
- Pecah drop-out per minggu, perangkat, dan kursus. Bandingkan hal yang setara: hari yang sama, tipe peserta yang sama, bukan masa libur dibandingkan masa normal.
- Sebagai pembanding: median completion MOOC 12,6% (rentang 0,7–52,1%, 221 kursus), dan dua minggu pertama paling kritis (Jordan 2015). Ini pengingat, bukan benchmark.
- Untuk pelatihan korporat, klien menilai di empat level Kirkpatrick: reaksi, belajar, perilaku, hasil.

**Siklus optimasi berbasis data**
- **Hipotesis → uji → evaluasi → putuskan → ulangi**, dengan siklus sekitar 2 minggu dan **satu perubahan per siklus**.
- Format hipotesis: *"Kami yakin …, jadi kami akan …, dan berharap … [dengan angka]."* "Kita harus memperbaiki UX" bukan hipotesis.
- Sebelum bertindak, daftar beberapa kemungkinan penyebab (formulir panjang, halaman lambat, ekspektasi tidak cocok, materi terlalu sulit), lalu uji satu per satu.
- Putuskan dengan aturan yang disepakati sebelum hasil keluar, misalnya "pertahankan jika drop-out minggu pertama turun ≥ 3 poin".
- A/B test memakai pembagian acak dengan ukuran kelompok yang direncanakan. Selisih 20 vs 22 peserta adalah noise.

**Privasi**
- Tracking adalah pemrosesan data pribadi (GDPR; di Indonesia **UU No. 27/2022 tentang Pelindungan Data Pribadi**, tambahan penyusun).
- Kumpulkan hanya yang dibutuhkan oleh sebuah pertanyaan atau hipotesis, beri tahu pengguna apa yang dilacak, dan minta persetujuan jika diwajibkan.
- "Track everything" adalah risiko privasi.

---

## 13. Mengambil keputusan desain di bawah ketidakpastian

Pola ini dipakai di setiap hari kursus dan berguna untuk rapat produk.

**Menilai setiap opsi dengan tiga kriteria**

| Kriteria | Pertanyaan |
|---|---|
| Dampak | Seberapa besar dampaknya ke pengguna/pembelajaran, dan untuk siapa? |
| Usaha | Berapa waktu dan orang yang dibutuhkan? |
| Risiko | Apa yang bisa salah, dan siapa yang tahu duluan? |

Jangan menjumlahkan ketiganya menjadi satu skor, karena menjumlahkan hal yang tidak setara menyembunyikan trade-off (Gibbons 2018). Yang menentukan keputusan adalah alasannya. Skala Rendah/Sedang/Tinggi boleh dipakai sebagai bantuan.

**Keputusan yang lengkap menyebut empat hal**
1. **Apa yang diputuskan.**
2. **Apa yang belum diketahui.**
3. **Apa yang akan membuat keputusan dibalik, dan kapan**, dengan angka yang bisa dipantau. Contoh: "jika lebih dari 30% peserta melewati pertanyaan di akhir minggu ke-6".
4. **Apa yang dikorbankan.** "Tidak mengorbankan apa pun berarti belum memutuskan."

**Aturan tambahan**
- Tetapkan siapa (peran) yang memutuskan dan bukti apa yang mereka butuhkan.
- Utamakan keputusan yang bisa dibalik, "two-way door" (Bezos 2016). Contohnya perubahan menu di balik sebuah switch, bukan membangun ulang seluruh platform.
- Gunakan **premortem** (Klein 2007): bayangkan proyek sudah gagal, lalu tanya kenapa.
- Setiap konflik disebut dengan dua kutub yang sah, lalu diputuskan. Rencana yang tidak menyebut pihak yang kalah belum menimbang apa pun.
- Jangan menunggu data sempurna. Menunggu juga sebuah keputusan.
- Perlakukan investasi UX sebagai **taruhan bertahap**: tahap kecil → gerbang dengan angka yang ditulis sebelumnya → tahap berikutnya.
- "Kompetitor punya fitur itu" bukan alasan, karena bukti keberhasilan mereka tidak terlihat oleh Anda.

---

## 14. Standar desain tugas dan latihan (dari cara AION membangun kursusnya)

Bagian ini diambil dari `DL-STANDARD.md` dan `CLAUDE.md`, aturan yang dipakai tim AION untuk membangun situs kursusnya. Aturan-aturan ini lahir dari koreksi nyata ketika peserta atau reviewer kebingungan.

**Struktur kursus**
- Setiap hari/modul punya rute per level. Bentuk AION terbaru (sejak Day 3) memakai dua rute:
  - **Rute 1:** Level 1 *Pengetahuan* dan Level 2 *Penerapan* digabung dalam satu kasus.
  - **Rute 2:** Level 3 *Keputusan manajemen*, memakai perusahaan yang sama dari sudut pandang manajer.
- Bentuk satu rute: **brief kasus (sekali) → materi (±60 menit) → satu tugas di satu halaman → satu export.**
  - Tidak ada materi di dalam tugas.
  - Level yang lebih tinggi mengutip jawaban peserta sendiri dari level sebelumnya.
- **Pertanyaan tugas = pertanyaan kurikulum**, sesuai urutan dan dekat dengan kata-katanya. Jangan menaruh apa pun di depannya atau menggantinya.
- **Tidak ada kunci keras.** Semua rute dan hari selalu terbuka. Urutan yang disarankan cukup berupa banner yang bisa ditutup.

**Jawaban dan pengecekan**
- **Jawaban bebas.** Pertanyaan terbuka dijawab dengan teks, bukan pilihan dari daftar. Pilihan tetap hanya jika kurikulumnya sendiri menyediakan (A atau B; ya/tidak/sebagian).
- **Cek = kelengkapan, bukan benar/salah.** Field kosong, daftar yang kurang jumlahnya, atau teks yang terlalu pendek disebut satu per satu. Pilihan yang berbeda dari model jawaban tidak pernah dianggap kurang.
- **Keputusan bebas, asal beralasan.** Pilihan yang berbeda dari model tetap bisa diekspor jika alasannya jelas. Batasan seperti anggaran ditampilkan sebagai petunjuk ("lebih X"), bukan sebagai kunci.
- **Pada latihan klasifikasi atau penempatan:** tombol "Cek" hanya jika diminta, dengan **petunjuk (clue), bukan jawaban**, dan undo/redo untuk penempatan yang salah.
- **Contoh jawaban dari perusahaan lain.** Setiap field teks bebas punya "Tampilkan petunjuk dan contoh jawaban" yang memakai kasus berbeda, supaya peserta melihat *bentuk* jawaban yang baik tanpa menyalin *isinya*.
- **Tabel terpandu sebagai bantuan opsional.** Formulir tetap default. Tautan tenang "Belum yakin cara mengisinya? Pakai tabel terpandu" membuka tabel dengan petunjuk per kolom dan satu baris contoh berwarna abu-abu dari perusahaan lain.
- **Tidak ada angka yang dikarang.** Biaya, skor, atau ambang yang tidak tercetak di kurikulum tidak boleh muncul. Detail kasus yang diperlukan diberi label **"Asumsi kasus"**, dan setiap brief punya kotak *Diketahui / Asumsi / Sengaja dibiarkan terbuka*.

**Pesan "kurang" dan tombol**
- **Pesan "kurang" spesifik dan bisa diklik.** Tidak ada pesan generik seperti "Lengkapi langkah 4". Setiap item menyebut apa yang kurang ("Alasan untuk opsi B belum diisi"); klik item itu menggulir ke field tersebut dan mengedipkannya.
- Daftar "masih kurang" tampil langsung di bawah setiap blok tugas dan di atas tombol Export, tanpa harus menekan tombol dulu.
- **Tombol utama tidak pernah benar-benar disabled.** Klik saat belum lengkap mengarahkan ke bagian yang kurang, karena tombol mati tidak menjelaskan *kenapa*.

**Bantuan memahami materi**
- **Instruksi field ada di bawah label, bukan di placeholder**, karena placeholder hilang saat orang mulai mengetik.
- **Glosarium satu klik.** Setiap istilah teknis atau kata asing diberi garis bawah putus-putus; klik membuka penjelasan sederhana 2–3 kalimat dengan contoh.
- **Setiap kartu materi dibuka dengan kotak "Dengan kata sederhana":** idenya, kenapa penting, dan cara membaca gambarnya.
- **Setiap diagram interaktif:**
  - Kotak **"Intinya"** yang selalu terlihat.
  - Teks **"Yang ditunjukkan ini"** yang menafsirkan perubahan, bukan sekadar mengulang angka.
  - **Cerita 2–4 langkah** dengan tokoh bernama yang menggerakkan kontrol diagramnya sendiri.
- **Setiap pertanyaan tugas bisa ditelusuri ke materi:** chip "Diambil dari kartu A3" yang menggulir ke kartu tersebut. Setiap kartu punya "aturan memutuskan" yang dirumuskan sesuai kebutuhan tugas.
- **Lebih sedikit teks secara default.** Yang dibutuhkan tugas tetap terlihat. Aturan, video, dan catatan samping diletakkan di balik "＋ Tampilkan …".

**Simulasi, fasilitator, dan export**
- **Simulasi yang bisa dicoba.** Platform atau opsi yang diminta untuk dinilai juga bisa dibuka dan dipakai, dengan prinsip "berfungsi seperti aslinya, terlihat masuk akal". Setiap tombol di simulasi membuka tampilan nyata; tidak boleh ada tombol mati atau halaman "belum dibuat".
- **Gamifikasi muncul sebagai bahan ajar, bukan hadiah dari situs.** Situs belajar sendiri tidak memberi XP, badge, confetti, atau leaderboard. Ring progres berarti "sudah diisi", bukan "menang".
- **Alat mentor dengan passcode:** satu tombol mengisi semua model jawaban untuk QA, ditambah kunci jawaban yang menjelaskan *kenapa* setiap opsi ditolak. Ini kemudahan, bukan keamanan.
- **Kartu fasilitator tersembunyi** untuk sesi coaching dan diskusi yang tidak menghasilkan dokumen tertulis, plus kartu "jika peserta bertanya" berisi jawaban standar supaya semua kelompok mendengar hal yang sama.
- **Export = satu dokumen kerja** (HTML/PDF) yang dirender dari pratinjau di layar. Nama file: `{nomor-rute}-{nama}-day{N}-{deliverable}`. Export tidak pernah memuat kunci jawaban, centang, silang, atau skor.

**Gaya visual dan nada**
- Arti warna tetap: biru = "lihat di sini"/pilihan Anda; teal = struktur/status OK; merah bata (rust) = ada yang kurang.
- **Tidak ada hijau/merah untuk benar/salah**, dan warna tidak pernah menjadi satu-satunya penanda.
- Nada orang kedua, deklaratif, tanpa tanda seru dan tanpa pujian. Feedback berupa konsekuensi, bukan vonis.

**Verifikasi sebelum rilis**
- Typecheck dan build.
- Klik setiap fitur di browser mulai dari localStorage yang bersih, dalam dua bahasa, pada lebar 1280 px dan 390 px, dengan jawaban yang sangat panjang di setiap kotak.
- Cek keyboard, zoom 400%, axe/Lighthouse, dan satu putaran screen reader.

---

## 15. Standar penulisan materi

Sumbernya `MATERIAL-GUIDE.md` dan `CURRICULUM-GUIDE.md`.

- **Dalam isinya, ringkas penyajiannya.** Pecah materi menjadi kartu pendek yang mudah dipindai, tetapi setiap kartu memuat fakta, framework, atau standar nyata (nama teori, nomor standar, angka benchmark, kasus nyata), bukan pengetahuan umum.
- **Struktur kartu:** judul → satu baris ringkasan → kotak "Dengan kata sederhana" → diagram (alat utama, bukan hiasan) → isi singkat → aturan memutuskan → sumber → "Tandai sudah dibaca".
- **Minimal satu sumber nyata per kartu** (standar, lembaga, atau penulis dengan tahun). Verifikasi tautan dan klaimnya sebelum dipakai.
- **Cara menulis penjelasan:**
  - Mulai dari situasinya: siapa, apa masalahnya, baru angkanya.
  - Sambungkan fakta dengan kata penghubung (*karena, jadi, tetapi, akibatnya*). Dua fakta yang diletakkan berdampingan belum menjelaskan apa pun.
  - Katakan dulu untuk apa sebuah bagian ada, dan setelah sebuah fakta, katakan apa akibatnya.
  - Satu gagasan baru per kalimat, kata sehari-hari, bicara seperti rekan kerja.
- **Asumsikan penyaji bukan ahli.** Setiap istilah dijelaskan dengan kata paling sederhana.
- **Mulai dari pengalaman peserta sendiri** sebagai pengguna kursus online, baru bangun istilahnya. Materi harus bisa diikuti tanpa pengetahuan awal.
- **Contoh kerja memakai perusahaan dan opsi yang berbeda dari tugas**, sehingga jawaban tugas tidak pernah tercetak di materi.
- **Video hanya sebagai pelengkap**, dari kanal yang kredibel dan bernama. Kartu harus tetap lengkap tanpa video. Video dimuat hanya setelah tombol putar ditekan (`youtube-nocookie.com`), tanpa autoplay.
- **Tiga tingkat tugas yang makin tidak pasti:**
  - **L1 Pengetahuan:** baca instrumen, laporkan apa yang ada (objektif).
  - **L2 Penerapan:** analisis penyebab, kembangkan dan prioritaskan langkah dengan alasan yang merujuk temuan L1.
  - **L3 Keputusan manajemen:** alokasikan sumber daya yang sengaja tidak cukup, dan nyatakan apa yang dikorbankan.
- **Bobot waktu:** materi ±60 menit per level, tugas 15–20 menit. Jika terlalu panjang, pangkas baris, bukan kesulitannya.

---

## 16. Angka acuan cepat

| Hal | Acuan | Sumber |
|---|---|---|
| Kontras teks normal / besar | ≥ 4,5:1 / ≥ 3:1 | WCAG 2.2 1.4.3 (AA) |
| Target sentuh | min. 24×24 px (AA); sasaran praktis ±44 px | WCAG 2.2 2.5.8 |
| Reflow | Tanpa scroll dua arah pada 320 px | WCAG 2.2 1.4.10 |
| Zoom teks | Sampai 200% | WCAG 2.2 1.4.4 |
| Respons sistem | ±0,1 s instan · ±1 s alur pikir · 10 s batas perhatian | Nielsen 1993 |
| Panjang baris teks | ±45–75 karakter | Bringhurst 2012 |
| Working memory untuk hal baru | ±4 potongan | Cowan 2001 |
| Durasi unit pelajaran | 5–7 menit (microlearning mobile 3–7 menit), satu tujuan | Materi Day 3 & 15 |
| Menu utama | ±6 entri; maks. 3 tingkat ke pelajaran | Materi Day 8 & 14; Hick 1952 |
| Status pelajaran | 3 keadaan | Materi Day 10 |
| Peserta usability test | ±5 per kelompok (5–8) | Nielsen 2000 |
| Card sort tertutup | ±10 peserta (tree test 10–20) | Spencer 2009 |
| KPI utama | ±3, masing-masing dengan definisi, baseline, target | Materi Day 16; Rodden et al. 2010 |
| Siklus optimasi | ±2 minggu, satu perubahan per siklus | Materi Day 16 |
| Pemindaian halaman | 79% memindai, 16% membaca kata per kata | Nielsen 1997 |

---

## 17. Daftar anti-pattern

| Area | Hindari |
|---|---|
| Struktur | Menu 12–24 entri sejajar; kursus yang sama di dua tempat dengan nama berbeda ("Kursus saya" / "Kursus (lama)"); label sistem ("Hub", "Module Manager"); 14 filter sebelum hasil pertama |
| Visual | Tujuh warna dan lima tombol setara di satu layar; ilustrasi animasi di halaman yang sudah ramai; membeli tampilan baru padahal masalahnya struktur; style guide yang tidak dipakai |
| Materi | Dinding teks ±500 kata tanpa orientasi; banner, chat, dan menu 9 entri di sekitar konten; menyederhanakan sampai kesulitan yang perlu hilang; grafis dekoratif |
| Feedback | Diam setelah aksi; silang merah tanpa penjelasan; "Kerja bagus!" tanpa informasi; pop-up setelah setiap klik |
| Progres | Bar yang menghitung klik; bar yang melompat ke 90%; level yang tidak menyebut apa yang dikuasai; dashboard 14 grafik |
| Gamifikasi | Poin per login; hadiah untuk 10 besar; leaderboard total poin; streak yang menghukum hari terlewat; "nyalakan semua elemen"; dark pattern (nagging, paksaan, obstruksi, Gray et al. 2018) |
| Adaptif | Rute ulang diam-diam; rekomendasi tanpa alasan; skor tersembunyi; model ML padahal tiga aturan cukup; label "AI-powered" |
| Aksesibilitas | Kuis hanya drag; menu hanya hover; header lengket yang menutupi fokus; login yang memblokir password manager; video tanpa takarir; overlay plugin aksesibilitas; versi aksesibel terpisah; audit sekali lalu dilupakan |
| Bahasa | Pesan "Error 4012"; satu aksi dengan tiga nama (Save/Submit/Apply); manual 40 halaman sebagai obat kebingungan |
| Mobile | Pelajaran 40 menit di ponsel; desktop yang dikecilkan; katalog ponsel dengan kursus lebih sedikit; push notification harian sebagai obat; sinkronisasi yang salah posisi |
| Data | "Track everything"; time on page sebagai satu-satunya KPI; dinding 40 grafik real-time; menulis ulang pelajaran berdasarkan tebakan; lima peluncuran dalam sebulan; tracking dengan nama tanpa pemberitahuan |
| Proses | Menguji terlalu terlambat; memoles ide yang belum diuji; membeli AI karena kompetitor punya; menambah kursus/fitur saat peserta belum bisa menemukan kursusnya; rencana "semua menang" |

---

## 18. Checklist audit sebuah kursus/LMS

Gunakan sebagai daftar periksa sebelum merilis kursus atau fitur. ☐ = belum dicek.

**Orientasi dan struktur**
- ☐ Dari halaman mana pun, peserta tahu ia di mana, apa berikutnya, dan berapa yang tersisa (trunk test).
- ☐ Setiap kursus/pelajaran punya satu rumah dan satu nama.
- ☐ Menu utama ±6 entri dengan nama tindakan peserta.
- ☐ Ada kartu/tombol "Lanjutkan" ke posisi terakhir.
- ☐ Satu aksi utama per layar dengan label kata kerja + objek.

**Materi**
- ☐ Setiap pelajaran: satu tujuan, 5–7 menit, kalimat kunci ditandai, istilah dijelaskan, cek di akhir.
- ☐ Heading dan paragraf pendek; tidak ada dinding teks.
- ☐ Gambar relevan dengan label di dalamnya; tidak ada dekorasi pengalih.
- ☐ Ada pertanyaan mengingat (retrieval) di awal pelajaran berikutnya.
- ☐ Contoh dari pekerjaan nyata sebelum aturannya.
- ☐ Lima pemula bisa menjelaskan poin kuncinya.

**Feedback dan progres**
- ☐ Setiap aksi mendapat respons dalam ±1 detik.
- ☐ Feedback kuis menjelaskan *kenapa* dan *apa berikutnya*, bukan hanya skor.
- ☐ Progres dihitung dari pelajaran yang selesai, berlabel, dengan tiga status per pelajaran.
- ☐ Pesan error menyebut apa yang salah dan apa yang harus dilakukan.

**Motivasi**
- ☐ Setiap elemen gamifikasi melayani satu tujuan belajar, dan insentif terbaliknya sudah ditulis.
- ☐ Tidak ada leaderboard yang mempermalukan peserta di peringkat bawah, streak yang menghukum, atau hadiah untuk aktivitas.
- ☐ Peserta punya pilihan (urutan, topik) dan bisa mematikan elemen permainan.

**Aksesibilitas (WCAG 2.2 AA)**
- ☐ Kontras ≥ 4,5:1; status tidak hanya dengan warna.
- ☐ Semua fungsi bisa dipakai dengan keyboard, dan fokus selalu terlihat.
- ☐ Alt text untuk gambar yang berisi informasi; takarir untuk video.
- ☐ Reflow pada 320 px, zoom 200–400% tanpa rusak.
- ☐ Target sentuh ≥ 24 px (idealnya 44 px).
- ☐ Setiap drag-and-drop punya alternatif klik/keyboard.
- ☐ Batas waktu kuis bisa diatur atau diperpanjang.
- ☐ Login tanpa teka-teki kognitif; password manager diizinkan.
- ☐ Bahasa halaman diset, dan setiap input punya label.
- ☐ Sudah diuji manual dengan keyboard dan screen reader, tidak hanya dengan alat otomatis.

**Mobile**
- ☐ Bisa dipakai dengan satu jempol; aksi utama di jangkauan jempol.
- ☐ Tabel menjadi kartu di layar sempit; tidak ada scroll samping.
- ☐ Progres dan posisi terakhir tersinkron antar-perangkat.

**Data dan pengujian**
- ☐ Ada ±3 KPI dengan definisi, baseline, dan target yang ditulis sebelumnya.
- ☐ Drop-out bisa dipecah per pelajaran, minggu, dan perangkat.
- ☐ Hanya data yang dibutuhkan yang dikumpulkan, dan pengguna diberi tahu (UU PDP/GDPR).
- ☐ Usability test dengan ±5 peserta dilakukan sebelum rilis besar.

**Tugas dan penilaian**
- ☐ Pesan "kurang" spesifik dan bisa diklik ke lokasinya.
- ☐ Tombol submit tidak mati tanpa penjelasan.
- ☐ Ada contoh jawaban dari kasus lain untuk soal terbuka.
- ☐ Setiap soal bisa ditelusuri ke materi yang mengajarkannya.

---

## 19. Penerapan ke Sanggabiz LMS

Catatan ini berdasarkan analisis repo `academy-lms-sanggabiz` (commit `24a958a`) dan uji jalan lokal sebelumnya. Status ditulis sebagai **sudah ada**, **perlu dicek**, atau **celah**. Item "perlu dicek" belum diverifikasi di layar, jadi perlakukan sebagai titik awal audit, bukan temuan pasti.

| Standar | Kondisi di Sanggabiz LMS | Status / saran |
|---|---|---|
| Kartu "Lanjutkan" (bag. 3, 10) | Dashboard learner punya "Continue Learning" | **Sudah ada.** Pastikan menyebut pelajaran spesifik ("Pelajaran 3 dari 8"), bukan hanya nama kursus |
| Progres jujur (bag. 5) | Checkbox per pelajaran + progress bar dari pelajaran selesai | **Sudah ada.** Tambahkan label teks "3 dari 8 selesai · ±20 menit lagi" dan nama/nilai ARIA pada bar |
| Kursus dalam modul (bag. 3) | `course_sections` → `lessons`, path dan sidebar kurikulum | **Sudah ada.** Pastikan judul halaman, sidebar, dan path selalu konsisten (trunk test) |
| Feedback kuis menjelaskan (bag. 5) | Auto-grading untuk soal objektif via `grade_attempt()` | **Perlu dicek.** Tambahkan penjelasan per soal ("kenapa") dan langkah berikutnya, bukan hanya skor/lulus |
| Batas waktu kuis (WCAG 2.2.1) | Kuis punya opsi `time limit` | **Celah potensial.** Sediakan cara memperpanjang/menonaktifkan waktu untuk peserta yang membutuhkan |
| Login yang aksesibel (WCAG 3.3.8) | Login/signup dengan hCaptcha | **Perlu dicek.** Teka-teki visual captcha bisa menjadi hambatan kognitif dan visual; pastikan ada alternatif aksesibel dan password manager tidak terblokir |
| Alternatif drag (WCAG 2.5.7) | Admin mengurutkan pelajaran dengan drag-and-drop (dnd-kit) | **Perlu dicek.** Sediakan tombol naik/turun atau dukungan keyboard dnd-kit untuk pengguna keyboard |
| Tidak ada tombol mati (bag. 14) | Tab "Notes", "Q&A", dan "AI Assistant" di player sengaja tidak berfungsi (menurut CLAUDE.md repo) | **Celah.** Kontrol yang terlihat bisa dipakai tetapi tidak melakukan apa-apa dibaca peserta sebagai produk rusak. Sembunyikan sampai fitur dibangun |
| Satu tujuan per pelajaran, 5–7 menit (bag. 4) | Editor Tiptap bebas, tanpa panduan panjang | **Saran.** Tambahkan panduan penulis di editor: penghitung kata atau estimasi menit, pengingat "satu tujuan, kalimat kunci, cek di akhir" |
| Alt text gambar (WCAG 1.1.1) | Upload gambar di editor pelajaran dan thumbnail | **Perlu dicek.** Wajibkan atau tawarkan field alt text saat upload; lint repo juga menandai beberapa `<img>` |
| Takarir video (WCAG 1.2.2) | Pelajaran video via YouTube | **Perlu dicek.** Tetapkan standar: hanya video yang punya takarir; tambahkan transkrip di pelajaran |
| Gamifikasi (bag. 6) | Tidak ada poin/leaderboard; ada sertifikat saat selesai | **Sudah sesuai.** Sertifikat menghadiahi hasil, bukan aktivitas. Jika ingin menambah gamifikasi, mulai dari progres per tujuan, bukan poin login |
| Peak-end (bag. 11) | Sertifikat otomatis saat selesai | **Sudah ada.** Pertimbangkan ringkasan "yang sudah Anda kuasai" di layar penyelesaian |
| Notifikasi (bag. 10, 17) | Notifikasi in-app saat didaftarkan admin; email belum ada | **Saran.** Saat email ditambahkan, hindari pengingat harian; kirim yang bermakna saja (didaftarkan, tenggat, sertifikat) |
| KPI (bag. 12) | Admin punya dashboard, tracking, dan grading | **Saran.** Definisikan 3 KPI (completion rate, return rate 7 hari, drop-out minggu pertama) dengan definisi tertulis; pecah per kursus dan perangkat |
| Privasi (bag. 12) | Supabase + RLS; tracking online | **Perlu dicek.** Kebijakan privasi yang menyebut apa yang dilacak, sesuai UU PDP |
| Kontras & warna (WCAG 1.4.3) | Token brand `--primary: #1a7f91`, gradien `#35b5c6 → #2e7ca6` | **Celah.** Dihitung: teks putih di atas `#35b5c6` (ujung terang gradien tombol CTA) hanya **2,45:1**, gagal AA; di atas `#2e7ca6` 4,62:1 dan `#1a7f91` 4,68:1 lolos. Gelapkan ujung terang gradien atau pakai teks gelap |
| Bahasa (bag. 9) | UI berbahasa Inggris, konten "Bahasa Indonesia" | **Saran.** Konsistenkan bahasa UI dengan bahasa peserta; satu nama untuk satu aksi |

**Tiga langkah awal yang disarankan (murah, dampaknya luas):**
1. Sembunyikan tab player yang belum berfungsi, dan tambahkan label teks pada progres.
2. Audit WCAG cepat pada 5 halaman paling sering dipakai: login, dashboard, detail kursus, player, kuis. Gunakan keyboard, screen reader, dan axe.
3. Buat panduan penulis materi berdasarkan bagian 4 dan 15, lalu pasang di editor kursus.

---

## 20. Referensi

Dikutip sesuai yang tercetak di materi sumber. Materi aslinya hanya memuat kutipan singkat, jadi judul lengkap perlu dicari saat diperlukan.

**Standar & regulasi:** ISO 9241-11:2018 · ISO 9241-210:2019 · ISO 24495-1 (plain language) · W3C WCAG 2.2 (2023) & Understanding WCAG 2.2 · W3C Using ARIA · EN 301 549 · BFSG / European Accessibility Act (Directive 2019/882) · BITV 2.0 · GDPR (Regulation 2016/679) · EU AI Act (Regulation 2024/1689) · European Commission (2011) *How to write clearly*.

**UX & desain:** Norman & Nielsen (NN/g) · Norman 2013 · Nielsen 1993, 1994, 1997, 2000, 2001, 2006 · Nielsen & Landauer 1993 · Krug 2014 · Rosenfeld, Morville & Arango 2015 · Spencer 2009 · Hick 1952 · Fitts 1954 · Wertheimer 1923 · Bringhurst 2012 · Shneiderman et al. 2016 · Gibbons 2018 (NN/g) · Rohrer 2014 · Beyer & Holtzblatt 2017 · Kano et al. 1984 · Cooper 1999 · Pruitt & Grudin 2003 · Kalbach 2020 · Gothelf & Seiden 2013 · Christensen et al. 2016 · Rettig 1994 · Wroblewski 2011 · Budiu 2015 · Microsoft 2016 · CAST 2024 · Gray et al. 2018.

**Psikologi belajar & motivasi:** Atkinson & Shiffrin 1968 · Anderson & Krathwohl 2001 · Sweller 1988 · Sweller et al. 1998 · Miller 1956 · Cowan 2001 · Mayer & Moreno 2003 · Mayer 2009 · Harp & Mayer 1998 · Kalyuga et al. 2003 · Roediger & Karpicke 2006 · Cepeda et al. 2006 · Bjork & Bjork 2011 · Chi & Wylie 2014 · Hattie & Timperley 2007 · Ryan & Deci 2000 · Deci, Koestner & Ryan 1999 · Lepper, Greene & Nisbett 1973 · Keller 1987 · Fogg 2009 · Csikszentmihalyi 1990 · Locke & Latham 2002 · Kivetz, Urminsky & Zheng 2006 · Nunes & Drèze 2006 · Amabile & Kramer 2011 · Deterding et al. 2011 · Hamari, Koivisto & Sarsa 2014 · Kahneman et al. 1993 · Knowles 1975 · Hug 2005 · Sharples et al. 2007.

**Adaptif, data & keputusan:** Brusilovsky 2001 · Ribeiro et al. 2016 · Amershi et al. 2019 · Kulik & Fletcher 2016 · Ries 2011 · Kohavi et al. 2020 · Rodden, Hutchinson & Fu 2010 · Brooke 1996 · Reichheld 2003 · Croll & Yoskovitz 2013 · Few 2013 · Jordan 2015 · Kirkpatrick & Kirkpatrick 2006 · WHO 2022 · Klein 2007 · Bezos 2016.
