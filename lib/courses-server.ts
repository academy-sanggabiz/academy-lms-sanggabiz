import { createClient } from "@/lib/supabase/server"
import type { Course, CourseDetail, CourseSection } from "@/lib/courses"

export async function getPublishedCourses(): Promise<Course[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("created_at")

  if (error) {
    console.error("getPublishedCourses failed:", error.message)
    return []
  }

  return data
}

export async function getCourseDetail(id: string): Promise<CourseDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("courses")
    .select("*, sections:course_sections(*, lessons(*))")
    .eq("id", id)
    .eq("status", "published")
    .single()

  if (error || !data) {
    if (error) console.error("getCourseDetail failed:", error.message)
    return null
  }

  const sections = (data.sections as CourseSection[])
    .map((section) => ({
      ...section,
      lessons: [...section.lessons].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position)

  return { ...data, sections }
}
