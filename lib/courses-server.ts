import { createClient } from "@/lib/supabase/server"
import type { Course, CourseDetail, CourseSection, Instructor } from "@/lib/courses"

export async function getPublishedCourses(): Promise<Course[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    // Private courses are invite-only, so they never belong in a browse/catalog
    // list even for a learner who IS enrolled (they reach them via My Courses
    // instead). RLS already hides them from everyone else; this filter is the
    // same belt-and-braces as the status check beside it.
    .eq("status", "published")
    .eq("is_private", false)
    .order("created_at")

  if (error) {
    console.error("getPublishedCourses failed:", error.message)
    return []
  }

  return data
}

/**
 * Full Course rows for everything the caller is enrolled in -- including
 * private courses, which getPublishedCourses() deliberately excludes.
 *
 * The learner's "Enrolled"/"Completed" tabs must NOT be derived by filtering
 * the catalog list by enrolled ids: a private course is absent from that list
 * by design, so the filter silently drops it and an invited learner loses
 * access to the very course they were enrolled in. Going through `enrollments`
 * instead is what makes private courses reachable -- RLS's can_read_course()
 * admits a course you're enrolled in.
 */
export async function getEnrolledCourses(): Promise<Course[]> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data, error } = await supabase
    .from("enrollments")
    .select("courses(*)")
    .eq("learner_id", userId)

  if (error) {
    console.error("getEnrolledCourses failed:", error.message)
    return []
  }

  // PostgREST widens embedded to-one rows to an array -- same normalization
  // getEnrolledCoursesWithDetails (lib/enrollments-server.ts) does.
  return data
    .map((row) => (Array.isArray(row.courses) ? row.courses[0] : row.courses))
    .filter((course): course is Course => course != null)
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
