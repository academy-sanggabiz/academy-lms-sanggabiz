"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type SubmitFeedbackResult = { ok: true } | { ok: false; error: string }

export async function submitCourseFeedback(input: {
  courseId: string
  rating: number
  comment: string
}): Promise<SubmitFeedbackResult> {
  const { courseId, rating, comment } = input
  const trimmedComment = comment.trim()

  if (!courseId) return { ok: false, error: "Missing course." }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Please choose a rating from 1 to 5." }
  }
  if (trimmedComment.length < 10) {
    return { ok: false, error: "Please share a few more words about the course." }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { ok: false, error: "You need to be signed in to leave feedback." }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("learner_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (enrollmentError) {
    console.error("submitCourseFeedback: enrollment lookup failed", enrollmentError.message)
    return { ok: false, error: "Couldn't submit feedback. Please try again." }
  }
  if (!enrollment || enrollment.status !== "completed") {
    return { ok: false, error: "Finish the course before leaving feedback." }
  }

  const { error } = await supabase.from("course_feedback").insert({
    enrollment_id: enrollment.id,
    course_id: courseId,
    learner_id: userId,
    rating,
    comment: trimmedComment,
  })

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You've already left feedback for this course." }
    }
    console.error("submitCourseFeedback failed:", error.message)
    return { ok: false, error: "Couldn't submit feedback. Please try again." }
  }

  revalidatePath("/learn/[courseId]", "page")
  revalidatePath("/learner/profile")

  return { ok: true }
}
