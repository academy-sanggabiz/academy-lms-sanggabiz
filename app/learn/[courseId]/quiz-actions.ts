"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type QuizAnswer = {
  questionId: string
  response: string
}

export type SubmitQuizResult = {
  score: number
  passed: boolean
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
    .select("max_attempts")
    .eq("id", quizId)
    .single()

  if (quizError || !quiz) return { error: "Quiz not found." }

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

export async function submitQuiz(
  attemptId: string,
  courseId: string,
  lessonId: string,
  answers: QuizAnswer[]
): Promise<SubmitQuizResult | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: "Not signed in." }

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, learner_id")
    .eq("id", attemptId)
    .eq("learner_id", userId)
    .single()

  if (attemptError || !attempt) return { error: "Attempt not found." }

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("pass_score")
    .eq("id", attempt.quiz_id)
    .single()

  if (quizError || !quiz) return { error: "Quiz not found." }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, type, points, options:question_options(id, is_correct)")
    .eq("quiz_id", attempt.quiz_id)

  if (questionsError || !questions) return { error: "Could not load questions." }

  let awardedPoints = 0
  let totalGradablePoints = 0
  let correctCount = 0
  const perQuestion: Record<string, boolean | null> = {}
  const responseRows: {
    attempt_id: string
    question_id: string
    response: unknown
    is_correct: boolean | null
    points_awarded: number | null
  }[] = []

  for (const question of questions) {
    const answer = answers.find((a) => a.questionId === question.id)

    if (question.type === "multiple_choice") {
      totalGradablePoints += question.points
      const isCorrect =
        !!answer && question.options.some((o) => o.id === answer.response && o.is_correct)
      if (isCorrect) {
        awardedPoints += question.points
        correctCount += 1
      }
      perQuestion[question.id] = isCorrect
      responseRows.push({
        attempt_id: attemptId,
        question_id: question.id,
        response: answer?.response ?? null,
        is_correct: isCorrect,
        points_awarded: isCorrect ? question.points : 0,
      })
    } else {
      perQuestion[question.id] = null
      responseRows.push({
        attempt_id: attemptId,
        question_id: question.id,
        response: answer?.response ?? null,
        is_correct: null,
        points_awarded: null,
      })
    }
  }

  const { error: responsesError } = await supabase.from("quiz_responses").insert(responseRows)
  if (responsesError) return { error: responsesError.message }

  const score = totalGradablePoints > 0 ? Math.round((awardedPoints / totalGradablePoints) * 100) : 100
  const passed = score >= quiz.pass_score

  const { error: updateError } = await supabase
    .from("quiz_attempts")
    .update({ submitted_at: new Date().toISOString(), score, passed })
    .eq("id", attemptId)

  if (updateError) return { error: updateError.message }

  if (passed) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("learner_id", userId)
      .eq("course_id", courseId)
      .maybeSingle()

    if (enrollment) {
      await supabase.from("lesson_progress").upsert(
        {
          enrollment_id: enrollment.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "enrollment_id,lesson_id" }
      )
    }
  }

  revalidatePath("/learn/[courseId]", "page")

  return { score, passed, correctCount, total: questions.length, perQuestion }
}
