import { createClient } from "@/lib/supabase/server"

/** Client-safe (no supabase import needed by callers) but the fetch itself is server-only. */
export type CourseFeedback = {
  rating: number
  comment: string
  createdAt: string
}

/**
 * The current learner's own feedback for a course, or null if they haven't
 * left one yet. RLS ("own feedback readable") scopes this to their own row --
 * no learner_id filter needed here.
 */
export async function getCourseFeedbackForLearner(courseId: string): Promise<CourseFeedback | null> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return null

  const { data, error } = await supabase
    .from("course_feedback")
    .select("rating, comment, created_at")
    .eq("course_id", courseId)
    .eq("learner_id", userId)
    .maybeSingle()

  if (error) {
    console.error("getCourseFeedbackForLearner failed:", error.message)
    return null
  }
  if (!data) return null

  return { rating: data.rating, comment: data.comment, createdAt: data.created_at }
}
