"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type SubmitQuizResult = {
  pending: boolean
  score: number | null
  passed: boolean | null
  correctCount: number
  total: number
  perQuestion: Record<string, boolean | null>
}

export async function startQuiz(
  quizId: string
): Promise<{ attemptId: string; attemptNumber: number } | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: "Not signed in." }

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("max_attempts, lesson_id")
    .eq("id", quizId)
    .single()

  if (quizError || !quiz) return { error: "Quiz not found." }

  // grade_attempt() (called from submitQuiz) also enforces enrollment before
  // it will score anything, but that check only runs at submit time -- an
  // unenrolled learner shouldn't even be able to open the attempt, so it's
  // checked here too.
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("section:course_sections(course_id)")
    .eq("id", quiz.lesson_id)
    .single()

  if (lessonError || !lesson) return { error: "Quiz not found." }
  const section = Array.isArray(lesson.section) ? lesson.section[0] : lesson.section
  const courseId = section?.course_id
  if (!courseId) return { error: "Quiz not found." }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("learner_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (enrollmentError) return { error: enrollmentError.message }
  if (!enrollment) return { error: "Not enrolled." }

  const { data: existing, error: existingError } = await supabase
    .from("quiz_attempts")
    .select("attempt_number")
    .eq("quiz_id", quizId)
    .eq("learner_id", userId)
    .order("attempt_number", { ascending: false })
    .limit(1)

  if (existingError) return { error: existingError.message }

  const attemptsUsed = existing?.[0]?.attempt_number ?? 0
  if (quiz.max_attempts !== null && attemptsUsed >= quiz.max_attempts) {
    return { error: "No attempts remaining." }
  }

  const attemptNumber = attemptsUsed + 1

  const { data: attempt, error: insertError } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      learner_id: userId,
      attempt_number: attemptNumber,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertError || !attempt) return { error: insertError?.message ?? "Failed to start quiz." }

  return { attemptId: attempt.id, attemptNumber }
}

/**
 * Scoring itself runs inside the public.grade_attempt() Postgres function
 * (SECURITY DEFINER) -- it's the only place question_options.is_correct is
 * ever read on a learner's behalf, and it re-derives the course/lesson from
 * the attempt's quiz server-side rather than trusting client-supplied ids.
 * See supabase/migrations/databaseSetup.sql.
 */
export async function submitQuiz(
  attemptId: string,
  answers: Record<string, string>
): Promise<SubmitQuizResult | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: "Not signed in." }

  const { data, error } = await supabase.rpc("grade_attempt", {
    p_attempt_id: attemptId,
    p_answers: answers,
  })

  if (error) return { error: error.message }

  revalidatePath("/learn/[courseId]", "page")

  return data as SubmitQuizResult
}
