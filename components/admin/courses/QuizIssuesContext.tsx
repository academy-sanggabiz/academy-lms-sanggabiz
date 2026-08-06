"use client"

import { createContext, useContext, useMemo } from "react"

import type { QuizIssue } from "@/lib/course-draft"

/**
 * Validation issues from the last blocked Save (see validateQuizzes in
 * lib/course-draft.ts), read by LessonCard (to badge a collapsed lesson) and
 * QuestionCard (to highlight the offending question).
 *
 * A context rather than a prop threaded CourseFormShell -> LessonsTab ->
 * SectionCard -> LessonCard -> QuizEditor -> QuestionCard: SectionCard and
 * LessonCard are memo()'d, and adding a prop that changes only on a failed
 * save would widen their memo comparison for every render.
 */
const QuizIssuesContext = createContext<{
  byLesson: Map<string, QuizIssue[]>
  byQuestion: Map<string, QuizIssue>
}>({ byLesson: new Map(), byQuestion: new Map() })

export function QuizIssuesProvider({
  issues,
  children,
}: {
  issues: QuizIssue[]
  children: React.ReactNode
}) {
  const value = useMemo(() => {
    const byLesson = new Map<string, QuizIssue[]>()
    const byQuestion = new Map<string, QuizIssue>()
    for (const issue of issues) {
      byLesson.set(issue.lessonId, [...(byLesson.get(issue.lessonId) ?? []), issue])
      // First issue wins -- validateQuizzes emits at most one per question anyway.
      if (!byQuestion.has(issue.questionId)) byQuestion.set(issue.questionId, issue)
    }
    return { byLesson, byQuestion }
  }, [issues])

  return <QuizIssuesContext.Provider value={value}>{children}</QuizIssuesContext.Provider>
}

// Shared instance, not a fresh `[]` per call: LessonCard compares this array
// by identity to detect a new validation failure during render.
const NO_ISSUES: QuizIssue[] = []

export function useLessonQuizIssues(lessonId: string): QuizIssue[] {
  return useContext(QuizIssuesContext).byLesson.get(lessonId) ?? NO_ISSUES
}

export function useQuestionQuizIssue(questionId: string): QuizIssue | null {
  return useContext(QuizIssuesContext).byQuestion.get(questionId) ?? null
}
