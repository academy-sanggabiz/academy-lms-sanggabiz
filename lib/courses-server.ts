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
          quiz:quizzes(*, questions(id,type,prompt,points,position,allow_multiple,case_sensitive))
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

  // The query above omits `options` (question_options is admin-only now), so
  // each question here is missing that field until it's stitched back on
  // below -- cast through CourseSection since the shape is otherwise identical.
  const rawSections = data.sections as CourseSection[]

  const questionIds = rawSections.flatMap((s) =>
    s.lessons.flatMap((l) => (l.quiz ? l.quiz.questions.map((q) => q.id) : []))
  )

  // question_options.is_correct is admin-only at the RLS level (see
  // databaseSetup.sql) -- the learner-facing player only ever needs option
  // text/position, so it reads the answer-key-free view instead of the base
  // table. short_answer questions are absent from this view entirely (their
  // "options" are the accepted keywords, i.e. the answer itself).
  const { data: optionRows, error: optionsError } =
    questionIds.length > 0
      ? await supabase
          .from("question_options_public")
          .select("id, question_id, text, position")
          .in("question_id", questionIds)
      : { data: [], error: null }

  if (optionsError) console.error("getCourseDetail options lookup failed:", optionsError.message)

  const optionsByQuestion = new Map<string, { id: string; text: string; position: number }[]>()
  for (const row of optionRows ?? []) {
    const list = optionsByQuestion.get(row.question_id) ?? []
    list.push({ id: row.id, text: row.text, position: row.position })
    optionsByQuestion.set(row.question_id, list)
  }

  const sections = rawSections
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
                      options: (optionsByQuestion.get(q.id) ?? []).sort((a, b) => a.position - b.position),
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
