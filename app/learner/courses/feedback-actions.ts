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

  if (!courseId) return { ok: false, error: "Kursus tidak ditemukan." }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Pilih penilaian dari 1 sampai 5." }
  }
  if (trimmedComment.length < 10) {
    return { ok: false, error: "Tuliskan ulasan sedikit lebih panjang tentang kursus ini." }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { ok: false, error: "Anda perlu masuk untuk memberi ulasan." }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("learner_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (enrollmentError) {
    console.error("submitCourseFeedback: enrollment lookup failed", enrollmentError.message)
    return { ok: false, error: "Gagal mengirim ulasan. Coba lagi." }
  }
  if (!enrollment || enrollment.status !== "completed") {
    return { ok: false, error: "Selesaikan kursus sebelum memberi ulasan." }
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
      return { ok: false, error: "Anda sudah memberi ulasan untuk kursus ini." }
    }
    console.error("submitCourseFeedback failed:", error.message)
    return { ok: false, error: "Gagal mengirim ulasan. Coba lagi." }
  }

  revalidatePath("/learn/[courseId]", "page")
  revalidatePath("/learner/profile")

  return { ok: true }
}
