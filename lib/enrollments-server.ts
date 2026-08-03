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

export async function getCompletedCourseIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("learner_id", userId)
    .eq("status", "completed")

  if (error) {
    console.error("getCompletedCourseIds failed:", error.message)
    return []
  }

  return data.map((row) => row.course_id)
}

export type EnrolledCourseSummary = {
  id: string
  title: string
  lesson_count: number
  duration_hours: number
  status: "active" | "completed"
}

export async function getEnrolledCoursesWithDetails(): Promise<EnrolledCourseSummary[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("enrollments")
    .select("status, courses(id, title, lesson_count, duration_hours)")
    .eq("learner_id", userId)
    .order("enrolled_at", { ascending: false })

  if (error) {
    console.error("getEnrolledCoursesWithDetails failed:", error.message)
    return []
  }

  return data
    .map((row) => {
      const course = Array.isArray(row.courses) ? row.courses[0] : row.courses
      return course ? { ...course, status: row.status } : null
    })
    .filter((course): course is EnrolledCourseSummary => course !== null)
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
