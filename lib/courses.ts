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

export function formatPrice(price: number): string {
  if (price <= 0) return "Free"
  return `Rp ${price.toLocaleString("id-ID")}`
}

export type LessonContentType = "video" | "text" | "quiz" | "mixed"

export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "essay"
  | "matching"
  | "fill_in_blank"

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
  options: QuestionOption[]
}

export type Quiz = {
  id: string
  title: string
  pass_score: number
  max_attempts: number | null
  shuffle: boolean
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

export function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  return `${Math.round(seconds / 60)}min`
}
