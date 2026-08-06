import { createClient } from "@/lib/supabase/server"
import { computeCourseGrade, quizGradeWeight, type CourseGrade } from "@/lib/course-grade"
import { pickRepresentativeAttempt } from "@/lib/quiz-attempt-selection"

export async function getEnrolledCourseIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("learner_id", userId)

  if (error) {
    console.error("getEnrolledCourseIds failed:", error.message)
    return []
  }

  return data.map((row) => row.course_id)
}

export async function getCompletedCourseIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("learner_id", userId)
    .eq("status", "completed")

  if (error) {
    console.error("getCompletedCourseIds failed:", error.message)
    return []
  }

  return data.map((row) => row.course_id)
}

export type EnrolledCourseSummary = {
  id: string
  title: string
  lesson_count: number
  duration_hours: number
  status: "active" | "completed"
}

export async function getEnrolledCoursesWithDetails(): Promise<EnrolledCourseSummary[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("enrollments")
    .select("status, courses(id, title, lesson_count, duration_hours)")
    .eq("learner_id", userId)
    .order("enrolled_at", { ascending: false })

  if (error) {
    console.error("getEnrolledCoursesWithDetails failed:", error.message)
    return []
  }

  return data
    .map((row) => {
      const course = Array.isArray(row.courses) ? row.courses[0] : row.courses
      return course ? { ...course, status: row.status } : null
    })
    .filter((course): course is EnrolledCourseSummary => course !== null)
}

type LearnerGradeQuiz = { id: string; is_assessment: boolean }
type LearnerGradeAttempt = { quiz_id: string; attempt_number: number; score: number | null; status: string }

/**
 * The current learner's own weighted final course grade -- same
 * computeCourseGrade rollup the admin grading matrix shows, scoped to one
 * learner via RLS (quiz_attempts' "own quiz attempts readable" policy) rather
 * than the ownership check getCourseGradingMatrix does for admins.
 */
export async function getLearnerCourseGrade(courseId: string): Promise<CourseGrade | null> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return null

  const { data: quizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("id, is_assessment, lesson:lessons!inner(section:course_sections!inner(course_id))")
    .eq("lesson.section.course_id", courseId)

  if (quizzesError || !quizzes) {
    console.error("getLearnerCourseGrade quizzes query failed:", quizzesError?.message)
    return null
  }
  if (quizzes.length === 0) return null

  const quizIds = (quizzes as LearnerGradeQuiz[]).map((q) => q.id)
  const { data: attempts, error: attemptsError } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, attempt_number, score, status")
    .eq("learner_id", userId)
    .in("quiz_id", quizIds)
    .neq("status", "in_progress")
    .order("attempt_number", { ascending: true })

  if (attemptsError) {
    console.error("getLearnerCourseGrade attempts query failed:", attemptsError.message)
    return null
  }

  const attemptsByQuiz = new Map<string, LearnerGradeAttempt[]>()
  for (const attempt of (attempts ?? []) as LearnerGradeAttempt[]) {
    const bucket = attemptsByQuiz.get(attempt.quiz_id) ?? []
    bucket.push(attempt)
    attemptsByQuiz.set(attempt.quiz_id, bucket)
  }

  const items = (quizzes as LearnerGradeQuiz[]).map((quiz) => {
    const representative = pickRepresentativeAttempt(attemptsByQuiz.get(quiz.id) ?? [], quiz.is_assessment)
    return {
      score: representative?.score ?? null,
      weight: quizGradeWeight(quiz.is_assessment),
      pending: representative?.status === "pending_review",
    }
  })

  return computeCourseGrade(items)
}

export async function isEnrolled(courseId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return false

  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("learner_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (error) {
    console.error("isEnrolled failed:", error.message)
    return false
  }

  return data !== null
}

/**
 * Enrolled + "started" (any lesson_progress row completed) in one round trip,
 * for the course-detail sidebar's 3-state Enroll/Start/Continue button.
 */
export async function getEnrollmentProgress(
  courseId: string
): Promise<{ enrolled: boolean; started: boolean }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { enrolled: false, started: false }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("learner_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (enrollmentError) {
    console.error("getEnrollmentProgress enrollment lookup failed:", enrollmentError.message)
    return { enrolled: false, started: false }
  }
  if (!enrollment) return { enrolled: false, started: false }

  const { count, error: progressError } = await supabase
    .from("lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollment.id)
    .eq("completed", true)

  if (progressError) {
    console.error("getEnrollmentProgress progress lookup failed:", progressError.message)
    return { enrolled: true, started: false }
  }

  return { enrolled: true, started: (count ?? 0) > 0 }
}

/** Course ids the learner has completed at least one lesson in, for the catalog grid. */
export async function getStartedCourseIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("enrollment:enrollments!inner(course_id, learner_id)")
    .eq("completed", true)
    .eq("enrollment.learner_id", userId)

  if (error) {
    console.error("getStartedCourseIds failed:", error.message)
    return []
  }

  const courseIds = new Set<string>()
  for (const row of data) {
    const enrollment = Array.isArray(row.enrollment) ? row.enrollment[0] : row.enrollment
    if (enrollment?.course_id) courseIds.add(enrollment.course_id)
  }

  return [...courseIds]
}
