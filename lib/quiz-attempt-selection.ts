/**
 * Picks which of a learner's attempts on a single quiz is "the" attempt to
 * show/grade. Study-case (is_assessment) quizzes are graded manually and
 * always show the latest submission for the admin to review. Regular quizzes
 * remember the learner's best score: the highest-scoring graded attempt, so a
 * worse retry doesn't overwrite a prior pass. Falls back to the latest attempt
 * when no attempt has been graded yet, so an in-progress/pending cell still
 * has something to render.
 */
export function pickRepresentativeAttempt<
  T extends { attempt_number: number; score: number | null; status: string },
>(attemptsAscending: T[], isAssessment: boolean): T | undefined {
  if (attemptsAscending.length === 0) return undefined
  if (isAssessment) return attemptsAscending[attemptsAscending.length - 1]

  let best: T | undefined
  for (const attempt of attemptsAscending) {
    if (attempt.status !== "graded" || attempt.score === null) continue
    if (!best || attempt.score > (best.score as number)) best = attempt
  }
  return best ?? attemptsAscending[attemptsAscending.length - 1]
}
