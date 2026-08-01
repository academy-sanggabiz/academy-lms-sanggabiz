import { z } from "zod"

import { LANDING_ICON_OPTIONS } from "@/lib/landing"

// subheading/description are HTML from RichTextEditor -- min(1) only rejects
// a truly empty string, not Tiptap's empty-doc "<p></p>", same known gap as
// the lesson-content editor (not enforced there either).
export const landingFeatureSchema = z.object({
  icon: z.enum(LANDING_ICON_OPTIONS),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
})

export const landingFormSchema = z.object({
  heading: z.string().trim().min(1, "Heading is required"),
  highlightWord: z.string().trim().min(1, "Highlight word is required"),
  subheading: z.string().trim().min(1, "Subheading is required"),
  primaryCtaText: z.string().trim().min(1, "CTA text is required"),
  primaryCtaHref: z.string().trim().min(1, "CTA link is required"),
  features: z.array(landingFeatureSchema).min(1, "At least one feature is required"),
  featuredCourseIds: z.array(z.string()),
})

export type LandingFormValues = z.infer<typeof landingFormSchema>
