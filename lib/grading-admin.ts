import { createClient } from "@/lib/supabase/server"

export type EssayGrade = { questionId: string; points: number }

/**
 * Writes manual points for a set of essay responses on an attempt, then
 * recomputes the attempt's overall score via finalizeAttempt. Shared by both
 * the in-LMS grading form and the CSV re-import path, so scoring only lives
 * in one place.
 */
export async function gradeAttempt(
  attemptId: string,
  graderId: string,
  grades: EssayGrade[]
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, points")
    .in(
      "id",
      grades.map((g) => g.questionId)
    )

  if (questionsError || !questions) return { error: questionsError?.message ?? "Questions not found" }

  const pointsByQuestion = new Map(questions.map((q) => [q.id, q.points]))

  for (const grade of grades) {
    const maxPoints = pointsByQuestion.get(grade.questionId)
    if (maxPoints === undefined) return { error: "Unknown question in grade payload" }
    if (!Number.isFinite(grade.points) || grade.points < 0 || grade.points > maxPoints) {
      return { error: `Points must be between 0 and ${maxPoints}` }
    }
  }

  const gradedAt = new Date().toISOString()
  const results = await Promise.all(
    grades.map((grade) =>
      supabase
        .from("quiz_responses")
        .update({
          points_awarded: grade.points,
          is_correct: grade.points > 0,
          graded_by: graderId,
          graded_at: gradedAt,
        })
        .eq("attempt_id", attemptId)
        .eq("question_id", grade.questionId)
    )
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return { error: failed.error.message }

  return finalizeAttempt(attemptId)
}

/**
 * Recomputes score/passed from every quiz_responses row (auto + manually
 * graded), marks the attempt 'graded', and — on pass — completes the lesson,
 * mirroring the auto-grade completion write in submitQuiz.
 */
async function finalizeAttempt(attemptId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, learner_id, quiz:quizzes(pass_score, lesson_id)")
    .eq("id", attemptId)
    .single()

  if (attemptError || !attempt) return { error: attemptError?.message ?? "Attempt not found" }
  const quiz = Array.isArray(attempt.quiz) ? attempt.quiz[0] : attempt.quiz
  if (!quiz) return { error: "Quiz not found" }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, points")
    .eq("quiz_id", attempt.quiz_id)

  if (questionsError || !questions) return { error: questionsError?.message ?? "Could not load questions" }

  const { data: responses, error: responsesError } = await supabase
    .from("quiz_responses")
    .select("question_id, is_correct, points_awarded")
    .eq("attempt_id", attemptId)

  if (responsesError || !responses) return { error: responsesError?.message ?? "Could not load responses" }

  const stillUngraded = responses.some((r) => r.is_correct === null)
  if (stillUngraded) return { error: "Attempt still has ungraded responses" }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const awardedPoints = responses.reduce((sum, r) => sum + (r.points_awarded ?? 0), 0)
  const score = totalPoints > 0 ? Math.round((awardedPoints / totalPoints) * 100) : 100
  const passed = score >= quiz.pass_score

  const { error: updateError } = await supabase
    .from("quiz_attempts")
    .update({ score, passed, status: "graded" })
    .eq("id", attemptId)

  if (updateError) return { error: updateError.message }

  // Runs on every re-grade, not just a pass, so a re-import that moves an
  // attempt from pass to fail (a corrected/lower score) un-completes the
  // lesson instead of leaving stale progress from the earlier grade.
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("section:course_sections(course_id)")
    .eq("id", quiz.lesson_id)
    .single()

  const section = lesson ? (Array.isArray(lesson.section) ? lesson.section[0] : lesson.section) : null
  const courseId = section?.course_id

  if (!lessonError && courseId) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("learner_id", attempt.learner_id)
      .eq("course_id", courseId)
      .maybeSingle()

    if (enrollment) {
      await supabase.from("lesson_progress").upsert(
        {
          enrollment_id: enrollment.id,
          lesson_id: quiz.lesson_id,
          completed: passed,
          completed_at: passed ? new Date().toISOString() : null,
        },
        { onConflict: "enrollment_id,lesson_id" }
      )
    }
  }

  return { ok: true }
}
