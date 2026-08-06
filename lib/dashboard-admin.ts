import { createClient } from "@/lib/supabase/server"
import { getOwnedCourseIdsOrNull } from "@/lib/courses-admin"
import { paginated, rangeFor, type Paginated } from "@/lib/pagination"

/** Server-only admin data access for the Dashboard overview -- never import from a Client Component. */

export type RecentEnrollment = {
  id: string
  learnerName: string
  courseTitle: string
  enrolledAt: string
}

/**
 * Same app-layer ownership guard as lib/purchases-admin.ts /
 * lib/learners-admin.ts -- enrollments has a direct course_id column, so
 * this filters explicitly rather than relying solely on owns_course() RLS
 * (see getOwnedCourseIdsOrNull, lib/courses-admin.ts).
 */
export async function getRecentEnrollments(p: { page: number; pageSize: number }): Promise<Paginated<RecentEnrollment>> {
  const supabase = await createClient()
  const ownedCourseIds = await getOwnedCourseIdsOrNull()
  if (ownedCourseIds !== null && ownedCourseIds.length === 0) return paginated([], 0, p)

  let query = supabase
    .from("enrollments")
    .select("id, enrolled_at, profiles(full_name, email), courses(title)", { count: "exact" })
  if (ownedCourseIds !== null) {
    query = query.in("course_id", ownedCourseIds)
  }

  const [from, to] = rangeFor(p.page, p.pageSize)
  query = query.order("enrolled_at", { ascending: false }).range(from, to)

  const { data, error, count } = await query

  if (error || !data) {
    if (error) console.error("getRecentEnrollments failed:", error.message)
    return paginated([], 0, p)
  }

  const rows = data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses
    return {
      id: row.id,
      learnerName: profile?.full_name || profile?.email || "Unnamed learner",
      courseTitle: course?.title ?? "Untitled course",
      enrolledAt: row.enrolled_at,
    }
  })

  return paginated(rows, count, p)
}

