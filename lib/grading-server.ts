import { createClient } from "@/lib/supabase/server"
import { getAdminProfile } from "@/lib/auth/require-admin"
import { escapeForOrFilter, paginated, rangeFor, type ListParams, type Paginated } from "@/lib/pagination"
import { pickRepresentativeAttempt } from "@/lib/quiz-attempt-selection"
import { computeCourseGrade, quizGradeWeight, type CourseGrade } from "@/lib/course-grade"

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
 * True when a quiz_responses.response value represents actual submitted
 * content, as opposed to SQL/JSON null or an empty string left by
 * grade_attempt() for a question the learner skipped.
 */
export function hasResponseContent(response: unknown): boolean {
  return typeof response === "string" && response.trim().length > 0
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
 * Level 1: courses with at least one submitted quiz attempt, graded or not.
 * (It was pending-review-only, which hid every auto-graded course from the
 * grading screens entirely -- see 20260807000000_grading_all_attempts.sql.)
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

/** Number of question prompts surfaced in a column's info popover. */
const COLUMN_PROMPT_PREVIEW = 5

export type GradingColumn = {
  quizId: string
  quizTitle: string
  lessonTitle: string
  sectionTitle: string
  passScore: number
  /** false for regular auto-graded quizzes -- read-only column, no click-to-grade, no eye. */
  isAssessment: boolean
  /** Derived from isAssessment, not stored -- see quizGradeWeight in lib/course-grade.ts. */
  weight: number
  /** Sliced to COLUMN_PROMPT_PREVIEW server-side -- AssignmentColumnHeader never renders more. */
  questionPrompts: string[]
  extraPromptCount: number
}

export type GradingCellStatus = "no_attempt" | "in_progress" | "pending_review" | "graded"

/**
 * One manually-graded question's grade on an attempt. Deliberately carries no
 * `response`/`prompt` body: those are multi-KB rich-text blobs and the grid
 * only ever renders the score input. The dialog loads them on demand via
 * getAttemptSubmission() -- see the note on getCourseGradingMatrix.
 */
export type GradingCellGrade = {
  questionId: string
  type: string
  points: number
  pointsAwarded: number | null
  /** False when quiz_responses.response is null/blank -- see getCourseGradingMatrix. */
  hasResponse: boolean
}

export type GradingCell = {
  attemptId: string | null
  status: GradingCellStatus
  score: number | null
  submittedAt: string | null
  grades: GradingCellGrade[]
}

export type GradingMatrixRow = {
  learnerId: string
  learnerName: string
  learnerEmail: string
  cells: Record<string, GradingCell>
  courseGrade: CourseGrade
}

export type CourseGradingMatrix = {
  courseId: string
  courseTitle: string
  columns: GradingColumn[]
  rows: Paginated<GradingMatrixRow>
}

type MatrixQuestionRow = {
  id: string
  type: string
  prompt: string
  points: number
  position: number
  options: { is_correct: boolean }[]
}

type MatrixQuizRow = {
  id: string
  title: string
  pass_score: number
  is_assessment: boolean
  lesson: { title: string; section: { title: string; course_id: string } | { title: string; course_id: string }[] | null } | null
  questions: MatrixQuestionRow[]
}

type MatrixAttemptRow = {
  id: string
  quiz_id: string
  learner_id: string
  attempt_number: number
  score: number | null
  status: GradingCellStatus
  submitted_at: string | null
  responses: { question_id: string; points_awarded: number | null; response: unknown }[]
}

function toOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const EMPTY_CELL: GradingCell = {
  attemptId: null,
  status: "no_attempt",
  score: null,
  submittedAt: null,
  grades: [],
}

/**
 * Whole-course grading matrix: rows are a *page* of the course's enrolled
 * learners, columns are every quiz in the course (assessment quizzes are
 * click-to-grade, regular quizzes are read-only).
 *
 * Three things keep the payload bounded, all of which the first cut of this
 * function got wrong and which together froze the browser:
 *  - learners are paginated (the columns axis is naturally small, the rows
 *    axis is not), and the attempts query is scoped to the page's learners,
 *    so it can no longer silently hit PostgREST's max-rows cap and then pick
 *    a "latest" attempt out of a truncated set;
 *  - answer bodies and question prompts are never selected here -- they are
 *    multi-KB rich text and were previously duplicated once per learner per
 *    column into the RSC payload. getAttemptSubmission() loads them for the
 *    one cell whose preview dialog is actually open;
 *  - only manually-graded questions become cells, decided by the shared
 *    isManuallyGraded() rather than an ad-hoc type check on the client.
 */
export async function getCourseGradingMatrix(
  courseId: string,
  p: ListParams
): Promise<CourseGradingMatrix | null> {
  const supabase = await createClient()
  const admin = await getAdminProfile()

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, created_by")
    .eq("id", courseId)
    .maybeSingle()

  if (courseError || !course) return null
  if (admin && admin.role !== "superadmin" && course.created_by !== admin.userId) return null

  // Learners are the paginated axis, so profiles is the *parent* table here
  // rather than enrollments: PostgREST can only order/filter the parent by
  // its own columns, and the roster is sorted and searched by name/email.
  // enrollments!inner narrows it to this course's roster (and RLS already
  // scopes enrollments to courses this admin owns).
  const [from, to] = rangeFor(p.page, p.pageSize)
  let learnerQuery = supabase
    .from("profiles")
    .select("id, full_name, email, enrollments!inner(course_id)", { count: "exact" })
    .eq("role", "learner")
    .eq("enrollments.course_id", courseId)
    .order("full_name", { ascending: p.dir !== "desc" })
    .range(from, to)

  const q = escapeForOrFilter(p.q)
  if (q) learnerQuery = learnerQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)

  const [{ data: quizzes, error: quizzesError }, { data: learners, count, error: learnersError }] = await Promise.all([
    supabase
      .from("quizzes")
      .select(
        `id, title, pass_score, is_assessment,
         lesson:lessons!inner(title, section:course_sections!inner(title, course_id)),
         questions(id, type, prompt, points, position, options:question_options(is_correct))`
      )
      .eq("lesson.section.course_id", courseId)
      .order("position", { referencedTable: "questions", ascending: true }),
    learnerQuery,
  ])

  const empty = { courseId, courseTitle: course.title, columns: [], rows: paginated<GradingMatrixRow>([], 0, p) }
  if (quizzesError || !quizzes) {
    console.error("getCourseGradingMatrix quizzes query failed:", quizzesError?.message)
    return empty
  }
  if (learnersError || !learners) {
    console.error("getCourseGradingMatrix learners query failed:", learnersError?.message)
    return empty
  }

  // Built once per quiz, not once per learner-cell: this map lookup sits
  // inside the rows x columns double loop below.
  const gradedQuestionsByQuiz = new Map<string, MatrixQuestionRow[]>()
  const columns: GradingColumn[] = (quizzes as unknown as MatrixQuizRow[]).map((quiz) => {
    const lesson = toOne(quiz.lesson)
    const section = lesson ? toOne(lesson.section as never) : null
    const questions = quiz.questions ?? []
    // Same predicate the SQL grader uses to decide what it leaves ungraded,
    // so the matrix can't drift from what actually needs a human score.
    gradedQuestionsByQuiz.set(
      quiz.id,
      questions.filter((qq) => isManuallyGraded(qq.type, qq.options ?? []))
    )

    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      lessonTitle: (lesson as { title?: string } | null)?.title ?? "",
      sectionTitle: (section as { title?: string } | null)?.title ?? "",
      passScore: quiz.pass_score,
      isAssessment: quiz.is_assessment,
      weight: quizGradeWeight(quiz.is_assessment),
      questionPrompts: questions.slice(0, COLUMN_PROMPT_PREVIEW).map((qq) => qq.prompt),
      extraPromptCount: Math.max(0, questions.length - COLUMN_PROMPT_PREVIEW),
    }
  })

  const quizIds = columns.map((c) => c.quizId)
  const learnerIds = learners.map((l) => l.id as string)

  const { data: attempts, error: attemptsError } =
    quizIds.length > 0 && learnerIds.length > 0
      ? await supabase
          .from("quiz_attempts")
          .select(
            `id, quiz_id, learner_id, attempt_number, score, status, submitted_at,
             responses:quiz_responses(question_id, points_awarded, response)`
          )
          .in("quiz_id", quizIds)
          .in("learner_id", learnerIds)
          .neq("status", "in_progress")
          .order("attempt_number", { ascending: true })
      : { data: [] as MatrixAttemptRow[], error: null }

  if (attemptsError) {
    console.error("getCourseGradingMatrix attempts query failed:", attemptsError.message)
  }

  // Ordered by attempt_number ascending. Study-case (assessment) quizzes show
  // the learner's latest submission for the admin to review; regular quizzes
  // remember the learner's best score instead, via the same rule used on the
  // learner side (lib/learn-server.ts) so the two views can't disagree.
  const isAssessmentByQuiz = new Map(columns.map((c) => [c.quizId, c.isAssessment]))
  const attemptsByKey = new Map<string, MatrixAttemptRow[]>()
  for (const attempt of (attempts ?? []) as unknown as MatrixAttemptRow[]) {
    const key = `${attempt.quiz_id}:${attempt.learner_id}`
    const bucket = attemptsByKey.get(key) ?? []
    bucket.push(attempt)
    attemptsByKey.set(key, bucket)
  }
  const bestByKey = new Map<string, MatrixAttemptRow>()
  for (const [key, quizAttempts] of attemptsByKey) {
    const isAssessment = isAssessmentByQuiz.get(quizAttempts[0].quiz_id) ?? false
    const representative = pickRepresentativeAttempt(quizAttempts, isAssessment)
    if (representative) bestByKey.set(key, representative)
  }

  const rows: GradingMatrixRow[] = learners.map((learner) => {
    const learnerId = learner.id as string
    const learnerEmail = (learner.email as string | null) ?? ""
    const learnerName = (learner.full_name as string | null) || learnerEmail || "Unnamed learner"

    const cells: Record<string, GradingCell> = {}
    for (const column of columns) {
      const attempt = bestByKey.get(`${column.quizId}:${learnerId}`)
      if (!attempt) {
        cells[column.quizId] = EMPTY_CELL
        continue
      }

      const responseByQuestion = new Map(attempt.responses.map((r) => [r.question_id, r]))
      cells[column.quizId] = {
        attemptId: attempt.id,
        status: attempt.status,
        score: attempt.score,
        submittedAt: attempt.submitted_at,
        grades: (gradedQuestionsByQuiz.get(column.quizId) ?? [])
          .filter((question) => responseByQuestion.has(question.id))
          .map((question) => {
            const response = responseByQuestion.get(question.id)
            return {
              questionId: question.id,
              type: question.type,
              points: question.points,
              pointsAwarded: response?.points_awarded ?? null,
              hasResponse: hasResponseContent(response?.response),
            }
          }),
      }
    }

    const courseGrade = computeCourseGrade(
      columns.map((column) => {
        const cell = cells[column.quizId]
        return {
          score: cell.score,
          weight: column.weight,
          pending: cell.status === "pending_review",
        }
      })
    )

    return { learnerId, learnerName, learnerEmail, cells, courseGrade }
  })

  return { courseId, courseTitle: course.title, columns, rows: paginated(rows, count ?? 0, p) }
}

export type AttemptSubmissionResponse = {
  questionId: string
  type: string
  prompt: string
  response: string
}

/**
 * The full answer bodies for one attempt, loaded when a preview dialog opens
 * rather than shipped with every cell of the matrix. RLS on quiz_responses
 * already scopes this to attempts on courses the caller owns.
 */
export async function getAttemptSubmission(attemptId: string): Promise<AttemptSubmissionResponse[] | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("quiz_responses")
    .select("question_id, response, question:questions(type, prompt, position)")
    .eq("attempt_id", attemptId)

  if (error || !data) {
    console.error("getAttemptSubmission failed:", error?.message)
    return null
  }

  const ordered = data
    .map((row) => {
      const question = toOne(row.question as never) as { type: string; prompt: string; position: number } | null
      return {
        position: question?.position ?? 0,
        response: {
          questionId: row.question_id as string,
          type: question?.type ?? "",
          prompt: question?.prompt ?? "",
          response: typeof row.response === "string" ? row.response : "",
        },
      }
    })
    .sort((a, b) => a.position - b.position)

  return ordered.map((entry) => entry.response)
}

