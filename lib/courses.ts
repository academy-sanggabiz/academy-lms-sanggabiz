export type Course = {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  price: number
  level: string | null
  lesson_count: number
  duration_hours: number
  status: "draft" | "published"
  who_for: string[]
  requirements: string[]
  language: string
  /**
   * Invite-only: hidden from the catalog and from anon visitors, readable only
   * by the owning admin and learners an admin has explicitly enrolled.
   * Orthogonal to `status` -- a private course can still be draft or published.
   */
  is_private: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Instructor = {
  id: string
  name: string
  title: string | null
  bio: string | null
  avatar_url: string | null
}

/** Money only -- a zero amount is `Rp 0`, never a word. */
export function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString("id-ID")}`
}

/**
 * Course-facing access label: invite-only reads "Private", an open zero-price
 * course reads "Public", anything else shows the price.
 */
export function formatCourseAccess(course: Pick<Course, "price" | "is_private">): string {
  if (course.is_private) return "Private"
  if (course.price <= 0) return "Public"
  return formatPrice(course.price)
}

export type LessonContentType = "video" | "text" | "quiz" | "mixed" | "ppt"

/**
 * Hard cap on attempts for regular (non-study-case) quizzes -- always 3,
 * regardless of a quiz's `max_attempts` column (which still governs
 * study-case/is_assessment quizzes only). Shared so the server-side enforcement
 * in quiz-actions.ts and the learner-facing display in QuizPlayer.tsx can't drift.
 */
export const REGULAR_QUIZ_MAX_ATTEMPTS = 3

export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "essay"
  | "matching"
  | "fill_in_blank"
  | "file_upload"

export type QuestionOption = {
  id: string
  text: string
  position: number
}

export type Question = {
  id: string
  type: QuestionType
  prompt: string
  points: number
  position: number
  allow_multiple: boolean
  case_sensitive: boolean
  options: QuestionOption[]
}

export type Quiz = {
  id: string
  title: string
  pass_score: number
  max_attempts: number | null
  shuffle: boolean
  is_assessment: boolean
  questions: Question[]
}

export type Resource = {
  id: string
  lesson_id: string
  title: string
  file_url: string
  type: string | null
  position: number
}

export type Lesson = {
  id: string
  section_id: string
  title: string
  position: number
  content_type: LessonContentType
  video_url: string | null
  content: string | null
  duration_seconds: number | null
  quiz: Quiz | null
  resources: Resource[]
}

export type CourseSection = {
  id: string
  course_id: string
  title: string
  position: number
  lessons: Lesson[]
}

export type CourseDetail = Course & {
  sections: CourseSection[]
  instructor: Instructor | null
  resource_count: number
  enrolled_count: number
}

export function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null

  let videoId: string | null = null
  try {
    const parsed = new URL(url)
    if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1)
    } else if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v")
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.replace("/embed/", "")
      }
    }
  } catch {
    return null
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

export function getGoogleSlidesEmbedUrl(url: string | null): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes("docs.google.com")) return null
    if (!parsed.pathname.startsWith("/presentation/")) return null

    const match = parsed.pathname.match(/^\/presentation\/d\/(e\/)?([^/]+)/)
    if (!match) return null

    const [, publishedPrefix, id] = match
    return `https://docs.google.com/presentation/d/${publishedPrefix ?? ""}${id}/embed`
  } catch {
    return null
  }
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  return `${Math.round(seconds / 60)}min`
}
