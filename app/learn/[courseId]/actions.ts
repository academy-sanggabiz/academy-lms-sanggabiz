"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { checkAndIssueCertificate } from "@/lib/certificates"

export async function toggleLessonComplete(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "")
  const lessonId = String(formData.get("lessonId") ?? "")
  const completed = formData.get("completed") === "true"
  // Optional: the "Complete & continue" button sends the next lesson so the
  // learner lands on it in one step (DL standard: one clear next action).
  const continueTo = String(formData.get("continueTo") ?? "")
  if (!courseId || !lessonId) return

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("learner_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (enrollmentError || !enrollment) {
    console.error("toggleLessonComplete: no enrollment found", enrollmentError?.message)
    return
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
    return
  }

  if (completed) {
    await checkAndIssueCertificate(supabase, { enrollmentId: enrollment.id, courseId, learnerId: userId })
  }

  revalidatePath("/learn/[courseId]", "page")

  if (continueTo) {
    redirect(`/learn/${encodeURIComponent(courseId)}?lesson=${encodeURIComponent(continueTo)}`)
  }
}
