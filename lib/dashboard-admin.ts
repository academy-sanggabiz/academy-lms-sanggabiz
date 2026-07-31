import { createClient } from "@/lib/supabase/server"

/** Server-only admin data access for the Dashboard overview -- never import from a Client Component. */

export type RecentEnrollment = {
  id: string
  learnerName: string
  courseTitle: string
  enrolledAt: string
}

export async function getRecentEnrollments(limit = 5): Promise<RecentEnrollment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, enrolled_at, profiles(full_name, email), courses(title)")
    .order("enrolled_at", { ascending: false })
    .limit(limit)

  if (error || !data) {
    if (error) console.error("getRecentEnrollments failed:", error.message)
    return []
  }

  return data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses
    return {
      id: row.id,
      learnerName: profile?.full_name || profile?.email || "Unnamed learner",
      courseTitle: course?.title ?? "Untitled course",
      enrolledAt: row.enrolled_at,
    }
  })
}
