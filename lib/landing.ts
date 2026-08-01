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
  heading: "Learn. Grow.",
  highlightWord: "Succeed.",
  subheading:
    "Transform your life through knowledge with Sanggabiz. Access world-class courses designed to help you achieve your goals and unlock your potential.",
  primaryCtaText: "Start Your Journey",
  primaryCtaHref: "/auth/login",
}

export const defaultFeaturedCourseIds: string[] = []

export const defaultFeatures: Feature[] = [
  {
    icon: "graduation-cap",
    title: "Expert-Led Courses",
    description:
      "Learn from industry professionals and academic experts with years of experience.",
  },
  {
    icon: "layers",
    title: "Flexible Learning",
    description:
      "Study at your own pace with lifetime access to course materials and updates.",
  },
  {
    icon: "award",
    title: "Certified Learning",
    description:
      "Earn recognized certificates upon course completion to showcase your achievements.",
  },
]
