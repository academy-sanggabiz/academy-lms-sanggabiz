import { createClient } from "@/lib/supabase/server"
import { getAdminProfile } from "@/lib/auth/require-admin"

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

/**
 * Every quiz_attempts row still awaiting manual grading, newest submission
 * first. quiz_attempts has no direct course_id, so ownership is checked by
 * embedding created_by through quiz -> lesson -> section -> course and
 * post-filtering -- an app-layer guard on top of the owns_course() RLS (see
 * getOwnedCourseIdsOrNull, lib/courses-admin.ts, for why this belt-and-
 * suspenders filtering is needed even when RLS is correct).
 */
export async function listPendingAttempts(): Promise<PendingAttemptSummary[]> {
  const supabase = await createClient()
  const admin = await getAdminProfile()
  const scoped = admin && admin.role !== "superadmin"

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(
      `id, submitted_at,
       learner:profiles!quiz_attempts_learner_id_fkey(id, full_name, email),
       quiz:quizzes(
         id, title,
         lesson:lessons(
           id, title,
           section:course_sections(title, course:courses(id, title, created_by))
         )
       ),
       responses:quiz_responses(is_correct)`
    )
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: false })

  if (error || !data) return []

  const summaries: PendingAttemptSummary[] = []
  for (const attempt of data) {
    const quiz = Array.isArray(attempt.quiz) ? attempt.quiz[0] : attempt.quiz
    const lesson = quiz ? (Array.isArray(quiz.lesson) ? quiz.lesson[0] : quiz.lesson) : null
    const section = lesson ? (Array.isArray(lesson.section) ? lesson.section[0] : lesson.section) : null
    const course = section ? (Array.isArray(section.course) ? section.course[0] : section.course) : null
    const learner = Array.isArray(attempt.learner) ? attempt.learner[0] : attempt.learner

    if (scoped && course?.created_by !== admin.userId) continue

    summaries.push({
      attemptId: attempt.id,
      quizId: quiz?.id ?? "",
      quizTitle: quiz?.title ?? "Untitled quiz",
      lessonId: lesson?.id ?? "",
      lessonTitle: lesson?.title ?? "Untitled lesson",
      sectionTitle: section?.title ?? "",
      courseId: course?.id ?? "",
      courseTitle: course?.title ?? "Untitled course",
      learnerId: learner?.id ?? "",
      learnerName: learner?.full_name ?? "Unknown learner",
      learnerEmail: learner?.email ?? "",
      submittedAt: attempt.submitted_at,
      pendingCount: (attempt.responses ?? []).filter((r) => r.is_correct === null).length,
    })
  }
  return summaries
}

export type GradingCourseSummary = {
  courseId: string
  courseTitle: string
  quizCount: number
  learnerCount: number
  attemptCount: number
  oldestSubmittedAt: string | null
}

/** Level 1: courses with at least one attempt still awaiting manual grading. */
export async function listGradingCourses(): Promise<GradingCourseSummary[]> {
  const attempts = await listPendingAttempts()

  const groups = new Map<string, GradingCourseSummary & { quizIds: Set<string>; learnerIds: Set<string> }>()
  for (const a of attempts) {
    const key = a.courseId || "unknown"
    let group = groups.get(key)
    if (!group) {
      group = {
        courseId: key,
        courseTitle: a.courseTitle,
        quizCount: 0,
        learnerCount: 0,
        attemptCount: 0,
        oldestSubmittedAt: a.submittedAt,
        quizIds: new Set(),
        learnerIds: new Set(),
      }
      groups.set(key, group)
    }
    group.quizIds.add(a.quizId)
    group.learnerIds.add(a.learnerId)
    group.attemptCount += 1
    if (a.submittedAt && (!group.oldestSubmittedAt || a.submittedAt < group.oldestSubmittedAt)) {
      group.oldestSubmittedAt = a.submittedAt
    }
  }

  return [...groups.values()]
    .map(({ quizIds, learnerIds, ...rest }) => ({ ...rest, quizCount: quizIds.size, learnerCount: learnerIds.size }))
    .sort((a, b) => a.courseTitle.localeCompare(b.courseTitle))
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

/** Level 2: quizzes with pending attempts within one course. */
export async function getCourseGradingQuizzes(
  courseId: string
): Promise<{ courseId: string; courseTitle: string; quizzes: GradingQuizSummary[] } | null> {
  const attempts = (await listPendingAttempts()).filter((a) => a.courseId === courseId)
  if (attempts.length === 0) return null

  const groups = new Map<string, GradingQuizSummary>()
  for (const a of attempts) {
    let group = groups.get(a.quizId)
    if (!group) {
      group = {
        quizId: a.quizId,
        quizTitle: a.quizTitle,
        lessonTitle: a.lessonTitle,
        sectionTitle: a.sectionTitle,
        attemptCount: 0,
        pendingResponseCount: 0,
        oldestSubmittedAt: a.submittedAt,
      }
      groups.set(a.quizId, group)
    }
    group.attemptCount += 1
    group.pendingResponseCount += a.pendingCount
    if (a.submittedAt && (!group.oldestSubmittedAt || a.submittedAt < group.oldestSubmittedAt)) {
      group.oldestSubmittedAt = a.submittedAt
    }
  }

  return {
    courseId,
    courseTitle: attempts[0].courseTitle,
    quizzes: [...groups.values()].sort((a, b) => a.quizTitle.localeCompare(b.quizTitle)),
  }
}

/** Level 3: pending attempts (learners) for one quiz. */
export async function getQuizGradingAttempts(quizId: string): Promise<{
  quizId: string
  quizTitle: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  attempts: PendingAttemptSummary[]
} | null> {
  const attempts = (await listPendingAttempts()).filter((a) => a.quizId === quizId)
  if (attempts.length === 0) return null

  return {
    quizId,
    quizTitle: attempts[0].quizTitle,
    lessonTitle: attempts[0].lessonTitle,
    courseId: attempts[0].courseId,
    courseTitle: attempts[0].courseTitle,
    attempts: attempts.sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")),
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
