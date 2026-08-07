import { createClient } from "@/lib/supabase/server"
import { paginated, rangeFor, type ListParams, type Paginated } from "@/lib/pagination"

/** Server-only admin data access for a course's feedback tab -- never import from a Client Component. */

export type CourseFeedbackEntry = {
  id: string
  learnerName: string
  rating: number
  comment: string
  createdAt: string
}

export type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>

export type CourseFeedbackSummary = {
  average: number | null
  count: number
  distribution: RatingDistribution
}

/**
 * Aggregate stats across every feedback row for the course -- scoped by RLS's
 * "admins can select course_feedback" (owns_course()), so this never needs an
 * app-layer ownership filter.
 */
export async function getCourseFeedbackSummary(courseId: string): Promise<CourseFeedbackSummary> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("course_feedback").select("rating").eq("course_id", courseId)

  if (error || !data) {
    console.error("getCourseFeedbackSummary failed:", error?.message)
    return { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  }

  const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  for (const row of data) {
    const rating = row.rating as 1 | 2 | 3 | 4 | 5
    distribution[rating] = (distribution[rating] ?? 0) + 1
    sum += rating
  }

  return {
    average: data.length > 0 ? Math.round((sum / data.length) * 10) / 10 : null,
    count: data.length,
    distribution,
  }
}

/**
 * Paginated feedback list for one course. Mirrors getCourseRoster's shape
 * (lib/learners-admin.ts): profiles!inner so search filters the parent row,
 * not just the embed.
 */
export async function getCourseFeedback(courseId: string, p: ListParams): Promise<Paginated<CourseFeedbackEntry>> {
  const supabase = await createClient()

  let query = supabase
    .from("course_feedback")
    .select("id, rating, comment, created_at, profiles!inner(full_name, email)", { count: "exact" })
    .eq("course_id", courseId)
  if (p.q) {
    query = query.or(`full_name.ilike.%${p.q}%,email.ilike.%${p.q}%`, { referencedTable: "profiles" })
  }

  const [from, to] = rangeFor(p.page, p.pageSize)
  query = query.order("created_at", { ascending: p.dir === "asc" }).range(from, to)

  const { data, error, count } = await query

  if (error || !data) {
    console.error("getCourseFeedback failed:", error?.message)
    return paginated([], 0, p)
  }

  const rows = data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: row.id,
      learnerName: profile?.full_name || profile?.email || "Unnamed learner",
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
    }
  })

  return paginated(rows, count, p)
}
