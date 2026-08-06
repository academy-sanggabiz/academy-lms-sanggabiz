/**
 * Final course grade: a weighted average across every assessment in a
 * course. Every assessment is worth 100 points regardless of question count
 * (quiz_attempts.score is already that 0-100 percentage), so the only extra
 * input is each assessment's relative weight. An assessment with no attempt
 * yet contributes 0 earned against its full 100 * weight -- this is what lets
 * the grade start low and climb as work is submitted, without needing to
 * rebalance anything when a new assessment is added. A pending_review attempt
 * contributes its provisional objective-only score (see grade_attempt()).
 */

/**
 * A study-case assessment pulls this many times a regular quiz's weight in the
 * final course grade. Derived from quizzes.is_assessment, never authored --
 * weight used to be a per-quiz number input in the course editor, which made
 * every admin guess a value on every quiz. This constant is the only place to
 * change the ratio.
 */
export const ASSESSMENT_GRADE_WEIGHT = 3

export function quizGradeWeight(isAssessment: boolean): number {
  return isAssessment ? ASSESSMENT_GRADE_WEIGHT : 1
}

export type GradeItem = {
  score: number | null
  weight: number
  pending: boolean
}

export type CourseGrade = {
  grade: number
  earned: number
  available: number
  pendingCount: number
}

export function computeCourseGrade(items: GradeItem[]): CourseGrade {
  let earned = 0
  let available = 0
  let pendingCount = 0

  for (const item of items) {
    available += 100 * item.weight
    if (item.pending) pendingCount += 1
    if (item.score !== null) earned += item.score * item.weight
  }

  const grade = available > 0 ? Math.round((earned / available) * 100) : 0

  return { grade, earned, available, pendingCount }
}
