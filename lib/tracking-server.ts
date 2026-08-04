import { createClient } from "@/lib/supabase/server"
import { getAdminProfile } from "@/lib/auth/require-admin"
import { getOwnedCourseIdsOrNull } from "@/lib/courses-admin"

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

/**
 * Level 1: every scoped enrollment with module/assignment completion %.
 * Module % = completed lesson_progress rows / total lessons in the course.
 * Assignment % = distinct quizzes with a submitted quiz_attempts row for
 * that learner / total quizzes in the course (no is_assessment filter --
 * there's no distinct "assignment" entity in the schema, see CLAUDE.md).
 */
export async function listTrackingEnrollments(): Promise<TrackingEnrollment[]> {
  const supabase = await createClient()
  const ownedCourseIds = await getOwnedCourseIdsOrNull()
  if (ownedCourseIds !== null && ownedCourseIds.length === 0) return []

  let enrollmentQuery = supabase
    .from("enrollments")
    .select("id, learner_id, course_id, profiles(full_name, email), courses(title)")
    .order("enrolled_at", { ascending: false })
  if (ownedCourseIds !== null) {
    enrollmentQuery = enrollmentQuery.in("course_id", ownedCourseIds)
  }

  const { data: enrollmentRows, error: enrollmentError } = await enrollmentQuery

  if (enrollmentError || !enrollmentRows) {
    if (enrollmentError) console.error("listTrackingEnrollments (enrollments) failed:", enrollmentError.message)
    return []
  }
  if (enrollmentRows.length === 0) return []

  const enrollments = enrollmentRows.map((e) => {
    const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
    const course = Array.isArray(e.courses) ? e.courses[0] : e.courses
    return {
      id: e.id,
      learnerId: e.learner_id,
      courseId: e.course_id,
      learnerName: profile?.full_name || profile?.email || "Unnamed learner",
      learnerEmail: profile?.email ?? "",
      courseTitle: course?.title ?? "Untitled course",
    }
  })

  const courseIds = [...new Set(enrollments.map((e) => e.courseId))]
  const enrollmentIds = enrollments.map((e) => e.id)
  const learnerIds = [...new Set(enrollments.map((e) => e.learnerId))]

  const { totalLessonsByCourse, completedByEnrollment, quizIdsByCourse, submittedQuizzesByLearner } =
    await loadCourseProgressMaps(supabase, courseIds, enrollmentIds, learnerIds)

  return enrollments.map((e) => {
    const totalLessons = totalLessonsByCourse.get(e.courseId) ?? 0
    const doneLessons = completedByEnrollment.get(e.id) ?? 0
    const modulePct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0

    const courseQuizIds = quizIdsByCourse.get(e.courseId) ?? []
    const submittedQuizIds = submittedQuizzesByLearner.get(e.learnerId)
    const doneQuizzes = submittedQuizIds
      ? courseQuizIds.filter((quizId) => submittedQuizIds.has(quizId)).length
      : 0
    const assignmentPct = courseQuizIds.length > 0 ? Math.round((doneQuizzes / courseQuizIds.length) * 100) : 0

    return {
      enrollmentId: e.id,
      learnerId: e.learnerId,
      learnerName: e.learnerName,
      learnerEmail: e.learnerEmail,
      courseId: e.courseId,
      courseTitle: e.courseTitle,
      modulePct,
      assignmentPct,
    }
  })
}

/** Shared lesson/quiz aggregation, factored out so getTrackingDetail can reuse it for a single course/enrollment. */
async function loadCourseProgressMaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseIds: string[],
  enrollmentIds: string[],
  learnerIds: string[]
) {
  const [{ data: sections }, { data: progress }] = await Promise.all([
    supabase.from("course_sections").select("id, course_id").in("course_id", courseIds),
    supabase.from("lesson_progress").select("enrollment_id").in("enrollment_id", enrollmentIds).eq("completed", true),
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

  const lessonToCourse = new Map((lessons ?? []).map((l) => [l.id, sectionToCourse.get(l.section_id)]))
  const lessonIds = [...lessonToCourse.keys()]

  const { data: quizzes } =
    lessonIds.length > 0
      ? await supabase.from("quizzes").select("id, lesson_id").in("lesson_id", lessonIds)
      : { data: [] as { id: string; lesson_id: string | null }[] }

  const quizToCourse = new Map<string, string>()
  for (const q of quizzes ?? []) {
    const courseId = q.lesson_id ? lessonToCourse.get(q.lesson_id) : null
    if (courseId) quizToCourse.set(q.id, courseId)
  }

  const quizIdsByCourse = new Map<string, string[]>()
  for (const [quizId, courseId] of quizToCourse) {
    const list = quizIdsByCourse.get(courseId) ?? []
    list.push(quizId)
    quizIdsByCourse.set(courseId, list)
  }

  const quizIds = [...quizToCourse.keys()]
  const { data: attempts } =
    quizIds.length > 0 && learnerIds.length > 0
      ? await supabase
          .from("quiz_attempts")
          .select("quiz_id, learner_id")
          .in("quiz_id", quizIds)
          .in("learner_id", learnerIds)
          .not("submitted_at", "is", null)
      : { data: [] as { quiz_id: string; learner_id: string }[] }

  const submittedQuizzesByLearner = new Map<string, Set<string>>()
  for (const a of attempts ?? []) {
    const set = submittedQuizzesByLearner.get(a.learner_id) ?? new Set<string>()
    set.add(a.quiz_id)
    submittedQuizzesByLearner.set(a.learner_id, set)
  }

  return { totalLessonsByCourse, completedByEnrollment, quizIdsByCourse, submittedQuizzesByLearner, lessonToCourse }
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
 * guard as getAttemptGradingDetail (lib/grading-server.ts) -- returns null
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
