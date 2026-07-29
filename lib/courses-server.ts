import { createClient } from "@/lib/supabase/server"
import type { Course, CourseDetail, CourseSection, Instructor } from "@/lib/courses"

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
    .select(
      `*,
      sections:course_sections(
        *,
        lessons(
          *,
          resources(*),
          quiz:quizzes(*, questions(*, options:question_options(id,text,position)))
        )
      ),
      course_instructors(instructor:instructors(*))`
    )
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
      lessons: [...section.lessons]
        .map((lesson) => {
          const quiz = Array.isArray(lesson.quiz) ? lesson.quiz[0] : lesson.quiz
          return {
            ...lesson,
            resources: [...(lesson.resources ?? [])].sort((a, b) => a.position - b.position),
            quiz: quiz
              ? {
                  ...quiz,
                  questions: [...quiz.questions]
                    .map((q) => ({
                      ...q,
                      options: [...q.options].sort((a, b) => a.position - b.position),
                    }))
                    .sort((a, b) => a.position - b.position),
                }
              : null,
          }
        })
        .sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position)

  const instructorRows = data.course_instructors as { instructor: Instructor }[]
  const instructor = instructorRows[0]?.instructor ?? null

  const lessonIds = sections.flatMap((s) => s.lessons.map((l) => l.id))

  const [{ count: resourceCount }, { count: enrolledCount }] = await Promise.all([
    lessonIds.length > 0
      ? supabase.from("resources").select("*", { count: "exact", head: true }).in("lesson_id", lessonIds)
      : Promise.resolve({ count: 0 }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("course_id", id),
  ])

  return {
    ...data,
    sections,
    instructor,
    resource_count: resourceCount ?? 0,
    enrolled_count: enrolledCount ?? 0,
  }
}
