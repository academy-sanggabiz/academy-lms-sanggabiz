import { createClient } from "@/lib/supabase/server"
import type {
  Course,
  CourseDetail,
  CourseSection,
  Instructor,
  LessonContentType,
  Question,
  QuestionOption,
  Quiz,
  Resource,
} from "@/lib/courses"

/**
 * lib/courses.ts's client-safe Quiz/Question/QuestionOption types omit
 * is_correct (a documented RLS tradeoff for the public quiz-taking path --
 * see 20260801000000_quiz_engine.sql). getCourseDetailForAdmin already
 * selects question_options(*), so the raw rows have is_correct at runtime;
 * these admin-only types just widen the TS shape for authoring UI.
 */
export type AdminQuestionOption = QuestionOption & { is_correct: boolean }
export type AdminQuestion = Omit<Question, "options"> & { options: AdminQuestionOption[] }
export type AdminQuiz = Omit<Quiz, "questions"> & { questions: AdminQuestion[] }

export type AuthorableQuestionType = "multiple_choice" | "short_answer" | "essay"

export type CoursePrerequisite = { id: string; title: string }

export type CertificateType = "completion" | "participation" | "achievement" | "custom"

export type CourseCertificateSettings = {
  enabled: boolean
  template_url: string | null
  certificate_type: CertificateType
  custom_title: string | null
  description: string | null
  signature_url: string | null
  signer_name: string | null
  signer_title: string | null
  additional_text: string | null
}

export type AdminCourseDetail = CourseDetail & {
  require_prerequisites: boolean
  prerequisites: CoursePrerequisite[]
  certificate_settings: CourseCertificateSettings | null
}

/** Server-only admin data access for course authoring -- never import from a Client Component. */

export type CourseInput = {
  title: string
  slug?: string
  description: string | null
  thumbnail_url: string | null
  price: number
  level: string | null
  status: "draft" | "published"
  who_for: string[]
  requirements: string[]
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function getAdminCourseList(): Promise<Course[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getAdminCourseList failed:", error.message)
    return []
  }

  return data
}

export async function getCourseDetailForAdmin(id: string): Promise<AdminCourseDetail | null> {
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
          quiz:quizzes(*, questions(*, options:question_options(*)))
        )
      ),
      course_instructors(instructor:instructors(*)),
      prerequisites:course_prerequisites!course_prerequisites_course_id_fkey(
        position,
        prerequisite:courses!course_prerequisites_prerequisite_course_id_fkey(id, title)
      ),
      certificate_settings:course_certificate_settings(*)`
    )
    .eq("id", id)
    .single()

  if (error || !data) {
    if (error) console.error("getCourseDetailForAdmin failed:", error.message)
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

  const prerequisiteRows = data.prerequisites as { position: number; prerequisite: CoursePrerequisite }[]
  const prerequisites = [...prerequisiteRows]
    .sort((a, b) => a.position - b.position)
    .map((p) => p.prerequisite)

  const certificateSettingsRow = Array.isArray(data.certificate_settings)
    ? (data.certificate_settings[0] ?? null)
    : (data.certificate_settings ?? null)

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
    prerequisites,
    certificate_settings: certificateSettingsRow as CourseCertificateSettings | null,
    resource_count: resourceCount ?? 0,
    enrolled_count: enrolledCount ?? 0,
  }
}

export async function createCourse(
  input: CourseInput
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const slug = input.slug?.trim() || `${slugify(input.title)}-${Date.now().toString(36)}`

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: input.title,
      slug,
      description: input.description,
      thumbnail_url: input.thumbnail_url,
      price: input.price,
      level: input.level,
      status: input.status,
      who_for: input.who_for,
      requirements: input.requirements,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error || !data) {
    return { error: error?.message ?? "Failed to create course" }
  }

  return { id: data.id }
}

export async function createDraftCourse(): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const slug = `${slugify("Untitled Course")}-${Date.now().toString(36)}`

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: "Untitled Course",
      slug,
      description: null,
      thumbnail_url: null,
      price: 0,
      level: null,
      status: "draft",
      who_for: [],
      requirements: [],
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error || !data) {
    return { error: error?.message ?? "Failed to create course" }
  }

  return { id: data.id }
}

export async function updateCourse(
  id: string,
  input: CourseInput
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("courses")
    .update({
      title: input.title,
      description: input.description,
      thumbnail_url: input.thumbnail_url,
      price: input.price,
      level: input.level,
      status: input.status,
      who_for: input.who_for,
      requirements: input.requirements,
    })
    .eq("id", id)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function deleteCourse(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("courses").delete().eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function setCourseStatus(
  id: string,
  status: "draft" | "published"
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("courses").update({ status }).eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function listInstructors(): Promise<Instructor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("instructors").select("*").order("name")
  if (error) {
    console.error("listInstructors failed:", error.message)
    return []
  }
  return data
}

export async function createInstructor(input: {
  name: string
  title: string | null
  bio: string | null
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("instructors")
    .insert(input)
    .select("id")
    .single()

  if (error || !data) return { error: error?.message ?? "Failed to create instructor" }
  return { id: data.id }
}

export async function assignInstructor(
  courseId: string,
  instructorId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  // Single-instructor-per-course for now (Phase 2 scope) -- clear any
  // existing assignment first so re-picking an instructor replaces it
  // rather than accumulating rows.
  const { error: deleteError } = await supabase
    .from("course_instructors")
    .delete()
    .eq("course_id", courseId)
  if (deleteError) return { error: deleteError.message }

  const { error } = await supabase
    .from("course_instructors")
    .insert({ course_id: courseId, instructor_id: instructorId })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function unassignInstructor(
  courseId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("course_instructors").delete().eq("course_id", courseId)
  if (error) return { error: error.message }
  return { ok: true }
}

/**
 * The reference "Lessons" tab has no section/module concept -- lessons hang
 * directly off a course. The DB still requires a course_sections row per
 * lesson, so every course gets exactly one auto-created "General" section,
 * never surfaced in the UI.
 */
async function ensureDefaultSection(courseId: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: existing, error: selectError } = await supabase
    .from("course_sections")
    .select("id")
    .eq("course_id", courseId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (selectError) return { error: selectError.message }
  if (existing) return { id: existing.id }

  const { data: created, error: insertError } = await supabase
    .from("course_sections")
    .insert({ course_id: courseId, title: "General", position: 0 })
    .select("id")
    .single()

  if (insertError || !created) return { error: insertError?.message ?? "Failed to create section" }
  return { id: created.id }
}

async function nextPosition(
  table: "lessons" | "resources" | "questions" | "question_options" | "course_prerequisites",
  column: "section_id" | "lesson_id" | "quiz_id" | "question_id" | "course_id",
  id: string
) {
  const supabase = await createClient()
  const { data } = await supabase
    .from(table)
    .select("position")
    .eq(column, id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.position ?? -1) + 1
}

export async function createLesson(
  courseId: string,
  input: { title: string; content_type: LessonContentType; duration_seconds: number | null }
): Promise<{ id: string } | { error: string }> {
  const section = await ensureDefaultSection(courseId)
  if ("error" in section) return section

  const supabase = await createClient()
  const position = await nextPosition("lessons", "section_id", section.id)

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      section_id: section.id,
      title: input.title,
      content_type: input.content_type,
      duration_seconds: input.duration_seconds,
      position,
    })
    .select("id")
    .single()

  if (error || !data) return { error: error?.message ?? "Failed to create lesson" }
  return { id: data.id }
}

export async function updateLesson(
  id: string,
  input: Partial<{
    title: string
    content_type: LessonContentType
    video_url: string | null
    content: string | null
    duration_seconds: number | null
  }>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("lessons").update(input).eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function deleteLesson(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("lessons").delete().eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function duplicateLesson(id: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: source, error: sourceError } = await supabase
    .from("lessons")
    .select("*, resources(*)")
    .eq("id", id)
    .single()

  if (sourceError || !source) return { error: sourceError?.message ?? "Lesson not found" }

  const position = await nextPosition("lessons", "section_id", source.section_id)

  const { data: copy, error: insertError } = await supabase
    .from("lessons")
    .insert({
      section_id: source.section_id,
      title: `${source.title} (copy)`,
      content_type: source.content_type,
      video_url: source.video_url,
      content: source.content,
      duration_seconds: source.duration_seconds,
      position,
    })
    .select("id")
    .single()

  if (insertError || !copy) return { error: insertError?.message ?? "Failed to duplicate lesson" }

  const resources = (source.resources as Resource[]) ?? []
  if (resources.length > 0) {
    const { error: resourcesError } = await supabase.from("resources").insert(
      resources.map((r) => ({
        lesson_id: copy.id,
        title: r.title,
        file_url: r.file_url,
        type: r.type,
        position: r.position,
      }))
    )
    if (resourcesError) return { error: resourcesError.message }
  }

  return { id: copy.id }
}

export async function reorderLessons(orderedIds: string[]): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const results = await Promise.all(
    orderedIds.map((id, position) => supabase.from("lessons").update({ position }).eq("id", id))
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return { error: failed.error.message }
  return { ok: true }
}

export async function createResource(
  lessonId: string,
  input: { title: string; file_url: string; type: string }
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const position = await nextPosition("resources", "lesson_id", lessonId)

  const { data, error } = await supabase
    .from("resources")
    .insert({ lesson_id: lessonId, title: input.title, file_url: input.file_url, type: input.type, position })
    .select("id")
    .single()

  if (error || !data) return { error: error?.message ?? "Failed to create resource" }
  return { id: data.id }
}

export async function updateResource(
  id: string,
  input: Partial<{ title: string; file_url: string; type: string }>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("resources").update(input).eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function deleteResource(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("resources").delete().eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

async function ensureQuiz(lessonId: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: existing, error: selectError } = await supabase
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle()

  if (selectError) return { error: selectError.message }
  if (existing) return { id: existing.id }

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("title")
    .eq("id", lessonId)
    .single()

  if (lessonError || !lesson) return { error: lessonError?.message ?? "Lesson not found" }

  const { data: created, error: insertError } = await supabase
    .from("quizzes")
    .insert({ lesson_id: lessonId, title: lesson.title, pass_score: 70, shuffle: false, max_attempts: null })
    .select("id")
    .single()

  if (insertError || !created) return { error: insertError?.message ?? "Failed to create quiz" }
  return { id: created.id }
}

export async function createQuestion(
  lessonId: string,
  input: { type: AuthorableQuestionType; prompt: string; points: number }
): Promise<{ id: string } | { error: string }> {
  const quiz = await ensureQuiz(lessonId)
  if ("error" in quiz) return quiz

  const supabase = await createClient()
  const position = await nextPosition("questions", "quiz_id", quiz.id)

  const { data, error } = await supabase
    .from("questions")
    .insert({ quiz_id: quiz.id, type: input.type, prompt: input.prompt, points: input.points, position })
    .select("id")
    .single()

  if (error || !data) return { error: error?.message ?? "Failed to create question" }
  return { id: data.id }
}

export async function updateQuiz(
  id: string,
  input: Partial<{ title: string; pass_score: number; max_attempts: number | null; shuffle: boolean }>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("quizzes").update(input).eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function updateQuestion(
  id: string,
  input: Partial<{ type: AuthorableQuestionType; prompt: string; points: number }>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("questions").update(input).eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function deleteQuestion(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("questions").delete().eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function createOption(
  questionId: string,
  input: { text: string }
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const position = await nextPosition("question_options", "question_id", questionId)

  const { data, error } = await supabase
    .from("question_options")
    .insert({ question_id: questionId, text: input.text, is_correct: false, position })
    .select("id")
    .single()

  if (error || !data) return { error: error?.message ?? "Failed to create option" }
  return { id: data.id }
}

export async function updateOptionText(id: string, text: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("question_options").update({ text }).eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function setCorrectOption(
  questionId: string,
  optionId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: options, error: selectError } = await supabase
    .from("question_options")
    .select("id")
    .eq("question_id", questionId)

  if (selectError) return { error: selectError.message }

  const results = await Promise.all(
    (options ?? []).map((o) =>
      supabase.from("question_options").update({ is_correct: o.id === optionId }).eq("id", o.id)
    )
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return { error: failed.error.message }
  return { ok: true }
}

export async function deleteOption(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("question_options").delete().eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function listCoursesForPrerequisitePicker(excludeCourseId: string): Promise<CoursePrerequisite[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("courses")
    .select("id, title")
    .neq("id", excludeCourseId)
    .order("title")

  if (error) {
    console.error("listCoursesForPrerequisitePicker failed:", error.message)
    return []
  }
  return data
}

export async function setRequirePrerequisites(
  courseId: string,
  value: boolean
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("courses").update({ require_prerequisites: value }).eq("id", courseId)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function addPrerequisite(
  courseId: string,
  prerequisiteCourseId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const position = await nextPosition("course_prerequisites", "course_id", courseId)

  const { error } = await supabase
    .from("course_prerequisites")
    .insert({ course_id: courseId, prerequisite_course_id: prerequisiteCourseId, position })

  if (error) return { error: error.message }
  return { ok: true }
}

export async function removePrerequisite(
  courseId: string,
  prerequisiteCourseId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("course_prerequisites")
    .delete()
    .eq("course_id", courseId)
    .eq("prerequisite_course_id", prerequisiteCourseId)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function saveCertificateSettings(
  courseId: string,
  input: Partial<CourseCertificateSettings>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("course_certificate_settings")
    .upsert({ course_id: courseId, ...input }, { onConflict: "course_id" })

  if (error) return { error: error.message }
  return { ok: true }
}
