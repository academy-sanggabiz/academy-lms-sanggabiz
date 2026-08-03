"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { checkAndIssueCertificate } from "@/lib/certificates"

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
 * Assessment (essay/study-case) mode has no "Start Quiz" gate -- the learner
 * just starts writing. This get-or-creates their open attempt: it reuses an
 * existing `in_progress` attempt (so repeated Save-draft/Submit calls don't
 * spawn duplicate empty attempts) and only inserts a fresh one when none is
 * open, enforcing the same enrollment + max_attempts rules as startQuiz.
 */
export async function startAssessmentAttempt(
  quizId: string
): Promise<{ attemptId: string; attemptNumber: number } | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: "Not signed in." }

  // Reuse an already-open attempt if there is one.
  const { data: open, error: openError } = await supabase
    .from("quiz_attempts")
    .select("id, attempt_number")
    .eq("quiz_id", quizId)
    .eq("learner_id", userId)
    .eq("status", "in_progress")
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openError) return { error: openError.message }
  if (open) return { attemptId: open.id, attemptNumber: open.attempt_number }

  // No open attempt -- create one (same checks as startQuiz).
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("max_attempts, lesson_id")
    .eq("id", quizId)
    .single()

  if (quizError || !quiz) return { error: "Quiz not found." }

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

  if (insertError || !attempt) return { error: insertError?.message ?? "Failed to start assessment." }

  return { attemptId: attempt.id, attemptNumber }
}

/**
 * Persists in-progress assessment answers to quiz_attempts.draft_answers so a
 * learner can leave and resume a study case across days. Not scored -- only the
 * answers passed to submitQuiz()/grade_attempt() at submit time are graded.
 * RLS ("own quiz attempts updatable") restricts the write to the learner's own
 * attempt, so the where-clause ownership check is defence-in-depth.
 */
export async function saveDraft(
  attemptId: string,
  answers: Record<string, string>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: "Not signed in." }

  const { error } = await supabase
    .from("quiz_attempts")
    .update({ draft_answers: answers })
    .eq("id", attemptId)
    .eq("learner_id", userId)
    .eq("status", "in_progress")

  if (error) return { error: error.message }

  return { ok: true }
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

  const result = data as SubmitQuizResult

  if (result.passed) {
    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("quiz:quizzes(lesson_id)")
      .eq("id", attemptId)
      .single()

    const quiz = attempt ? (Array.isArray(attempt.quiz) ? attempt.quiz[0] : attempt.quiz) : null
    const lessonId = quiz?.lesson_id

    if (lessonId) {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("section:course_sections(course_id)")
        .eq("id", lessonId)
        .single()

      const section = lesson ? (Array.isArray(lesson.section) ? lesson.section[0] : lesson.section) : null
      const courseId = section?.course_id

      if (courseId) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("learner_id", userId)
          .eq("course_id", courseId)
          .maybeSingle()

        if (enrollment) {
          await checkAndIssueCertificate(supabase, { enrollmentId: enrollment.id, courseId, learnerId: userId })
        }
      }
    }
  }

  revalidatePath("/learn/[courseId]", "page")

  return result
}
