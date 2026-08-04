import { createClient } from "@/lib/supabase/server"
import { recordEnrollmentTransaction } from "@/lib/transactions-server"
import { getOwnedCourseIdsOrNull } from "@/lib/courses-admin"

/** Server-only admin data access for Learner Management -- never import from a Client Component. */

export type AdminLearner = {
  id: string
  name: string
  email: string
  initial: string
  enrolledCount: number
  completedCount: number
  enrolledCourseIds: string[]
}

export type AdminLearnerStats = {
  totalLearners: number
  totalEnrollments: number
  totalCompleted: number
}

export type AdminLearnerDetail = {
  id: string
  name: string
  email: string
  initial: string
}

export type AdminLearnerCourseProgress = {
  enrollmentId: string
  courseId: string
  title: string
  thumbnailUrl: string | null
  enrolledAt: string
  completed: boolean
  pct: number
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

/**
 * enrollments should already be RLS-scoped to courses the acting admin owns
 * (superadmin: every course), so deriving the learner set from enrollments
 * -- rather than starting from the global `profiles` table -- is what keeps
 * Learner Management isolated per admin. The explicit .in("course_id", ...)
 * filter below is a belt-and-suspenders app-layer guard on top of that RLS
 * (see getOwnedCourseIdsOrNull, lib/courses-admin.ts) -- it keeps this list
 * correct even if the owns_course() RLS migration hasn't actually landed.
 */
export async function getAdminLearnerList(): Promise<AdminLearner[]> {
  const supabase = await createClient()
  const ownedCourseIds = await getOwnedCourseIdsOrNull()
  if (ownedCourseIds !== null && ownedCourseIds.length === 0) return []

  let query = supabase.from("enrollments").select("learner_id, course_id, status")
  if (ownedCourseIds !== null) {
    query = query.in("course_id", ownedCourseIds)
  }

  const { data: enrollments, error: enrollmentsError } = await query

  if (enrollmentsError) {
    console.error("getAdminLearnerList (enrollments) failed:", enrollmentsError.message)
    return []
  }

  const counts = new Map<string, { enrolled: number; completed: number; courseIds: string[] }>()
  for (const e of enrollments ?? []) {
    const entry = counts.get(e.learner_id) ?? { enrolled: 0, completed: 0, courseIds: [] }
    entry.enrolled += 1
    entry.courseIds.push(e.course_id)
    if (e.status === "completed") entry.completed += 1
    counts.set(e.learner_id, entry)
  }

  const learnerIds = [...counts.keys()]
  if (learnerIds.length === 0) return []

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", learnerIds)

  if (profilesError || !profiles) {
    console.error("getAdminLearnerList failed:", profilesError?.message)
    return []
  }

  return profiles.map((p) => {
    const name = p.full_name || p.email || "Unnamed learner"
    const entry = counts.get(p.id) ?? { enrolled: 0, completed: 0, courseIds: [] }
    return {
      id: p.id,
      name,
      email: p.email ?? "",
      initial: initialOf(name),
      enrolledCount: entry.enrolled,
      completedCount: entry.completed,
      enrolledCourseIds: entry.courseIds,
    }
  })
}

/** Same owner-scoping rationale as getAdminLearnerList -- totalLearners counts distinct learners across scoped enrollments, not the global learner count. */
export async function getAdminLearnerStats(): Promise<AdminLearnerStats> {
  const supabase = await createClient()
  const ownedCourseIds = await getOwnedCourseIdsOrNull()
  if (ownedCourseIds !== null && ownedCourseIds.length === 0) {
    return { totalLearners: 0, totalEnrollments: 0, totalCompleted: 0 }
  }

  let query = supabase.from("enrollments").select("learner_id, status")
  if (ownedCourseIds !== null) {
    query = query.in("course_id", ownedCourseIds)
  }

  const { data: enrollments, error } = await query

  if (error) {
    console.error("getAdminLearnerStats failed:", error.message)
    return { totalLearners: 0, totalEnrollments: 0, totalCompleted: 0 }
  }

  const rows = enrollments ?? []
  const distinctLearners = new Set(rows.map((e) => e.learner_id))
  const totalCompleted = rows.filter((e) => e.status === "completed").length

  return {
    totalLearners: distinctLearners.size,
    totalEnrollments: rows.length,
    totalCompleted,
  }
}

export async function getAdminLearnerDetail(learnerId: string): Promise<AdminLearnerDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", learnerId)
    .eq("role", "learner")
    .maybeSingle()

  if (error || !data) {
    if (error) console.error("getAdminLearnerDetail failed:", error.message)
    return null
  }

  const name = data.full_name || data.email || "Unnamed learner"
  return {
    id: data.id,
    name,
    email: data.email ?? "",
    initial: initialOf(name),
  }
}

export async function getAdminLearnerCourseProgress(
  learnerId: string
): Promise<AdminLearnerCourseProgress[]> {
  const supabase = await createClient()
  const ownedCourseIds = await getOwnedCourseIdsOrNull()
  if (ownedCourseIds !== null && ownedCourseIds.length === 0) return []

  let query = supabase
    .from("enrollments")
    .select("id, status, enrolled_at, course:courses(id, title, thumbnail_url)")
    .eq("learner_id", learnerId)
    .order("enrolled_at", { ascending: false })
  if (ownedCourseIds !== null) {
    query = query.in("course_id", ownedCourseIds)
  }

  const { data: rows, error } = await query

  if (error || !rows) {
    if (error) console.error("getAdminLearnerCourseProgress failed:", error.message)
    return []
  }

  const enrollments = rows.map((e) => ({
    ...e,
    course: Array.isArray(e.course) ? e.course[0] : e.course,
  }))

  const courseIds = enrollments.map((e) => e.course.id)
  const enrollmentIds = enrollments.map((e) => e.id)

  const [{ data: sections }, { data: progress }] = await Promise.all([
    courseIds.length > 0
      ? supabase.from("course_sections").select("id, course_id").in("course_id", courseIds)
      : Promise.resolve({ data: [] as { id: string; course_id: string }[] }),
    enrollmentIds.length > 0
      ? supabase
          .from("lesson_progress")
          .select("enrollment_id")
          .in("enrollment_id", enrollmentIds)
          .eq("completed", true)
      : Promise.resolve({ data: [] as { enrollment_id: string }[] }),
  ])

  const sectionToCourse = new Map((sections ?? []).map((s) => [s.id, s.course_id]))
  const sectionIds = [...sectionToCourse.keys()]

  const { data: lessons } =
    sectionIds.length > 0
      ? await supabase.from("lessons").select("id, section_id").in("section_id", sectionIds)
      : { data: [] as { id: string; section_id: string }[] }

  const totalLessonsByCourse = new Map<string, number>()
  for (const l of lessons ?? []) {
    const courseId = sectionToCourse.get(l.section_id)
    if (!courseId) continue
    totalLessonsByCourse.set(courseId, (totalLessonsByCourse.get(courseId) ?? 0) + 1)
  }

  const completedByEnrollment = new Map<string, number>()
  for (const p of progress ?? []) {
    completedByEnrollment.set(p.enrollment_id, (completedByEnrollment.get(p.enrollment_id) ?? 0) + 1)
  }

  return enrollments.map((e) => {
    const total = totalLessonsByCourse.get(e.course.id) ?? 0
    const done = completedByEnrollment.get(e.id) ?? 0
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return {
      enrollmentId: e.id,
      courseId: e.course.id,
      title: e.course.title,
      thumbnailUrl: e.course.thumbnail_url,
      enrolledAt: e.enrolled_at,
      completed: e.status === "completed" || (total > 0 && done >= total),
      pct,
    }
  })
}

export type LearnerSearchResult = {
  id: string
  name: string
  email: string
  initial: string
}

/** PostgREST's .or() takes a comma-separated filter list, and each filter's
 * value ends at the next comma -- so a comma in user input would split one
 * filter into two malformed ones. `%`/`_` are ilike wildcards, and parens
 * would break out of the filter group. Strip all of them rather than trying to
 * escape, since none are meaningful in a name/email search. */
function escapeForOrFilter(value: string): string {
  return value.replace(/[,()%_\\]/g, " ").trim()
}

/**
 * Search ALL registered learners by name/email, for the invite picker on a
 * course's Learners tab.
 *
 * Deliberately starts from `profiles` rather than `enrollments`, unlike
 * getAdminLearnerList above: the whole point is finding a learner the admin
 * has NOT enrolled yet, who by definition has no enrollment row to derive
 * from. `profiles` stays globally admin-readable ("admins read all profiles"),
 * which is what makes this possible -- so this is intentionally not
 * owner-scoped. Only ever returns role='learner' rows, so admins are not
 * enrollable through it.
 */
export async function searchLearners(query: string): Promise<LearnerSearchResult[]> {
  const term = escapeForOrFilter(query)
  if (term.length < 2) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "learner")
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
    .order("full_name")
    .limit(20)

  if (error || !data) {
    console.error("searchLearners failed:", error?.message)
    return []
  }

  return data.map((p) => {
    const name = p.full_name || p.email || "Unnamed learner"
    return { id: p.id, name, email: p.email ?? "", initial: initialOf(name) }
  })
}

export type CourseRosterEntry = {
  learnerId: string
  name: string
  email: string
  initial: string
  status: "active" | "completed"
  enrolledAt: string
}

/**
 * Learners enrolled in one course -- the course-centric inverse of
 * getAdminLearnerList. Scoped by the owns_course() RLS on enrollments, so an
 * admin can only read the roster of a course they own.
 */
export async function getCourseRoster(courseId: string): Promise<CourseRosterEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("enrollments")
    .select("learner_id, status, enrolled_at, profiles(id, full_name, email)")
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false })

  if (error || !data) {
    console.error("getCourseRoster failed:", error?.message)
    return []
  }

  return data.map((row) => {
    // profiles is a to-one relation here, but PostgREST's generated types
    // widen embedded rows to an array -- normalize the same way getCourseDetail
    // does for lesson.quiz.
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const name = profile?.full_name || profile?.email || "Unnamed learner"
    return {
      learnerId: row.learner_id,
      name,
      email: profile?.email ?? "",
      initial: initialOf(name),
      status: row.status as "active" | "completed",
      enrolledAt: row.enrolled_at,
    }
  })
}

export async function enrollLearnerInCourse(
  learnerId: string,
  courseId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("enrollments")
    .upsert({ learner_id: learnerId, course_id: courseId }, { onConflict: "learner_id,course_id" })

  if (error) {
    console.error("enrollLearnerInCourse failed:", error.message)
    return { error: error.message }
  }

  await recordEnrollmentTransaction(supabase, learnerId, courseId)

  return { ok: true }
}

export async function unenrollLearnerFromCourse(
  learnerId: string,
  courseId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("learner_id", learnerId)
    .eq("course_id", courseId)

  if (error) {
    console.error("unenrollLearnerFromCourse failed:", error.message)
    return { error: error.message }
  }
  return { ok: true }
}
