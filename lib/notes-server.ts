import { createClient } from "@/lib/supabase/server"
import type { CourseNote, LessonNote } from "@/lib/notes"

/**
 * Lesson notes ("Catatan saya") of the current learner. Server-only: imports
 * lib/supabase/server. RLS on public.lesson_notes is own-row only, so these
 * reads can never return another learner's notes; the learner_id filter is
 * just there to make the intent explicit (and use the index).
 */

export async function getLessonNote(lessonId: string): Promise<LessonNote | null> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return null

  const { data, error } = await supabase
    .from("lesson_notes")
    .select("content, updated_at")
    .eq("learner_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle()

  if (error) {
    console.error("getLessonNote failed:", error.message)
    return null
  }
  if (!data) return null
  return { content: data.content, updatedAt: data.updated_at }
}

type CourseNoteRow = {
  lesson_id: string
  content: string
  updated_at: string
  lessons: {
    title: string
    position: number
    course_sections: { title: string; position: number; course_id: string }
  }
}

/** The current learner's notes for one course, in curriculum order. */
export async function getCourseNotes(courseId: string): Promise<CourseNote[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("lesson_notes")
    .select(
      "lesson_id, content, updated_at, lessons!inner(title, position, course_sections!inner(title, position, course_id))"
    )
    .eq("learner_id", userId)
    .eq("lessons.course_sections.course_id", courseId)
    .neq("content", "")

  if (error) {
    console.error("getCourseNotes failed:", error.message)
    return []
  }

  const rows = (data ?? []) as unknown as CourseNoteRow[]
  return rows
    .filter((r) => r.lessons?.course_sections?.course_id === courseId)
    .sort(
      (a, b) =>
        a.lessons.course_sections.position - b.lessons.course_sections.position ||
        a.lessons.position - b.lessons.position
    )
    .map((r) => ({
      lessonId: r.lesson_id,
      lessonTitle: r.lessons.title,
      sectionTitle: r.lessons.course_sections.title,
      content: r.content,
      updatedAt: r.updated_at,
    }))
}
