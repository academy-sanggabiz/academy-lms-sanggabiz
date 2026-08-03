import { createClient } from "@/lib/supabase/server"

export type PendingAttemptSummary = {
  attemptId: string
  quizId: string
  quizTitle: string
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  learnerId: string
  learnerName: string
  learnerEmail: string
  submittedAt: string | null
  /** Responses still needing manual grading -- essays plus any keyless short_answer. */
  pendingCount: number
}

/** Every quiz_attempts row still awaiting manual grading, newest submission first. */
export async function listPendingAttempts(): Promise<PendingAttemptSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(
      `id, submitted_at,
       learner:profiles!quiz_attempts_learner_id_fkey(id, full_name, email),
       quiz:quizzes(
         id, title,
         lesson:lessons(
           id, title,
           section:course_sections(course:courses(id, title))
         )
       ),
       responses:quiz_responses(is_correct)`
    )
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: false })

  if (error || !data) return []

  return data.map((attempt) => {
    const quiz = Array.isArray(attempt.quiz) ? attempt.quiz[0] : attempt.quiz
    const lesson = quiz ? (Array.isArray(quiz.lesson) ? quiz.lesson[0] : quiz.lesson) : null
    const section = lesson ? (Array.isArray(lesson.section) ? lesson.section[0] : lesson.section) : null
    const course = section ? (Array.isArray(section.course) ? section.course[0] : section.course) : null
    const learner = Array.isArray(attempt.learner) ? attempt.learner[0] : attempt.learner

    return {
      attemptId: attempt.id,
      quizId: quiz?.id ?? "",
      quizTitle: quiz?.title ?? "Untitled quiz",
      lessonId: lesson?.id ?? "",
      lessonTitle: lesson?.title ?? "Untitled lesson",
      courseId: course?.id ?? "",
      courseTitle: course?.title ?? "Untitled course",
      learnerId: learner?.id ?? "",
      learnerName: learner?.full_name ?? "Unknown learner",
      learnerEmail: learner?.email ?? "",
      submittedAt: attempt.submitted_at,
      pendingCount: (attempt.responses ?? []).filter((r) => r.is_correct === null).length,
    }
  })
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
  quizTitle: string
  courseTitle: string
  lessonTitle: string
  learnerName: string
  learnerEmail: string
  submittedAt: string | null
  questions: GradingQuestion[]
}

/** Full detail for a single pending attempt, for the per-attempt grading form. */
export async function getAttemptGradingDetail(attemptId: string): Promise<AttemptGradingDetail | null> {
  const supabase = await createClient()

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select(
      `id, submitted_at, quiz_id,
       learner:profiles!quiz_attempts_learner_id_fkey(full_name, email),
       quiz:quizzes(
         title,
         lesson:lessons(
           title,
           section:course_sections(course:courses(title))
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
    quizTitle: quiz?.title ?? "Untitled quiz",
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
