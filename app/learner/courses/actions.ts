"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function enroll(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "")
  if (!courseId) return

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return

  const { error } = await supabase
    .from("enrollments")
    .upsert(
      { learner_id: userId, course_id: courseId },
      { onConflict: "learner_id,course_id", ignoreDuplicates: true }
    )

  if (error) {
    console.error("enroll failed:", error.message)
    return
  }

  revalidatePath("/learner/courses")
  revalidatePath("/learner/courses/[id]", "page")
  revalidatePath("/learner/dashboard")
}
