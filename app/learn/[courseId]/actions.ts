"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { checkAndIssueCertificate } from "@/lib/certificates"

export type ToggleLessonResult = { ok: true } | { ok: false; error: string }

export async function toggleLessonComplete(
  courseId: string,
  lessonId: string,
  completed: boolean
): Promise<ToggleLessonResult> {
  if (!courseId || !lessonId) return { ok: false, error: "Missing course or lesson." }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { ok: false, error: "You need to be signed in." }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("learner_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (enrollmentError || !enrollment) {
    console.error("toggleLessonComplete: no enrollment found", enrollmentError?.message)
    return { ok: false, error: "Couldn't update progress. Please try again." }
  }

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      enrollment_id: enrollment.id,
      lesson_id: lessonId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "enrollment_id,lesson_id" }
  )

  if (error) {
    console.error("toggleLessonComplete failed:", error.message)
    return { ok: false, error: "Couldn't update progress. Please try again." }
  }

  if (completed) {
    await checkAndIssueCertificate(supabase, { enrollmentId: enrollment.id, courseId, learnerId: userId })
  }

  revalidatePath("/learn/[courseId]", "page")
  return { ok: true }
}
