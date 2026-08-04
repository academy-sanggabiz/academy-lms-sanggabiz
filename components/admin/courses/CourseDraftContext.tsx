"use client"

import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from "react"

import type { AuthorableQuestionType } from "@/lib/courses-admin"
import {
  draftFromDetail,
  newId,
  serializeDraft,
  type CourseDraft,
  type DraftLesson,
  type DraftOption,
  type DraftQuestion,
  type DraftQuiz,
  type DraftResource,
} from "@/lib/course-draft"
import type { AdminCourseDetail } from "@/lib/courses-admin"

type State = { baseline: CourseDraft; draft: CourseDraft }

export type CourseDraftAction =
  | { type: "setField"; patch: Partial<CourseDraft> }
  | { type: "addSection"; id: string }
  | { type: "renameSection"; id: string; title: string }
  | { type: "deleteSection"; id: string }
  | { type: "addLesson"; id: string; sectionId: string }
  | { type: "patchLesson"; id: string; patch: Partial<DraftLesson> }
  | { type: "duplicateLesson"; id: string }
  | { type: "deleteLesson"; id: string }
  | { type: "moveLesson"; lessonId: string; toSectionId: string; overLessonId: string | null }
  | { type: "addResource"; lessonId: string; resource: { title: string; file_url: string; type: string | null } }
  | { type: "patchResource"; id: string; patch: Partial<DraftResource> }
  | { type: "deleteResource"; id: string }
  | { type: "patchQuiz"; lessonId: string; patch: Partial<Omit<DraftQuiz, "id" | "questions">> }
  | { type: "addQuestion"; lessonId: string; questionType: AuthorableQuestionType }
  | { type: "patchQuestion"; id: string; patch: Partial<DraftQuestion> }
  | { type: "deleteQuestion"; id: string }
  | { type: "addOption"; questionId: string; option?: Partial<Omit<DraftOption, "id">> }
  | { type: "patchOption"; id: string; patch: Partial<DraftOption> }
  | { type: "setCorrectOption"; questionId: string; optionId: string }
  | { type: "deleteOption"; id: string }
  | { type: "replaceDraft"; draft: CourseDraft }
  | { type: "commitSaved"; saved: CourseDraft }

// -- tree-walk helpers ------------------------------------------------------
// Every id in the draft is globally unique (client-generated uuids), so
// "map every lesson/question and transform the one whose id matches" is
// simpler and just as correct as threading section/lesson indices through
// every action.

function mapLessons(
  draft: CourseDraft,
  fn: (lesson: DraftLesson) => DraftLesson
): CourseDraft {
  return { ...draft, sections: draft.sections.map((s) => ({ ...s, lessons: s.lessons.map(fn) })) }
}

function mapQuizzes(draft: CourseDraft, fn: (quiz: DraftQuiz, lesson: DraftLesson) => DraftQuiz): CourseDraft {
  return mapLessons(draft, (lesson) => (lesson.quiz ? { ...lesson, quiz: fn(lesson.quiz, lesson) } : lesson))
}

function mapQuestions(draft: CourseDraft, fn: (q: DraftQuestion) => DraftQuestion): CourseDraft {
  return mapQuizzes(draft, (quiz) => ({ ...quiz, questions: quiz.questions.map(fn) }))
}

function reducer(state: State, action: CourseDraftAction): State {
  const { draft } = state

  switch (action.type) {
    case "setField":
      return { ...state, draft: { ...draft, ...action.patch } }

    case "addSection": {
      const section = { id: action.id, title: `Module ${draft.sections.length + 1}`, lessons: [] }
      return { ...state, draft: { ...draft, sections: [...draft.sections, section] } }
    }

    case "renameSection":
      return {
        ...state,
        draft: {
          ...draft,
          sections: draft.sections.map((s) => (s.id === action.id ? { ...s, title: action.title } : s)),
        },
      }

    case "deleteSection":
      return { ...state, draft: { ...draft, sections: draft.sections.filter((s) => s.id !== action.id) } }

    case "addLesson": {
      const lesson: DraftLesson = {
        id: action.id,
        title: "Untitled Lesson",
        content_type: "video",
        video_url: null,
        content: null,
        duration_seconds: null,
        resources: [],
        quiz: null,
      }
      return {
        ...state,
        draft: {
          ...draft,
          sections: draft.sections.map((s) =>
            s.id === action.sectionId ? { ...s, lessons: [...s.lessons, lesson] } : s
          ),
        },
      }
    }

    case "patchLesson":
      return {
        ...state,
        draft: mapLessons(draft, (l) => (l.id === action.id ? { ...l, ...action.patch } : l)),
      }

    case "duplicateLesson": {
      let inserted = false
      const sections = draft.sections.map((s) => {
        const idx = s.lessons.findIndex((l) => l.id === action.id)
        if (idx === -1) return s
        inserted = true
        const source = s.lessons[idx]
        const copy: DraftLesson = {
          ...source,
          id: newId(),
          title: `${source.title} (copy)`,
          resources: source.resources.map((r) => ({ ...r, id: newId() })),
          quiz: source.quiz
            ? {
                ...source.quiz,
                id: newId(),
                questions: source.quiz.questions.map((q) => ({
                  ...q,
                  id: newId(),
                  options: q.options.map((o) => ({ ...o, id: newId() })),
                })),
              }
            : null,
        }
        const lessons = [...s.lessons]
        lessons.splice(idx + 1, 0, copy)
        return { ...s, lessons }
      })
      if (!inserted) return state
      return { ...state, draft: { ...draft, sections } }
    }

    case "deleteLesson":
      return {
        ...state,
        draft: {
          ...draft,
          sections: draft.sections.map((s) => ({
            ...s,
            lessons: s.lessons.filter((l) => l.id !== action.id),
          })),
        },
      }

    case "moveLesson": {
      // Remove first, THEN locate overLessonId in the post-removal target
      // list -- matches the pre-refactor component logic exactly (dragging
      // within the same section shifts indices once the dragged item is
      // spliced out).
      let moved: DraftLesson | null = null
      const withoutLesson = draft.sections.map((s) => {
        const idx = s.lessons.findIndex((l) => l.id === action.lessonId)
        if (idx === -1) return s
        moved = s.lessons[idx]
        return { ...s, lessons: s.lessons.filter((l) => l.id !== action.lessonId) }
      })
      if (!moved) return state
      const movedLesson = moved as DraftLesson
      const sections = withoutLesson.map((s) => {
        if (s.id !== action.toSectionId) return s
        const lessons = [...s.lessons]
        const overIndex = action.overLessonId ? lessons.findIndex((l) => l.id === action.overLessonId) : -1
        const toIndex = overIndex >= 0 ? overIndex : lessons.length
        lessons.splice(toIndex, 0, movedLesson)
        return { ...s, lessons }
      })
      return { ...state, draft: { ...draft, sections } }
    }

    case "addResource": {
      const resource: DraftResource = { id: newId(), ...action.resource }
      return {
        ...state,
        draft: mapLessons(draft, (l) =>
          l.id === action.lessonId ? { ...l, resources: [...l.resources, resource] } : l
        ),
      }
    }

    case "patchResource":
      return {
        ...state,
        draft: mapLessons(draft, (l) => ({
          ...l,
          resources: l.resources.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
        })),
      }

    case "deleteResource":
      return {
        ...state,
        draft: mapLessons(draft, (l) => ({
          ...l,
          resources: l.resources.filter((r) => r.id !== action.id),
        })),
      }

    case "patchQuiz":
      return {
        ...state,
        draft: mapLessons(draft, (l) =>
          l.id === action.lessonId && l.quiz ? { ...l, quiz: { ...l.quiz, ...action.patch } } : l
        ),
      }

    case "addQuestion": {
      const question: DraftQuestion = {
        id: newId(),
        type: action.questionType,
        prompt: "",
        points: 1,
        allow_multiple: false,
        case_sensitive: false,
        options:
          action.questionType === "true_false"
            ? [
                { id: newId(), text: "True", is_correct: true },
                { id: newId(), text: "False", is_correct: false },
              ]
            : [],
      }
      return {
        ...state,
        draft: mapLessons(draft, (l) => {
          if (l.id !== action.lessonId) return l
          const quiz: DraftQuiz = l.quiz ?? {
            id: newId(),
            pass_score: 70,
            max_attempts: null,
            shuffle: false,
            is_assessment: false,
            questions: [],
          }
          return { ...l, quiz: { ...quiz, questions: [...quiz.questions, question] } }
        }),
      }
    }

    case "patchQuestion":
      return {
        ...state,
        draft: mapQuestions(draft, (q) => (q.id === action.id ? { ...q, ...action.patch } : q)),
      }

    case "deleteQuestion":
      return {
        ...state,
        draft: mapQuizzes(draft, (quiz) => ({
          ...quiz,
          questions: quiz.questions.filter((q) => q.id !== action.id),
        })),
      }

    case "addOption":
      return {
        ...state,
        draft: mapQuestions(draft, (q) =>
          q.id === action.questionId
            ? {
                ...q,
                options: [
                  ...q.options,
                  { id: newId(), text: "", is_correct: false, ...action.option },
                ],
              }
            : q
        ),
      }

    case "patchOption":
      return {
        ...state,
        draft: mapQuestions(draft, (q) => ({
          ...q,
          options: q.options.map((o) => (o.id === action.id ? { ...o, ...action.patch } : o)),
        })),
      }

    case "setCorrectOption":
      return {
        ...state,
        draft: mapQuestions(draft, (q) =>
          q.id === action.questionId
            ? { ...q, options: q.options.map((o) => ({ ...o, is_correct: o.id === action.optionId })) }
            : q
        ),
      }

    case "deleteOption":
      return {
        ...state,
        draft: mapQuestions(draft, (q) => ({
          ...q,
          options: q.options.filter((o) => o.id !== action.id),
        })),
      }

    case "replaceDraft":
      return { ...state, draft: action.draft }

    case "commitSaved":
      return { baseline: action.saved, draft: action.saved }

    default:
      return state
  }
}

type CourseDraftContextValue = {
  draft: CourseDraft
  baseline: CourseDraft
  dispatch: Dispatch<CourseDraftAction>
  isDirty: boolean
  courseId: string
}

const CourseDraftContext = createContext<CourseDraftContextValue | null>(null)

function init({ course, isNew }: { course: AdminCourseDetail; isNew: boolean }): State {
  const mapped = draftFromDetail(course)
  // Matches the old RHF defaultValues: a brand-new "Untitled Course" draft
  // starts with an empty title field rather than the placeholder text.
  const draft = isNew ? { ...mapped, title: "" } : mapped
  return { baseline: draft, draft }
}

export function CourseDraftProvider({
  course,
  isNew = false,
  children,
}: {
  course: AdminCourseDetail
  isNew?: boolean
  children: ReactNode
}) {
  // Seeded once. Roster pagination and other same-route navigations re-render
  // this tree with new `course` props -- re-seeding here on prop change
  // would silently discard the draft, which is exactly what LessonsTab's old
  // `initialSections !== prevInitialSections` sync used to do. Don't add one.
  const [state, dispatch] = useReducer(reducer, { course, isNew }, init)

  const isDirty = useMemo(
    () => serializeDraft(state.draft) !== serializeDraft(state.baseline),
    [state.draft, state.baseline]
  )

  const value = useMemo<CourseDraftContextValue>(
    () => ({ draft: state.draft, baseline: state.baseline, dispatch, isDirty, courseId: course.id }),
    [state.draft, state.baseline, isDirty, course.id]
  )

  return <CourseDraftContext.Provider value={value}>{children}</CourseDraftContext.Provider>
}

export function useCourseDraft(): CourseDraftContextValue {
  const ctx = useContext(CourseDraftContext)
  if (!ctx) throw new Error("useCourseDraft must be used within a CourseDraftProvider")
  return ctx
}
