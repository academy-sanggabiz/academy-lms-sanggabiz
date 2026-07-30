import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Server-only -- never import from a Client Component.
 *
 * Inserts a matching `transactions` row for an enrollment, called from both
 * the learner self-enroll action and the admin enroll action so every
 * enrollment (free or, once commerce ships, paid) has a purchase record.
 * Safe to call even when the enrollment already existed (e.g. a re-click of
 * Enroll, which the upsert treats as a no-op) -- skips the insert if a
 * transaction for that enrollment already exists.
 */
export async function recordEnrollmentTransaction(
  supabase: SupabaseClient,
  learnerId: string,
  courseId: string
): Promise<void> {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("learner_id", learnerId)
    .eq("course_id", courseId)
    .single()

  if (enrollmentError || !enrollment) {
    console.error("recordEnrollmentTransaction (enrollment lookup) failed:", enrollmentError?.message)
    return
  }

  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("enrollment_id", enrollment.id)
    .maybeSingle()

  if (existing) return

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("price")
    .eq("id", courseId)
    .single()

  if (courseError || !course) {
    console.error("recordEnrollmentTransaction (course lookup) failed:", courseError?.message)
    return
  }

  const { error } = await supabase.from("transactions").insert({
    learner_id: learnerId,
    course_id: courseId,
    enrollment_id: enrollment.id,
    amount: course.price,
    status: course.price > 0 ? "completed" : "free",
  })

  if (error) {
    console.error("recordEnrollmentTransaction (insert) failed:", error.message)
  }
}
