import { createClient } from "@/lib/supabase/server"
import { getCourseDetail } from "@/lib/courses-server"
import type { CourseDetail } from "@/lib/courses"
import { pickRepresentativeAttempt } from "@/lib/quiz-attempt-selection"

export type QuizAttemptInfo = {
  attemptsUsed: number
  lastScore: number | null
  lastPassed: boolean | null
  pendingReview: boolean
  // Assessment mode only: the learner's current in_progress attempt (if any)
  // and its saved draft answers, so EssayAssessmentPlayer can resume a study
  // case worked on across multiple sessions. Null when there's no open draft.
  inProgressAttemptId: string | null
  draftAnswers: Record<string, string> | null
}

type LearnData = {
  course: CourseDetail | null
  enrollmentId: string | null
  completedLessonIds: Set<string>
  quizAttempts: Map<string, QuizAttemptInfo>
}

export async function getLearnData(courseId: string): Promise<LearnData> {
  const supabase = await createClient()
  const course = await getCourseDetail(courseId)

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    return { course, enrollmentId: null, completedLessonIds: new Set(), quizAttempts: new Map() }
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("learner_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (enrollmentError) {
    console.error("getLearnData enrollment lookup failed:", enrollmentError.message)
    return { course, enrollmentId: null, completedLessonIds: new Set(), quizAttempts: new Map() }
  }

  if (!enrollment) {
    return { course, enrollmentId: null, completedLessonIds: new Set(), quizAttempts: new Map() }
  }

  const { data: progress, error: progressError } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("enrollment_id", enrollment.id)
    .eq("completed", true)

  if (progressError) {
    console.error("getLearnData progress lookup failed:", progressError.message)
  }

  const completedLessonIds = new Set((progress ?? []).map((row) => row.lesson_id))

  const quizzes = course?.sections.flatMap((s) => s.lessons.flatMap((l) => (l.quiz ? [l.quiz] : []))) ?? []
  const quizIds = quizzes.map((q) => q.id)
  const isAssessmentByQuiz = new Map(quizzes.map((q) => [q.id, q.is_assessment]))

  const quizAttempts = new Map<string, QuizAttemptInfo>()
  if (quizIds.length > 0) {
    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, attempt_number, score, passed, status, draft_answers")
      .eq("learner_id", userId)
      .in("quiz_id", quizIds)
      .order("attempt_number", { ascending: true })

    if (attemptsError) {
      console.error("getLearnData quiz attempts lookup failed:", attemptsError.message)
    } else {
      const byQuiz = new Map<string, NonNullable<typeof attempts>>()
      for (const attempt of attempts ?? []) {
        const bucket = byQuiz.get(attempt.quiz_id) ?? []
        bucket.push(attempt)
        byQuiz.set(attempt.quiz_id, bucket)
      }

      for (const [quizId, quizAttemptsAscending] of byQuiz) {
        const isAssessment = isAssessmentByQuiz.get(quizId) ?? false
        const latest = quizAttemptsAscending[quizAttemptsAscending.length - 1]
        const representative = pickRepresentativeAttempt(quizAttemptsAscending, isAssessment)
        const inProgress = latest.status === "in_progress"

        quizAttempts.set(quizId, {
          attemptsUsed: Math.max(...quizAttemptsAscending.map((a) => a.attempt_number)),
          lastScore: representative?.score ?? null,
          lastPassed: representative?.passed ?? null,
          pendingReview: latest.status === "pending_review",
          inProgressAttemptId: inProgress ? latest.id : null,
          draftAnswers: inProgress ? (latest.draft_answers as Record<string, string> | null) : null,
        })
      }
    }
  }

  return { course, enrollmentId: enrollment.id, completedLessonIds, quizAttempts }
}
