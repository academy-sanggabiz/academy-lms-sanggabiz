import { createClient } from "@/lib/supabase/server"
import { getAdminProfile } from "@/lib/auth/require-admin"
import { paginated, rangeFor, type ListParams, type Paginated } from "@/lib/pagination"

export type PendingAttemptSummary = {
  attemptId: string
  quizId: string
  quizTitle: string
  lessonId: string
  lessonTitle: string
  sectionTitle: string
  courseId: string
  courseTitle: string
  learnerId: string
  learnerName: string
  learnerEmail: string
  submittedAt: string | null
  /** Responses still needing manual grading -- essays plus any keyless short_answer. */
  pendingCount: number
}

/**
 * Whether a question type is left ungraded by public.grade_attempt() and
 * therefore needs a human score: essays, file uploads, and short_answer
 * questions authored with no accepted-keyword option. Kept in one place so
 * the CSV export and the drill-down aggregators can't drift from what the SQL
 * function actually does.
 */
export function isManuallyGraded(type: string, options: { is_correct: boolean }[]): boolean {
  return type === "essay" || type === "file_upload" || (type === "short_answer" && !options.some((o) => o.is_correct))
}

async function ownerFilterOrNull(): Promise<string | null> {
  const admin = await getAdminProfile()
  return admin && admin.role !== "superadmin" ? admin.userId : null
}

export type GradingCourseSummary = {
  courseId: string
  courseTitle: string
  quizCount: number
  learnerCount: number
  attemptCount: number
  oldestSubmittedAt: string | null
}

type AdminGradingCourseRow = {
  course_id: string
  course_title: string
  quiz_count: number
  learner_count: number
  attempt_count: number
  oldest_submitted_at: string | null
  total_count: number
}

/**
 * Level 1: courses with at least one attempt still awaiting manual grading.
 * RPC-backed -- see admin_grading_courses() (pagination migration), which
 * groups public.admin_pending_attempts in SQL and re-applies the same
 * ownership check listPendingAttempts used to do in JS (the query itself is
 * now scoped, rather than the client post-filtering a platform-wide result).
 */
export async function listGradingCourses(p: ListParams): Promise<Paginated<GradingCourseSummary>> {
  const supabase = await createClient()
  const offset = (p.page - 1) * p.pageSize

  const { data, error } = await supabase.rpc("admin_grading_courses", {
    p_q: p.q,
    p_limit: p.pageSize,
    p_offset: offset,
  })

  if (error || !data) {
    console.error("listGradingCourses failed:", error?.message)
    return paginated([], 0, p)
  }

  const rows = (data as AdminGradingCourseRow[]).map((row) => ({
    courseId: row.course_id,
    courseTitle: row.course_title,
    quizCount: row.quiz_count,
    learnerCount: row.learner_count,
    attemptCount: row.attempt_count,
    oldestSubmittedAt: row.oldest_submitted_at,
  }))
  const total = data.length > 0 ? (data as AdminGradingCourseRow[])[0].total_count : 0

  return paginated(rows, total, p)
}

type AdminGradingStatsRow = { attempt_count: number; course_count: number }

/** RPC-backed -- see admin_grading_stats() (pagination migration). Replaces the page's previous .reduce() over the full array. */
export async function getGradingStats(): Promise<{ attemptCount: number; courseCount: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_grading_stats").single<AdminGradingStatsRow>()

  if (error || !data) {
    console.error("getGradingStats failed:", error?.message)
    return { attemptCount: 0, courseCount: 0 }
  }

  return { attemptCount: data.attempt_count, courseCount: data.course_count }
}

export type GradingQuizSummary = {
  quizId: string
  quizTitle: string
  lessonTitle: string
  sectionTitle: string
  attemptCount: number
  pendingResponseCount: number
  oldestSubmittedAt: string | null
}

type AdminGradingQuizRow = {
  quiz_id: string
  quiz_title: string
  lesson_title: string
  section_title: string
  attempt_count: number
  pending_response_count: number
  oldest_submitted_at: string | null
  total_count: number
}

/**
 * Level 2: quizzes with pending attempts within one course. Returns the
 * course title even when the filtered quiz page is empty -- the caller
 * should only 404 when the course has no course row at all (see
 * app/admin/grading/course/[courseId]/page.tsx), not when a search matches
 * nothing, or searching would 404 the page.
 */
export async function getCourseGradingQuizzes(
  courseId: string,
  p: ListParams
): Promise<{ courseId: string; courseTitle: string; quizzes: Paginated<GradingQuizSummary> } | null> {
  const supabase = await createClient()
  const offset = (p.page - 1) * p.pageSize

  const [{ data: course, error: courseError }, { data, error }] = await Promise.all([
    supabase.from("courses").select("title").eq("id", courseId).maybeSingle(),
    supabase.rpc("admin_grading_quizzes", {
      p_course_id: courseId,
      p_q: p.q,
      p_limit: p.pageSize,
      p_offset: offset,
    }),
  ])

  if (courseError || !course) return null
  if (error || !data) {
    console.error("getCourseGradingQuizzes failed:", error?.message)
    return { courseId, courseTitle: course.title, quizzes: paginated([], 0, p) }
  }

  const rows = (data as AdminGradingQuizRow[]).map((row) => ({
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    lessonTitle: row.lesson_title,
    sectionTitle: row.section_title,
    attemptCount: row.attempt_count,
    pendingResponseCount: row.pending_response_count,
    oldestSubmittedAt: row.oldest_submitted_at,
  }))
  const total = data.length > 0 ? (data as AdminGradingQuizRow[])[0].total_count : 0

  return { courseId, courseTitle: course.title, quizzes: paginated(rows, total, p) }
}

/**
 * Level 3: pending attempts (learners) for one quiz. Reads
 * admin_pending_attempts directly (no grouping needed at this level) with an
 * explicit ownership filter for non-superadmins, closing the same gap the
 * grouped levels above close -- the query is scoped, not the JS result.
 */
export async function getQuizGradingAttempts(
  quizId: string,
  p: ListParams
): Promise<{
  quizId: string
  quizTitle: string | null
  lessonTitle: string | null
  courseId: string | null
  courseTitle: string | null
  attempts: Paginated<PendingAttemptSummary>
} | null> {
  const supabase = await createClient()
  const ownerId = await ownerFilterOrNull()

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, title, lesson:lessons(title, section:course_sections(course:courses(id, title)))")
    .eq("id", quizId)
    .maybeSingle()

  if (quizError || !quiz) return null

  const lesson = Array.isArray(quiz.lesson) ? quiz.lesson[0] : quiz.lesson
  const section = lesson ? (Array.isArray(lesson.section) ? lesson.section[0] : lesson.section) : null
  const course = section ? (Array.isArray(section.course) ? section.course[0] : section.course) : null

  let query = supabase
    .from("admin_pending_attempts")
    .select("*", { count: "exact" })
    .eq("quiz_id", quizId)
  if (ownerId) {
    query = query.eq("course_created_by", ownerId)
  }
  if (p.q) {
    query = query.or(`learner_name.ilike.%${p.q}%,learner_email.ilike.%${p.q}%`)
  }

  const [from, to] = rangeFor(p.page, p.pageSize)
  query = query.order("submitted_at", { ascending: p.dir === "asc" }).range(from, to)

  const { data, error, count } = await query

  if (error || !data) {
    console.error("getQuizGradingAttempts failed:", error?.message)
    return {
      quizId,
      quizTitle: quiz.title,
      lessonTitle: lesson?.title ?? null,
      courseId: course?.id ?? null,
      courseTitle: course?.title ?? null,
      attempts: paginated([], 0, p),
    }
  }

  const attempts = data.map((row) => ({
    attemptId: row.attempt_id,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    sectionTitle: row.section_title,
    courseId: row.course_id,
    courseTitle: row.course_title,
    learnerId: row.learner_id,
    learnerName: row.learner_name,
    learnerEmail: row.learner_email,
    submittedAt: row.submitted_at,
    pendingCount: row.pending_count,
  }))

  return {
    quizId,
    quizTitle: quiz.title,
    lessonTitle: lesson?.title ?? null,
    courseId: course?.id ?? null,
    courseTitle: course?.title ?? null,
    attempts: paginated(attempts, count, p),
  }
}

export type GradingQuestion = {
  id: string
  type: string
  prompt: string
  points: number
  response: string
  isCorrect: boolean | null
  pointsAwarded: number | null
}

export type AttemptGradingDetail = {
  attemptId: string
  quizId: string
  quizTitle: string
  courseId: string
  courseTitle: string
  lessonTitle: string
  learnerName: string
  learnerEmail: string
  submittedAt: string | null
  questions: GradingQuestion[]
}

/**
 * Full detail for a single pending attempt, for the per-attempt grading form.
 * Same app-layer ownership guard as listPendingAttempts -- returns null (as
 * if not found) when the attempt's course belongs to a different admin.
 */
export async function getAttemptGradingDetail(attemptId: string): Promise<AttemptGradingDetail | null> {
  const supabase = await createClient()
  const admin = await getAdminProfile()

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select(
      `id, submitted_at, quiz_id,
       learner:profiles!quiz_attempts_learner_id_fkey(full_name, email),
       quiz:quizzes(
         title,
         lesson:lessons(
           title,
           section:course_sections(course:courses(id, title, created_by))
         )
       )`
    )
    .eq("id", attemptId)
    .single()

  if (attemptError || !attempt) return null

  const quiz = Array.isArray(attempt.quiz) ? attempt.quiz[0] : attempt.quiz
  const lesson = quiz ? (Array.isArray(quiz.lesson) ? quiz.lesson[0] : quiz.lesson) : null
  const section = lesson ? (Array.isArray(lesson.section) ? lesson.section[0] : lesson.section) : null
  const course = section ? (Array.isArray(section.course) ? section.course[0] : section.course) : null
  const learner = Array.isArray(attempt.learner) ? attempt.learner[0] : attempt.learner

  if (admin && admin.role !== "superadmin" && course?.created_by !== admin.userId) {
    return null
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, type, prompt, points, position")
    .eq("quiz_id", attempt.quiz_id)
    .order("position", { ascending: true })

  if (questionsError || !questions) return null

  const { data: responses, error: responsesError } = await supabase
    .from("quiz_responses")
    .select("question_id, response, is_correct, points_awarded")
    .eq("attempt_id", attemptId)

  if (responsesError || !responses) return null

  const responseByQuestion = new Map(responses.map((r) => [r.question_id, r]))

  return {
    attemptId: attempt.id,
    quizId: attempt.quiz_id,
    quizTitle: quiz?.title ?? "Untitled quiz",
    courseId: course?.id ?? "",
    courseTitle: course?.title ?? "Untitled course",
    lessonTitle: lesson?.title ?? "Untitled lesson",
    learnerName: learner?.full_name ?? "Unknown learner",
    learnerEmail: learner?.email ?? "",
    submittedAt: attempt.submitted_at,
    questions: questions.map((q) => {
      const response = responseByQuestion.get(q.id)
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        response: typeof response?.response === "string" ? response.response : "",
        isCorrect: response?.is_correct ?? null,
        pointsAwarded: response?.points_awarded ?? null,
      }
    }),
  }
}
