import { createClient } from "@/lib/supabase/server"
import { getAdminProfile } from "@/lib/auth/require-admin"
import { paginated, rangeFor, type ListParams, type Paginated } from "@/lib/pagination"

/** Server-only admin data access for Online Tracking -- never import from a Client Component. */

export type TrackingEnrollment = {
  enrollmentId: string
  learnerId: string
  learnerName: string
  learnerEmail: string
  courseId: string
  courseTitle: string
  modulePct: number
  assignmentPct: number
}

type AdminTrackingRow = {
  enrollment_id: string
  learner_id: string
  learner_name: string
  learner_email: string
  course_id: string
  course_title: string
  module_pct: number
  assignment_pct: number
}

/**
 * Level 1: every scoped enrollment with module/assignment completion %.
 * Reads the admin_tracking_enrollments view (pagination migration), which
 * pre-computes module/assignment % in SQL via lateral subqueries -- this
 * replaces the previous 6-query .in()-fan-out + JS percentage math.
 * Module % = completed lesson_progress rows / total lessons in the course.
 * Assignment % = distinct quizzes with a submitted quiz_attempts row for
 * that learner / total quizzes in the course (no is_assessment filter --
 * there's no distinct "assignment" entity in the schema, see CLAUDE.md).
 */
export async function listTrackingEnrollments(p: ListParams): Promise<Paginated<TrackingEnrollment>> {
  const supabase = await createClient()
  const admin = await getAdminProfile()

  let query = supabase.from("admin_tracking_enrollments").select("*", { count: "exact" })
  if (admin && admin.role !== "superadmin") {
    query = query.eq("course_created_by", admin.userId)
  }
  if (p.q) {
    query = query.or(`learner_name.ilike.%${p.q}%,learner_email.ilike.%${p.q}%,course_title.ilike.%${p.q}%`)
  }

  const [from, to] = rangeFor(p.page, p.pageSize)
  query = query.order("enrolled_at", { ascending: p.dir === "asc" }).range(from, to)

  const { data, error, count } = await query

  if (error || !data) {
    console.error("listTrackingEnrollments failed:", error?.message)
    return paginated([], 0, p)
  }

  const rows = (data as AdminTrackingRow[]).map((row) => ({
    enrollmentId: row.enrollment_id,
    learnerId: row.learner_id,
    learnerName: row.learner_name,
    learnerEmail: row.learner_email,
    courseId: row.course_id,
    courseTitle: row.course_title,
    modulePct: row.module_pct,
    assignmentPct: row.assignment_pct,
  }))

  return paginated(rows, count, p)
}

type AdminTrackingStatsRow = { total_enrollments: number; avg_module_pct: number }

/** RPC-backed -- see admin_tracking_stats() (pagination migration). Replaces the page's previous .reduce() over the full array. */
export async function getTrackingStats(): Promise<{ totalEnrollments: number; avgModulePct: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_tracking_stats").single<AdminTrackingStatsRow>()

  if (error || !data) {
    console.error("getTrackingStats failed:", error?.message)
    return { totalEnrollments: 0, avgModulePct: 0 }
  }

  return { totalEnrollments: data.total_enrollments, avgModulePct: data.avg_module_pct }
}

export type LessonTrackingRow = {
  lessonId: string
  title: string
  sectionTitle: string
  completed: boolean
}

export type QuizTrackingRow = {
  quizId: string
  quizTitle: string
  status: "not_started" | "in_progress" | "pending_review" | "graded"
  score: number | null
  passed: boolean | null
  submittedAt: string | null
}

export type TrackingDetail = TrackingEnrollment & {
  lessons: LessonTrackingRow[]
  quizzes: QuizTrackingRow[]
}

/**
 * Level 2: full lesson + quiz breakdown for one enrollment. Same ownership
 * guard as getCourseGradingMatrix (lib/grading-server.ts) -- returns null
 * (treated as not found) if the enrollment's course belongs to a different
 * admin.
 */
export async function getTrackingDetail(enrollmentId: string): Promise<TrackingDetail | null> {
  const supabase = await createClient()
  const admin = await getAdminProfile()

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, learner_id, course_id, profiles(full_name, email), courses(title, created_by)")
    .eq("id", enrollmentId)
    .single()

  if (enrollmentError || !enrollment) return null

  const profile = Array.isArray(enrollment.profiles) ? enrollment.profiles[0] : enrollment.profiles
  const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses

  if (admin && admin.role !== "superadmin" && course?.created_by !== admin.userId) {
    return null
  }

  const courseId = enrollment.course_id
  const learnerId = enrollment.learner_id

  const { data: sections } = await supabase
    .from("course_sections")
    .select("id, title, position")
    .eq("course_id", courseId)
    .order("position", { ascending: true })

  const sectionIds = (sections ?? []).map((s) => s.id)
  const sectionTitleById = new Map((sections ?? []).map((s) => [s.id, s.title]))

  const { data: lessons } =
    sectionIds.length > 0
      ? await supabase
          .from("lessons")
          .select("id, title, section_id, position")
          .in("section_id", sectionIds)
          .order("position", { ascending: true })
      : { data: [] as { id: string; title: string; section_id: string; position: number }[] }

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("enrollment_id", enrollmentId)
    .eq("completed", true)

  const completedLessonIds = new Set((progress ?? []).map((p) => p.lesson_id))

  const lessonRows: LessonTrackingRow[] = (lessons ?? []).map((l) => ({
    lessonId: l.id,
    title: l.title,
    sectionTitle: sectionTitleById.get(l.section_id) ?? "",
    completed: completedLessonIds.has(l.id),
  }))

  const totalLessons = lessonRows.length
  const doneLessons = lessonRows.filter((l) => l.completed).length
  const modulePct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0

  const lessonIds = (lessons ?? []).map((l) => l.id)
  const { data: quizzes } =
    lessonIds.length > 0
      ? await supabase.from("quizzes").select("id, title, lesson_id").in("lesson_id", lessonIds)
      : { data: [] as { id: string; title: string; lesson_id: string }[] }

  type AttemptRow = {
    quiz_id: string
    attempt_number: number
    score: number | null
    passed: boolean | null
    status: "in_progress" | "pending_review" | "graded"
    submitted_at: string | null
  }

  const quizIds = (quizzes ?? []).map((q) => q.id)
  const { data: attempts } =
    quizIds.length > 0
      ? await supabase
          .from("quiz_attempts")
          .select("quiz_id, attempt_number, score, passed, status, submitted_at")
          .in("quiz_id", quizIds)
          .eq("learner_id", learnerId)
      : { data: [] as AttemptRow[] }

  const latestAttemptByQuiz = new Map<string, AttemptRow>()
  for (const a of (attempts ?? []) as AttemptRow[]) {
    const current = latestAttemptByQuiz.get(a.quiz_id)
    if (!current || a.attempt_number > current.attempt_number) {
      latestAttemptByQuiz.set(a.quiz_id, a)
    }
  }

  const quizRows: QuizTrackingRow[] = (quizzes ?? []).map((q) => {
    const attempt = latestAttemptByQuiz.get(q.id)
    return {
      quizId: q.id,
      quizTitle: q.title,
      status: attempt ? attempt.status : "not_started",
      score: attempt?.score ?? null,
      passed: attempt?.passed ?? null,
      submittedAt: attempt?.submitted_at ?? null,
    }
  })

  const submittedQuizzes = quizRows.filter((q) => q.status !== "not_started" && q.status !== "in_progress").length
  const assignmentPct = quizRows.length > 0 ? Math.round((submittedQuizzes / quizRows.length) * 100) : 0

  return {
    enrollmentId: enrollment.id,
    learnerId,
    learnerName: profile?.full_name || profile?.email || "Unnamed learner",
    learnerEmail: profile?.email ?? "",
    courseId,
    courseTitle: course?.title ?? "Untitled course",
    modulePct,
    assignmentPct,
    lessons: lessonRows,
    quizzes: quizRows,
  }
}
