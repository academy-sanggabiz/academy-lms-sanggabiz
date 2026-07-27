"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function toggleLessonComplete(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "")
  const lessonId = String(formData.get("lessonId") ?? "")
  const completed = formData.get("completed") === "true"
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

  revalidatePath("/learn/[courseId]", "page")
}
