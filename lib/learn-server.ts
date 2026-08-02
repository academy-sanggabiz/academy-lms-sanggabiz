import { createClient } from "@/lib/supabase/server"
import { getCourseDetail } from "@/lib/courses-server"
import type { CourseDetail } from "@/lib/courses"

export type QuizAttemptInfo = {
  attemptsUsed: number
  lastScore: number | null
  lastPassed: boolean | null
  pendingReview: boolean
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

  const quizIds =
    course?.sections.flatMap((s) => s.lessons.flatMap((l) => (l.quiz ? [l.quiz.id] : []))) ?? []

  const quizAttempts = new Map<string, QuizAttemptInfo>()
  if (quizIds.length > 0) {
    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("quiz_id, attempt_number, score, passed, status")
      .eq("learner_id", userId)
      .in("quiz_id", quizIds)
      .order("attempt_number", { ascending: true })

    if (attemptsError) {
      console.error("getLearnData quiz attempts lookup failed:", attemptsError.message)
    } else {
      for (const attempt of attempts ?? []) {
        const existing = quizAttempts.get(attempt.quiz_id)
        quizAttempts.set(attempt.quiz_id, {
          attemptsUsed: Math.max(existing?.attemptsUsed ?? 0, attempt.attempt_number),
          lastScore: attempt.score,
          lastPassed: attempt.passed,
          pendingReview: attempt.status === "pending_review",
        })
      }
    }
  }

  return { course, enrollmentId: enrollment.id, completedLessonIds, quizAttempts }
}
