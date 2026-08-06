"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { recordEnrollmentTransaction } from "@/lib/transactions-server"

export type EnrollResult = { ok: true } | { ok: false; error: string }

export async function enroll(courseId: string): Promise<EnrollResult> {
  if (!courseId) return { ok: false, error: "Missing course." }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { ok: false, error: "You need to be signed in to enroll." }

  const { error } = await supabase
    .from("enrollments")
    .upsert(
      { learner_id: userId, course_id: courseId },
      { onConflict: "learner_id,course_id", ignoreDuplicates: true }
    )

  if (error) {
    console.error("enroll failed:", error.message)
    return { ok: false, error: "Couldn't enroll. Please try again." }
  }

  await recordEnrollmentTransaction(supabase, userId, courseId)

  revalidatePath("/learner/courses")
  revalidatePath("/learner/courses/[id]", "page")
  revalidatePath("/learner/dashboard")

  return { ok: true }
}
