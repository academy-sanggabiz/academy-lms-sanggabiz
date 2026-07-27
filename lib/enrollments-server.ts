import { createClient } from "@/lib/supabase/server"

export async function getEnrolledCourseIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("learner_id", userId)

  if (error) {
    console.error("getEnrolledCourseIds failed:", error.message)
    return []
  }

  return data.map((row) => row.course_id)
}

export async function isEnrolled(courseId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return false

  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("learner_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (error) {
    console.error("isEnrolled failed:", error.message)
    return false
  }

  return data !== null
}
