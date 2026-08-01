import { createClient } from "@/lib/supabase/server"
import {
  defaultFeaturedCourseIds,
  defaultFeatures,
  defaultHero,
  type Feature,
  type LandingContent,
} from "@/lib/landing"

type LandingContentRow = {
  heading: string
  highlight_word: string
  subheading: string
  primary_cta_text: string
  primary_cta_href: string
  features: Feature[]
  featured_course_ids: string[]
}

/** Reads the single landing_content row, falling back to the built-in defaults. */
export async function getLandingContent(): Promise<LandingContent> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("landing_content")
    .select(
      "heading, highlight_word, subheading, primary_cta_text, primary_cta_href, features, featured_course_ids"
    )
    .eq("id", true)
    .maybeSingle<LandingContentRow>()

  if (error || !data) {
    return { hero: defaultHero, features: defaultFeatures, featuredCourseIds: defaultFeaturedCourseIds }
  }

  return {
    hero: {
      heading: data.heading,
      highlightWord: data.highlight_word,
      subheading: data.subheading,
      primaryCtaText: data.primary_cta_text,
      primaryCtaHref: data.primary_cta_href,
    },
    features: data.features?.length ? data.features : defaultFeatures,
    featuredCourseIds: data.featured_course_ids ?? defaultFeaturedCourseIds,
  }
}

export async function saveLandingContent(
  input: LandingContent
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("landing_content").upsert(
    {
      id: true,
      heading: input.hero.heading,
      highlight_word: input.hero.highlightWord,
      subheading: input.hero.subheading,
      primary_cta_text: input.hero.primaryCtaText,
      primary_cta_href: input.hero.primaryCtaHref,
      features: input.features,
      featured_course_ids: input.featuredCourseIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  )

  if (error) return { error: error.message }
  return { ok: true }
}
