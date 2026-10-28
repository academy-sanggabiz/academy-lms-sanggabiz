export const LANDING_ICON_OPTIONS = ["graduation-cap", "layers", "award"] as const

export type LandingIcon = (typeof LANDING_ICON_OPTIONS)[number]

export type Hero = {
  heading: string
  highlightWord: string
  /** HTML from the admin's RichTextEditor -- render with dangerouslySetInnerHTML. */
  subheading: string
  primaryCtaText: string
  primaryCtaHref: string
}

export type Feature = {
  icon: LandingIcon
  title: string
  /** HTML from the admin's RichTextEditor -- render with dangerouslySetInnerHTML. */
  description: string
}

export type LandingContent = {
  hero: Hero
  features: Feature[]
  featuredCourseIds: string[]
}

export const defaultHero: Hero = {
  heading: "Belajar. Berkembang.",
  highlightWord: "Sukses.",
  subheading:
    "Kembangkan diri Anda melalui pengetahuan bersama Sanggabiz. Akses kursus berkualitas yang dirancang untuk membantu Anda mencapai tujuan dan mengembangkan potensi.",
  primaryCtaText: "Mulai Perjalanan Anda",
  primaryCtaHref: "/auth/login",
}

export const defaultFeaturedCourseIds: string[] = []

export const defaultFeatures: Feature[] = [
  {
    icon: "graduation-cap",
    title: "Dibimbing Para Ahli",
    description:
      "Belajar dari praktisi industri dan akademisi berpengalaman.",
  },
  {
    icon: "layers",
    title: "Belajar Fleksibel",
    description:
      "Belajar sesuai ritme Anda dengan akses seumur hidup ke materi dan pembaruan kursus.",
  },
  {
    icon: "award",
    title: "Bersertifikat",
    description:
      "Dapatkan sertifikat setelah menyelesaikan kursus untuk menunjukkan pencapaian Anda.",
  },
]
