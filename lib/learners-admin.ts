import { createClient } from "@/lib/supabase/server"
import { recordEnrollmentTransaction } from "@/lib/transactions-server"
import { getOwnedCourseIdsOrNull } from "@/lib/courses-admin"
import { escapeForOrFilter, paginated, rangeFor, type ListParams, type Paginated } from "@/lib/pagination"
import { pickRepresentativeAttempt } from "@/lib/quiz-attempt-selection"

/** Server-only admin data access for Learner Management -- never import from a Client Component. */

export type AdminLearner = {
  id: string
  name: string
  email: string
  initial: string
  enrolledCount: number
  completedCount: number
}

export type AdminLearnerFilters = { filter: "all" | "enrolled" | "completed" }

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

type AdminLearnerPageRow = {
  learner_id: string
  name: string
  email: string
  enrolled_count: number
  completed_count: number
  total_count: number
}

/**
 * RPC-backed -- see admin_learner_page() (pagination migration). Replaces
 * the previous approach of reading every enrollment row and folding it into
 * a JS Map keyed by learner; the RPC re-applies the same owner-scoping
 * (created_by = auth.uid() or is_superadmin()) directly in SQL, so it keeps
 * the guard getOwnedCourseIdsOrNull() used to provide.
 */
export async function getAdminLearnerList(p: ListParams<AdminLearnerFilters>): Promise<Paginated<AdminLearner>> {
  const supabase = await createClient()
  const offset = (p.page - 1) * p.pageSize

  const { data, error } = await supabase.rpc("admin_learner_page", {
    p_q: p.q,
    p_filter: p.filters.filter,
    p_sort: p.sort,
    p_dir: p.dir,
    p_limit: p.pageSize,
    p_offset: offset,
  })

  if (error || !data) {
    console.error("getAdminLearnerList failed:", error?.message)
    return paginated([], 0, p)
  }

  const rows = (data as AdminLearnerPageRow[]).map((row) => ({
    id: row.learner_id,
    name: row.name,
    email: row.email,
    initial: initialOf(row.name),
    enrolledCount: row.enrolled_count,
    completedCount: row.completed_count,
  }))
  const total = data.length > 0 ? (data as AdminLearnerPageRow[])[0].total_count : 0

  return paginated(rows, total, p)
}

type AdminLearnerStatsRow = {
  total_learners: number
  total_enrollments: number
  total_completed: number
}

/** RPC-backed -- see admin_learner_stats() (pagination migration). Replaces the previous full-table enrollments read + JS count. */
export async function getAdminLearnerStats(): Promise<AdminLearnerStats> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_learner_stats").single<AdminLearnerStatsRow>()

  if (error || !data) {
    console.error("getAdminLearnerStats failed:", error?.message)
    return { totalLearners: 0, totalEnrollments: 0, totalCompleted: 0 }
  }

  return {
    totalLearners: data.total_learners,
    totalEnrollments: data.total_enrollments,
    totalCompleted: data.total_completed,
  }
}

/**
 * Bounded to one learner -- for the Enroll modal's course-toggle list, which
 * needs to know which of the (small, unbounded) course picker's courses this
 * learner is already enrolled in. Fetched on modal open rather than shipped
 * in the paginated learner list payload, which no longer carries every
 * enrolled course id per row.
 */
export async function getLearnerEnrolledCourseIds(learnerId: string): Promise<string[]> {
  const supabase = await createClient()
  const ownedCourseIds = await getOwnedCourseIdsOrNull()
  if (ownedCourseIds !== null && ownedCourseIds.length === 0) return []

  let query = supabase.from("enrollments").select("course_id").eq("learner_id", learnerId)
  if (ownedCourseIds !== null) {
    query = query.in("course_id", ownedCourseIds)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error("getLearnerEnrolledCourseIds failed:", error?.message)
    return []
  }

  return data.map((row) => row.course_id)
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

export type AdminLearnerCertificate = {
  id: string
  courseId: string
  courseTitle: string
  serial: string
  issuedAt: string
  pdfUrl: string | null
}

/** Mirrors lib/certificates-server.ts's getLearnerCertificates() but for an arbitrary learner, owner-scoped. */
export async function getAdminLearnerCertificates(learnerId: string): Promise<AdminLearnerCertificate[]> {
  const supabase = await createClient()
  const ownedCourseIds = await getOwnedCourseIdsOrNull()
  if (ownedCourseIds !== null && ownedCourseIds.length === 0) return []

  const { data, error } = await supabase
    .from("certificates")
    .select("id, serial, issued_at, pdf_url, enrollment:enrollments!inner(learner_id, course:courses(id, title))")
    .eq("enrollment.learner_id", learnerId)
    .order("issued_at", { ascending: false })

  if (error || !data) {
    if (error) console.error("getAdminLearnerCertificates failed:", error.message)
    return []
  }

  const ownedSet = ownedCourseIds !== null ? new Set(ownedCourseIds) : null

  return data
    .map((row) => {
      const enrollment = Array.isArray(row.enrollment) ? row.enrollment[0] : row.enrollment
      const course = enrollment ? (Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course) : null
      if (!course) return null
      if (ownedSet !== null && !ownedSet.has(course.id)) return null
      return {
        id: row.id,
        courseId: course.id,
        courseTitle: course.title,
        serial: row.serial,
        issuedAt: row.issued_at,
        pdfUrl: row.pdf_url,
      }
    })
    .filter((c): c is AdminLearnerCertificate => c !== null)
}

export type AdminLearnerQuizScore = {
  attemptId: string
  quizId: string
  quizTitle: string
  courseTitle: string
  attemptNumber: number
  score: number | null
  passed: boolean
  status: string
  submittedAt: string | null
  passScore: number
}

type QuizScoreRow = {
  id: string
  quiz_id: string
  attempt_number: number
  score: number | null
  passed: boolean
  status: string
  submitted_at: string | null
  quiz:
    | {
        title: string
        pass_score: number
        is_assessment: boolean
        lesson:
          | {
              section:
                | { course_id: string; course: { title: string } | { title: string }[] | null }
                | { course_id: string; course: { title: string } | { title: string }[] | null }[]
                | null
            }
          | { section: unknown }[]
          | null
      }
    | { title: string; pass_score: number; is_assessment: boolean; lesson: unknown }[]
    | null
}

function toOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

/**
 * One row per quiz the learner has attempted (the representative attempt,
 * via the same pickRepresentativeAttempt rule getCourseGradingMatrix uses --
 * so the two admin views can't disagree), across every course -- cross-course,
 * unlike getCourseGradingMatrix which is course-centric. Owner-scoped in JS
 * since quiz_attempts carries no course_id column directly (has to resolve
 * through quiz -> lesson -> section -> course).
 */
export async function getAdminLearnerQuizScores(learnerId: string): Promise<AdminLearnerQuizScore[]> {
  const supabase = await createClient()
  const ownedCourseIds = await getOwnedCourseIdsOrNull()
  if (ownedCourseIds !== null && ownedCourseIds.length === 0) return []

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(
      `id, quiz_id, attempt_number, score, passed, status, submitted_at,
       quiz:quizzes(title, pass_score, is_assessment, lesson:lessons(section:course_sections(course_id, course:courses(title))))`
    )
    .eq("learner_id", learnerId)
    .neq("status", "in_progress")
    .order("attempt_number", { ascending: true })

  if (error || !data) {
    if (error) console.error("getAdminLearnerQuizScores failed:", error.message)
    return []
  }

  const ownedSet = ownedCourseIds !== null ? new Set(ownedCourseIds) : null
  const attemptsByQuizId = new Map<string, QuizScoreRow[]>()
  for (const row of data as unknown as QuizScoreRow[]) {
    const bucket = attemptsByQuizId.get(row.quiz_id) ?? []
    bucket.push(row)
    attemptsByQuizId.set(row.quiz_id, bucket)
  }

  const rows: AdminLearnerQuizScore[] = []

  for (const [quizId, quizAttempts] of attemptsByQuizId) {
    const quiz = toOne(quizAttempts[0].quiz)
    const lesson = quiz ? toOne(quiz.lesson as never) : null
    const section = lesson ? toOne((lesson as { section: unknown }).section as never) : null
    const courseId = (section as { course_id?: string } | null)?.course_id
    const course = section ? toOne((section as { course: unknown }).course as never) : null

    if (!quiz || !courseId) continue
    if (ownedSet !== null && !ownedSet.has(courseId)) continue

    const isAssessment = (quiz as { is_assessment: boolean }).is_assessment
    const representative = pickRepresentativeAttempt(quizAttempts, isAssessment)
    if (!representative) continue

    rows.push({
      attemptId: representative.id,
      quizId,
      quizTitle: (quiz as { title: string }).title,
      courseTitle: (course as { title?: string } | null)?.title ?? "",
      attemptNumber: representative.attempt_number,
      score: representative.score,
      passed: representative.passed,
      status: representative.status,
      submittedAt: representative.submitted_at,
      passScore: (quiz as { pass_score: number }).pass_score,
    })
  }

  return rows
}

export type LearnerSearchResult = {
  id: string
  name: string
  email: string
  initial: string
  alreadyEnrolled: boolean
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
 *
 * courseId (optional) stamps alreadyEnrolled on each result via one bounded
 * follow-up query (<=20 ids, the search's own .limit()) -- this replaces the
 * caller passing down a full enrolledLearnerIds list, which broke once the
 * roster itself became paginated (a learner enrolled but on roster page 3
 * would otherwise show as available to invite again).
 */
export async function searchLearners(query: string, courseId?: string): Promise<LearnerSearchResult[]> {
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

  let alreadyEnrolledIds = new Set<string>()
  if (courseId && data.length > 0) {
    const { data: enrolled } = await supabase
      .from("enrollments")
      .select("learner_id")
      .eq("course_id", courseId)
      .in(
        "learner_id",
        data.map((p) => p.id)
      )
    alreadyEnrolledIds = new Set((enrolled ?? []).map((e) => e.learner_id))
  }

  return data.map((p) => {
    const name = p.full_name || p.email || "Unnamed learner"
    return {
      id: p.id,
      name,
      email: p.email ?? "",
      initial: initialOf(name),
      alreadyEnrolled: alreadyEnrolledIds.has(p.id),
    }
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
 *
 * Uses profiles!inner so a referencedTable .or() filters parent enrollment
 * rows rather than merely nulling out the embed -- the one embedded-filter
 * case that works without a flattening view, since it's a single relation.
 */
export async function getCourseRoster(courseId: string, p: ListParams): Promise<Paginated<CourseRosterEntry>> {
  const supabase = await createClient()

  let query = supabase
    .from("enrollments")
    .select("learner_id, status, enrolled_at, profiles!inner(id, full_name, email)", { count: "exact" })
    .eq("course_id", courseId)
    .eq("profiles.role", "learner")
  if (p.q) {
    query = query.or(`full_name.ilike.%${p.q}%,email.ilike.%${p.q}%`, { referencedTable: "profiles" })
  }

  const [from, to] = rangeFor(p.page, p.pageSize)
  query = query.order("enrolled_at", { ascending: p.dir === "asc" }).range(from, to)

  const { data, error, count } = await query

  if (error || !data) {
    console.error("getCourseRoster failed:", error?.message)
    return paginated([], 0, p)
  }

  const rows = data.map((row) => {
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

  return paginated(rows, count, p)
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
