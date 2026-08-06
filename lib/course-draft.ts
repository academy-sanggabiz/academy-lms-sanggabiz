import { z } from "zod"

import type { LessonContentType } from "@/lib/courses"
import type {
  AdminCourseDetail,
  AdminQuiz,
  AuthorableQuestionType,
  CourseCertificateSettings,
} from "@/lib/courses-admin"

/**
 * Client-authored draft of a course, held in CourseDraftContext and diffed
 * against a fresh server snapshot on Save (see saveCourseDraft in
 * lib/courses-admin.ts). Ordering is carried by array index -- `position` is
 * deliberately absent from every draft type, and the save layer assigns
 * position = index. This replaces the old nextPosition() read-then-insert
 * and makes reorder a pure array splice.
 */

export type DraftOption = {
  id: string
  text: string
  is_correct: boolean
}

// No `points`: points are derived from `type` (see QUESTION_TYPE_POINTS in
// lib/courses.ts) rather than authored -- the save layer assigns them.
export type DraftQuestion = {
  id: string
  type: AuthorableQuestionType
  prompt: string
  allow_multiple: boolean
  case_sensitive: boolean
  options: DraftOption[]
}

// No `title`: ensureQuiz copied the lesson's title at creation time and no UI
// ever edits it separately -- the save layer derives it from the lesson title.
export type DraftQuiz = {
  id: string
  pass_score: number
  max_attempts: number | null
  shuffle: boolean
  is_assessment: boolean
  // No `weight`: a quiz's weight in the final course grade is derived from
  // is_assessment (see quizGradeWeight in lib/course-grade.ts), not authored.
  questions: DraftQuestion[]
}

export type DraftResource = {
  id: string
  title: string
  file_url: string
  type: string | null
}

export type DraftLesson = {
  id: string
  title: string
  content_type: LessonContentType
  video_url: string | null
  content: string | null
  duration_seconds: number | null
  resources: DraftResource[]
  quiz: DraftQuiz | null
}

export type DraftSection = {
  id: string
  title: string
  lessons: DraftLesson[]
}

export type CourseDraft = {
  title: string
  description: string
  requirementsText: string
  audienceText: string
  thumbnail_url: string
  level: string
  // Derived from price, not a courses column: price > 0 => "paid".
  enrollmentMode: "free" | "paid"
  price: number
  isPrivate: boolean
  // Minimum weighted final course grade for certificate eligibility.
  passingGrade: number
  // A real courses column, previously written outside the form by
  // setRequirePrerequisites -- folded into the same batch save now.
  requirePrerequisites: boolean
  prerequisiteIds: string[]
  // null = no course_certificate_settings row yet.
  certificate: CourseCertificateSettings | null
  instructorId: string | null
  sections: DraftSection[]
}

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // crypto.randomUUID() is only defined in a secure context (e.g. not
  // http://192.168.x.x:3000 when testing over LAN) -- fall back rather than
  // crash the editor.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export function arrayToLines(items: string[]): string {
  return items.join("\n")
}

export function stripEmptyHtml(html: string): string | null {
  return html.replace(/<[^>]*>/g, "").trim() ? html : null
}

/**
 * The single mapper from server state to draft state. Field-by-field, not a
 * spread of DB rows, so key order (and therefore serializeDraft output) is
 * stable and no stray column (created_at, position, ...) leaks into the draft.
 */
/**
 * Counts lessons/questions present in `baseline` but missing from `draft` --
 * i.e. what a Save would actually delete from the database. Deleting used to
 * be one explicit click (with its own confirm dialog) per item; under the
 * draft model, many such deletes can land on a single Save, so the Save flow
 * shows this summary before writing (see CourseFormShell).
 */
export function countDestructiveChanges(
  draft: CourseDraft,
  baseline: CourseDraft
): { lessons: number; questions: number } {
  const draftLessonIds = new Set(draft.sections.flatMap((s) => s.lessons.map((l) => l.id)))
  const draftQuestionIds = new Set(
    draft.sections.flatMap((s) => s.lessons.flatMap((l) => l.quiz?.questions.map((q) => q.id) ?? []))
  )
  const baselineLessons = baseline.sections.flatMap((s) => s.lessons)
  const baselineQuestions = baselineLessons.flatMap((l) => l.quiz?.questions ?? [])

  return {
    lessons: baselineLessons.filter((l) => !draftLessonIds.has(l.id)).length,
    questions: baselineQuestions.filter((q) => !draftQuestionIds.has(q.id)).length,
  }
}

/**
 * A quiz question that can't be graded as authored. Deliberately NOT expressed
 * as a zod .superRefine on questionSchema: CourseFormShell flattens zod issues
 * to issue.path[0], so a sections[i].lessons[j].quiz.questions[k] path would
 * collapse to the key "sections" and render nowhere. A separate pass keeps the
 * message locatable (which lesson, which question number).
 */
export type QuizIssue = {
  lessonId: string
  questionId: string
  questionIndex: number
  lessonTitle: string
  message: string
}

function hasText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0
}

/**
 * Semantic validation of every quiz in a draft. The rules mirror what
 * public.grade_attempt() actually does: an MC/TF question with no is_correct
 * option is marked WRONG for every learner while still counting its points in
 * the denominator, so saving one is never intentional.
 *
 * A quiz is either a normal quiz (auto-graded only, always resolves to an
 * immediate score) or a study case (exactly one essay/file_upload question,
 * always manually graded) -- never a mix. That split is what lets
 * grade_attempt()'s pending_review path stay a pure legacy/backstop branch
 * for new content: short_answer with no accepted answers used to be the
 * documented route into manual grading inside a normal quiz (see
 * isManuallyGraded in lib/grading-server.ts) but is now an error here, and a
 * normal quiz can no longer contain essay/file_upload at all -- QuizEditor's
 * "Add Question" picker doesn't offer them; only "Add Study Case" does.
 *
 * Shared by CourseFormShell (blocks Save) and saveCourseDraft (backstop
 * against a stale client), so the two can't drift.
 */
export function validateQuizzes(draft: CourseDraft): QuizIssue[] {
  const issues: QuizIssue[] = []

  for (const section of draft.sections) {
    for (const lesson of section.lessons) {
      const lessonTitle = lesson.title.trim() || "Untitled lesson"
      const quiz = lesson.quiz
      if (!quiz) continue

      quiz.questions.forEach((question, index) => {
        const add = (message: string) =>
          issues.push({
            lessonId: lesson.id,
            questionId: question.id,
            questionIndex: index,
            lessonTitle,
            message,
          })

        if (!hasText(question.prompt)) {
          add("This question has no prompt.")
          return
        }

        const isEssay = question.type === "essay" || question.type === "file_upload"

        if (quiz.is_assessment) {
          if (index > 0) {
            add("A study case can only have one question.")
          } else if (!isEssay) {
            add("A study case must be an essay or file upload question.")
          }
          return
        }

        if (isEssay) {
          add("Essay questions belong in a study case, not a normal quiz.")
          return
        }

        const correct = question.options.filter((o) => o.is_correct)

        if (question.type === "multiple_choice") {
          if (question.options.length < 2) {
            add("Multiple choice needs at least two options.")
          } else if (question.options.some((o) => !o.text.trim())) {
            add("Every option needs text.")
          } else if (correct.length === 0) {
            add("No correct answer selected.")
          }
        } else if (question.type === "true_false" && correct.length === 0) {
          add("No correct answer selected.")
        } else if (question.type === "short_answer" && correct.length === 0) {
          add("Short answer needs at least one accepted answer.")
        }
      })
    }
  }

  return issues
}

/** First issue phrased for a toast, e.g. `Question 2 in "Intro" — No correct answer selected.` */
export function describeQuizIssue(issue: QuizIssue): string {
  return `Question ${issue.questionIndex + 1} in "${issue.lessonTitle}" — ${issue.message}`
}

export function draftFromDetail(course: AdminCourseDetail): CourseDraft {
  return {
    title: course.title,
    description: course.description ?? "",
    requirementsText: arrayToLines(course.requirements ?? []),
    audienceText: arrayToLines(course.who_for ?? []),
    thumbnail_url: course.thumbnail_url ?? "",
    level: course.level ?? "",
    enrollmentMode: course.price > 0 ? "paid" : "free",
    price: course.price ?? 0,
    isPrivate: course.is_private,
    passingGrade: course.passing_grade,
    requirePrerequisites: course.require_prerequisites,
    prerequisiteIds: course.prerequisites.map((p) => p.id),
    certificate: course.certificate_settings,
    instructorId: course.instructor?.id ?? null,
    sections: course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      lessons: section.lessons.map((lesson) => {
        // lib/courses.ts's client-safe Quiz/Question/QuestionOption types
        // omit is_correct (an RLS tradeoff for the public quiz-taking path),
        // but getCourseDetailForAdmin's rows have it at runtime -- same cast
        // LessonsTab.tsx uses to reach the admin-only shape.
        const quiz = lesson.quiz as AdminQuiz | null
        return {
          id: lesson.id,
          title: lesson.title,
          content_type: lesson.content_type,
          video_url: lesson.video_url,
          content: lesson.content,
          duration_seconds: lesson.duration_seconds,
          resources: lesson.resources.map((r) => ({
            id: r.id,
            title: r.title,
            file_url: r.file_url,
            type: r.type,
          })),
          quiz: quiz
            ? {
                id: quiz.id,
                pass_score: quiz.pass_score,
                max_attempts: quiz.max_attempts,
                shuffle: quiz.shuffle,
                is_assessment: quiz.is_assessment,
                questions: quiz.questions.map((q) => ({
                  id: q.id,
                  type: q.type as AuthorableQuestionType,
                  prompt: q.prompt,
                  allow_multiple: q.allow_multiple,
                  case_sensitive: q.case_sensitive,
                  options: q.options.map((o) => ({
                    id: o.id,
                    text: o.text,
                    is_correct: o.is_correct,
                  })),
                })),
              }
            : null,
        }
      }),
    })),
  }
}

/**
 * Stable JSON serialization used for BOTH dirty-checking (draft vs baseline)
 * and localStorage autosave. Field order is guaranteed by draftFromDetail /
 * the reducer building object literals the same way every time.
 */
export function serializeDraft(draft: CourseDraft): string {
  return JSON.stringify(draft)
}

const optionSchema = z.object({
  id: z.string().uuid(),
  text: z.string().max(2000),
  is_correct: z.boolean(),
})

const authorableQuestionType = z.enum([
  "multiple_choice",
  "true_false",
  "short_answer",
  "essay",
  "file_upload",
])

const questionSchema = z.object({
  id: z.string().uuid(),
  type: authorableQuestionType,
  prompt: z.string().max(50_000),
  allow_multiple: z.boolean(),
  case_sensitive: z.boolean(),
  options: z.array(optionSchema).max(50),
})

const quizSchema = z.object({
  id: z.string().uuid(),
  pass_score: z.number().min(0).max(100),
  max_attempts: z.number().min(1).nullable(),
  shuffle: z.boolean(),
  is_assessment: z.boolean(),
  questions: z.array(questionSchema).max(200),
})

const resourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(500),
  file_url: z.string().max(2000),
  type: z.string().max(50).nullable(),
})

const lessonContentType = z.enum(["video", "text", "quiz", "mixed", "ppt"])

const lessonSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(500),
  content_type: lessonContentType,
  video_url: z.string().max(2000).nullable(),
  content: z.string().max(500_000).nullable(),
  duration_seconds: z.number().min(0).nullable(),
  resources: z.array(resourceSchema).max(100),
  quiz: quizSchema.nullable(),
})

const sectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(500),
  lessons: z.array(lessonSchema).max(500),
})

const certificateTypeSchema = z.enum(["completion", "participation", "achievement", "custom"])

const certificateSettingsSchema = z.object({
  enabled: z.boolean(),
  template_url: z.string().max(2000).nullable(),
  certificate_type: certificateTypeSchema,
  custom_title: z.string().max(500).nullable(),
  description: z.string().max(5000).nullable(),
  signature_url: z.string().max(2000).nullable(),
  signer_name: z.string().max(500).nullable(),
  signer_title: z.string().max(500).nullable(),
  additional_text: z.string().max(5000).nullable(),
})

export const courseDraftSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().trim().max(20_000),
  requirementsText: z.string().trim().max(20_000),
  audienceText: z.string().trim().max(20_000),
  thumbnail_url: z.string().trim().max(2000),
  level: z.string().trim().max(100),
  enrollmentMode: z.enum(["free", "paid"]),
  price: z.number().min(0, "Price can't be negative"),
  isPrivate: z.boolean(),
  passingGrade: z.number().int().min(0).max(100),
  requirePrerequisites: z.boolean(),
  prerequisiteIds: z.array(z.string().uuid()).max(50),
  certificate: certificateSettingsSchema.nullable(),
  instructorId: z.string().uuid().nullable(),
  sections: z.array(sectionSchema).max(200),
})

export type CourseFormValues = Pick<
  CourseDraft,
  | "title"
  | "description"
  | "requirementsText"
  | "audienceText"
  | "thumbnail_url"
  | "level"
  | "enrollmentMode"
  | "price"
  | "isPrivate"
>
