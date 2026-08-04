import { z } from "zod"

// Note: the reference design's Settings tab also has "Sequential Progress"
// and "Minimum Quiz Score" fields, but courses has no backing column for
// either (only title/slug/description/thumbnail_url/price/level/status/
// who_for/requirements/language exist) -- omitted here rather than adding
// schema silently; revisit alongside the Phase 3/4 curriculum+quiz work if
// those settings turn out to still be wanted.
export const courseFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim(),
  requirementsText: z.string().trim(),
  audienceText: z.string().trim(),
  thumbnail_url: z.string().trim(),
  level: z.string().trim(),
  enrollmentMode: z.enum(["free", "paid"]),
  price: z.number().min(0, "Price can't be negative"),
  // Unlike enrollmentMode (derived from price), this is a real courses column.
  isPrivate: z.boolean(),
})

export type CourseFormValues = z.infer<typeof courseFormSchema>

export function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export function arrayToLines(items: string[]): string {
  return items.join("\n")
}
