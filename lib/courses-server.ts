import { createClient } from "@/lib/supabase/server"
import type { Course, CourseDetail, CourseSection, Instructor, Lesson, Question } from "@/lib/courses"

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

type PublicLessonRow = {
  id: string
  section_id: string
  title: string
  position: number
  content_type: Lesson["content_type"]
  duration_seconds: number | null
  resource_count: number
}

/**
 * Course detail for the learner side: the "sales page" (/learner/courses/[id])
 * and the lesson player (lib/learn-server.ts).
 *
 * Two layers, matching the RLS split in databaseSetup.sql section 17:
 *  - the curriculum skeleton (section + lesson titles, type, duration) comes
 *    from the `lessons_public` view, readable by anyone who can read the
 *    course -- so a non-enrolled visitor still sees what the course contains;
 *  - lesson content, video_url, resources, quiz questions and options come
 *    from the base tables, which RLS only opens to learners enrolled in the
 *    course and to the admin who owns it (can_read_course_content()).
 * For everyone else the second query simply returns no rows and each lesson
 * is filled with empty content (video_url/content null, no resources, quiz
 * null), so callers never see content they are not entitled to and never
 * have to branch on enrollment to stay safe.
 */
export async function getCourseDetail(id: string): Promise<CourseDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("courses")
    .select(
      `*,
      sections:course_sections(*),
      course_instructors(instructor:instructors(*))`
    )
    .eq("id", id)
    .eq("status", "published")
    .single()

  if (error || !data) {
    if (error) console.error("getCourseDetail failed:", error.message)
    return null
  }

  const rawSections = data.sections as Omit<CourseSection, "lessons">[]
  const sectionIds = rawSections.map((s) => s.id)

  const [{ data: publicRows, error: publicError }, { data: fullRows, error: fullError }] = await Promise.all([
    supabase
      .from("lessons_public")
      .select("id, section_id, title, position, content_type, duration_seconds, resource_count")
      .eq("course_id", id),
    sectionIds.length > 0
      ? supabase
          .from("lessons")
          .select(
            "*, resources(*), quiz:quizzes(*, questions(id,type,prompt,points,position,allow_multiple,case_sensitive))"
          )
          .in("section_id", sectionIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (publicError) console.error("getCourseDetail curriculum lookup failed:", publicError.message)
  if (fullError) console.error("getCourseDetail content lookup failed:", fullError.message)

  // The query above omits `options` (question_options is admin-only), so each
  // question is missing that field until it's stitched back on below.
  const fullById = new Map((fullRows ?? []).map((row) => [row.id as string, row as Lesson]))

  const questionIds = [...fullById.values()].flatMap((l) => {
    const quiz = Array.isArray(l.quiz) ? l.quiz[0] : l.quiz
    return quiz ? quiz.questions.map((q: Question) => q.id) : []
  })

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

  const toLesson = (row: PublicLessonRow): Lesson => {
    const full = fullById.get(row.id)
    if (!full) {
      // Not entitled to the content: curriculum fields only.
      return { ...row, video_url: null, content: null, quiz: null, resources: [] }
    }
    const quiz = Array.isArray(full.quiz) ? full.quiz[0] : full.quiz
    return {
      ...full,
      resources: [...(full.resources ?? [])].sort((a, b) => a.position - b.position),
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
  }

  const publicLessons = (publicRows ?? []) as PublicLessonRow[]
  const sections: CourseSection[] = rawSections
    .map((section) => ({
      ...section,
      lessons: publicLessons
        .filter((l) => l.section_id === section.id)
        .map(toLesson)
        .sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position)

  const instructorRows = data.course_instructors as { instructor: Instructor }[]
  const instructor = instructorRows[0]?.instructor ?? null

  // Counted from the public view so the sales page shows the real number
  // even to visitors who can't read the resources themselves.
  const resourceCount = publicLessons.reduce((sum, l) => sum + (l.resource_count ?? 0), 0)

  const { count: enrolledCount } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("course_id", id)

  return {
    ...data,
    sections,
    instructor,
    resource_count: resourceCount,
    enrolled_count: enrolledCount ?? 0,
  }
}
