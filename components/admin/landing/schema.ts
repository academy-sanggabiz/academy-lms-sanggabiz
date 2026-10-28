import { z } from "zod"

import { LANDING_ICON_OPTIONS } from "@/lib/landing"

// subheading/description are HTML from RichTextEditor -- min(1) only rejects
// a truly empty string, not Tiptap's empty-doc "<p></p>", same known gap as
// the lesson-content editor (not enforced there either).
export const landingFeatureSchema = z.object({
  icon: z.enum(LANDING_ICON_OPTIONS),
  title: z.string().trim().min(1, "Judul wajib diisi"),
  description: z.string().trim().min(1, "Deskripsi wajib diisi"),
})

export const landingFormSchema = z.object({
  heading: z.string().trim().min(1, "Judul utama wajib diisi"),
  highlightWord: z.string().trim().min(1, "Kata sorotan wajib diisi"),
  subheading: z.string().trim().min(1, "Subjudul wajib diisi"),
  primaryCtaText: z.string().trim().min(1, "Teks tombol ajakan wajib diisi"),
  primaryCtaHref: z.string().trim().min(1, "Tautan tombol ajakan wajib diisi"),
  features: z.array(landingFeatureSchema).min(1, "Minimal satu keunggulan wajib diisi"),
  featuredCourseIds: z.array(z.string()),
})

export type LandingFormValues = z.infer<typeof landingFormSchema>
