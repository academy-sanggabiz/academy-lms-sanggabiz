export type MockCourse = {
  id: number
  title: string
  description: string
  lessons: number
  hours: number
  price: "Free" | string
}

export const mockCourses: MockCourse[] = [
  {
    id: 1,
    title: "No-Code AI Bot: Bangun Chatbot Pintar Setara Startup Tanpa Coding",
    description:
      "Banyak startup dan perusahaan rela membayar puluhan juta rupiah hanya untuk mengintegrasikan chatbot AI ke dalam sistem mereka. Di kursus ini kamu akan membangunnya tanpa menulis satu baris kode pun.",
    lessons: 3,
    hours: 1,
    price: "Free",
  },
  {
    id: 2,
    title: "Automation Mastery: Bangun Workflow Bisnis Otomatis dengan Make.com",
    description:
      "Otomatiskan pekerjaan repetitif — dari input data, follow-up email, sampai laporan mingguan. Pelajari scenario design, webhooks, router, dan error handling untuk workflow yang andal di dunia nyata.",
    lessons: 8,
    hours: 4,
    price: "Rp 249.000",
  },
  {
    id: 3,
    title: "Data Analysis untuk Bisnis: Dari Spreadsheet ke Dashboard Interaktif",
    description:
      "Ubah data mentah penjualan menjadi insight. Belajar membersihkan data, pivot table lanjutan, dan membangun dashboard interaktif yang bisa dibaca siapa pun di tim Anda.",
    lessons: 10,
    hours: 6,
    price: "Rp 349.000",
  },
  {
    id: 4,
    title: "Digital Marketing Fundamental: Strategi Organik untuk UMKM",
    description:
      "Bangun kehadiran digital tanpa budget iklan besar. Konten pilar, SEO lokal, dan funnel WhatsApp untuk mengubah followers menjadi pembeli.",
    lessons: 6,
    hours: 3,
    price: "Free",
  },
]
