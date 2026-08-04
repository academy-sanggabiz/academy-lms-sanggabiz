import { createClient } from "@/lib/supabase/server"
import { getAdminProfile } from "@/lib/auth/require-admin"
import { paginated, rangeFor, type ListParams, type Paginated } from "@/lib/pagination"
import { linesToArray, type CourseDraft } from "@/lib/course-draft"
import type {
  Course,
  CourseDetail,
  CourseSection,
  Instructor,
  Lesson,
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

export type AuthorableQuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "essay"
  | "file_upload"

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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * RLS alone isn't enough to scope this to the admin's own courses: every
 * authenticated user (learners included) also matches the separate
 * "readable courses" policy, so a non-superadmin here would still see every
 * OTHER admin's published courses via that policy union. (Private courses are
 * the exception -- "readable courses" excludes them unless you're enrolled --
 * but public ones still leak across admins.) created_by narrows the view below
 * what RLS permits -- RLS still fully blocks cross-admin writes regardless.
 *
 * For pickers that need a broad list of owned courses (EnrollModal's course
 * list), not the paginated Course Management list (getAdminCourseList
 * below). .limit(50) is a stop-gap against unbounded growth, not real
 * pagination -- see Phase 9 of the pagination plan.
 */
export async function getAllAdminCourses(): Promise<Course[]> {
  const supabase = await createClient()
  const admin = await getAdminProfile()

  let query = supabase.from("courses").select("*").order("created_at", { ascending: false }).limit(50)
  if (admin && admin.role !== "superadmin") {
    query = query.eq("created_by", admin.userId)
  }

  const { data, error } = await query

  if (error) {
    console.error("getAllAdminCourses failed:", error.message)
    return []
  }

  return data
}

export type AdminCourseFilters = { status: "all" | "published" | "draft"; price: "all" | "free" | "paid" }

const COURSE_SORT_COLUMN: Record<string, string> = {
  created_at: "created_at",
  title: "title",
  price: "price",
}

export async function getAdminCourseList(p: ListParams<AdminCourseFilters>): Promise<Paginated<Course>> {
  const supabase = await createClient()
  const admin = await getAdminProfile()

  let query = supabase.from("courses").select("*", { count: "exact" })
  if (admin && admin.role !== "superadmin") {
    query = query.eq("created_by", admin.userId)
  }
  if (p.q) {
    query = query.ilike("title", `%${p.q}%`)
  }
  if (p.filters.status !== "all") {
    query = query.eq("status", p.filters.status)
  }
  if (p.filters.price === "free") {
    query = query.eq("price", 0)
  } else if (p.filters.price === "paid") {
    query = query.gt("price", 0)
  }

  const [from, to] = rangeFor(p.page, p.pageSize)
  const sortColumn = COURSE_SORT_COLUMN[p.sort] ?? "created_at"
  query = query.order(sortColumn, { ascending: p.dir === "asc" }).range(from, to)

  const { data, error, count } = await query

  if (error || !data) {
    console.error("getAdminCourseList failed:", error?.message)
    return paginated([], 0, p)
  }

  return paginated(data, count, p)
}

/** Same scoping as getAdminCourseList, but for the Dashboard's "recent courses" card -- newest first, paginated at a fixed page size. */
export async function getRecentCourses(p: { page: number; pageSize: number }): Promise<Paginated<Course>> {
  const supabase = await createClient()
  const admin = await getAdminProfile()

  let query = supabase.from("courses").select("*", { count: "exact" })
  if (admin && admin.role !== "superadmin") {
    query = query.eq("created_by", admin.userId)
  }

  const [from, to] = rangeFor(p.page, p.pageSize)
  query = query.order("created_at", { ascending: false }).range(from, to)

  const { data, error, count } = await query

  if (error || !data) {
    console.error("getRecentCourses failed:", error?.message)
    return paginated([], 0, p)
  }

  return paginated(data, count, p)
}

export type AdminCourseStats = {
  totalCourses: number
  publishedCourses: number
}

export async function getAdminCourseStats(): Promise<AdminCourseStats> {
  const supabase = await createClient()
  const admin = await getAdminProfile()
  const scoped = admin && admin.role !== "superadmin"

  let totalQuery = supabase.from("courses").select("*", { count: "exact", head: true })
  let publishedQuery = supabase
    .from("courses")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
  if (scoped) {
    totalQuery = totalQuery.eq("created_by", admin.userId)
    publishedQuery = publishedQuery.eq("created_by", admin.userId)
  }

  const [{ count: totalCourses }, { count: publishedCourses }] = await Promise.all([
    totalQuery,
    publishedQuery,
  ])

  return {
    totalCourses: totalCourses ?? 0,
    publishedCourses: publishedCourses ?? 0,
  }
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

  // Same RLS-union caveat as getAdminCourseList: a published course is
  // readable by any authenticated user via a separate policy, so this must
  // be checked explicitly rather than relying on the .eq("id", id) fetch
  // above to have already excluded courses the admin doesn't own.
  const admin = await getAdminProfile()
  if (admin && admin.role !== "superadmin" && data.created_by !== admin.userId) {
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

/** Unbounded picker dialog, not a paginated list -- .limit(50) is a stop-gap against unbounded growth, not real pagination (see Phase 9 of the pagination plan). */
export async function listInstructors(): Promise<Instructor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("instructors").select("*").order("name").limit(50)
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

export async function deleteInstructor(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("instructors").delete().eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

/** Unbounded picker dialog, not a paginated list -- .limit(50) is a stop-gap against unbounded growth, not real pagination (see Phase 9 of the pagination plan). */
export async function listCoursesForPrerequisitePicker(excludeCourseId: string): Promise<CoursePrerequisite[]> {
  const supabase = await createClient()
  const admin = await getAdminProfile()

  let query = supabase.from("courses").select("id, title").neq("id", excludeCourseId).order("title").limit(50)
  if (admin && admin.role !== "superadmin") {
    query = query.eq("created_by", admin.userId)
  }

  const { data, error } = await query

  if (error) {
    console.error("listCoursesForPrerequisitePicker failed:", error.message)
    return []
  }
  return data
}

/**
 * Shared ownership-scoping helper for admin lib files that read data derived
 * from courses (enrollments, transactions, quiz_attempts, ...) but have no
 * direct RLS-only guarantee of isolation -- see lib/purchases-admin.ts,
 * lib/learners-admin.ts, lib/grading-server.ts. Returns null to mean "no
 * restriction" (superadmin), or the list of course ids this admin owns
 * (possibly empty) otherwise.
 */
export async function getOwnedCourseIdsOrNull(): Promise<string[] | null> {
  const admin = await getAdminProfile()
  if (!admin || admin.role === "superadmin") return null

  const supabase = await createClient()
  const { data, error } = await supabase.from("courses").select("id").eq("created_by", admin.userId)

  if (error) {
    console.error("getOwnedCourseIdsOrNull failed:", error.message)
    return []
  }

  return (data ?? []).map((c) => c.id)
}

// question_options(*) doesn't declare quiz_id/question_id on the client-safe
// Question/QuestionOption types (see the AdminQuestionOption doc comment
// above), but questions(*) DOES return quiz_id at runtime -- this augments
// the type just enough to compare it during diffing below.
type SnapshotQuestion = AdminQuestion & { quiz_id: string }

function wrapSaveError(step: string, message: string): { error: string } {
  return { error: `Save failed at ${step}. Your changes are still here — press Save again. (${message})` }
}

/**
 * Batch-persists a CourseDraft (see lib/course-draft.ts) built up entirely in
 * client state. Re-reads the server snapshot itself rather than trusting a
 * client-supplied one -- the client's "original" is untrusted and stale by
 * construction (the admin may have sat on the draft for minutes).
 * getCourseDetailForAdmin's ownership check doubles as this call's
 * authorization gate (returns null for a non-owner).
 *
 * Diff strategy: everything present in the draft but absent from the
 * snapshot maps is treated as new and inserted with its client id; this is
 * also the full extent of "provenance" checking needed -- a forged id
 * belonging to another course's row is simply absent from THIS course's
 * snapshot maps, so it's inserted, and on the astronomically unlikely chance
 * it collides with an existing PK the insert fails and the whole save is
 * safely aborted (see the partial-failure note below).
 *
 * Ordering: all inserts/updates happen parent -> child, all deletes happen
 * child -> parent, and this is deliberate -- everything here cascades on
 * delete, so the risk isn't a broken FK, it's a *premature* cascade (e.g.
 * deleting a module before the lesson dragged out of it has been
 * re-parented, which would take the lesson's lesson_progress with it).
 *
 * `quizzes` rows are NEVER deleted here, even when a lesson's quiz
 * disappears from the draft (deleted lesson, or content_type flipped away
 * from "quiz") -- quiz_attempts/quiz_responses cascade off quizzes/questions,
 * so deleting a quiz row would silently destroy learner history. An orphaned
 * quiz row is harmless: the learner UI only ever reaches a quiz through a
 * content_type = 'quiz' lesson.
 *
 * Partial-failure stance: there is no transaction across these calls (no
 * service-role client, no RPC yet -- see the plan doc for the RPC escalation
 * path). Because Phase B is insert-or-update keyed on client-generated ids,
 * a failure partway through leaves the DB a strict superset of the previous
 * state, and pressing Save again converges (already-written rows compare
 * equal on the next diff and are skipped).
 */
export async function saveCourseDraft(
  courseId: string,
  draft: CourseDraft,
  status: "draft" | "published"
): Promise<{ ok: true } | { error: string }> {
  const snapshot = await getCourseDetailForAdmin(courseId)
  if (!snapshot) return { error: "Course not found" }

  if (draft.prerequisiteIds.includes(courseId)) {
    return { error: "A course cannot be its own prerequisite" }
  }
  const prerequisiteIds = Array.from(new Set(draft.prerequisiteIds))

  const supabase = await createClient()

  // ---- Snapshot lookup maps -------------------------------------------
  const sectionsById = new Map(snapshot.sections.map((s) => [s.id, s]))
  const lessonsById = new Map<string, { lesson: Lesson; sectionId: string }>()
  const resourcesById = new Map<string, Resource>()
  const quizByLessonId = new Map<string, AdminQuiz>()
  const questionsById = new Map<string, SnapshotQuestion>()
  const optionsById = new Map<string, AdminQuestionOption>()

  for (const section of snapshot.sections) {
    for (const lesson of section.lessons) {
      lessonsById.set(lesson.id, { lesson, sectionId: section.id })
      for (const r of lesson.resources) resourcesById.set(r.id, r)
      const quiz = lesson.quiz as AdminQuiz | null
      if (quiz) {
        quizByLessonId.set(lesson.id, quiz)
        for (const q of quiz.questions) {
          questionsById.set(q.id, q as SnapshotQuestion)
          for (const o of q.options) optionsById.set(o.id, o)
        }
      }
    }
  }

  // ---- Phase B write buckets, built while walking the draft tree ------
  const sectionRows: { id: string; course_id: string; title: string; position: number }[] = []
  const lessonRows: {
    id: string
    section_id: string
    title: string
    content_type: LessonContentType
    video_url: string | null
    content: string | null
    duration_seconds: number | null
    position: number
  }[] = []
  const resourceRows: {
    id: string
    lesson_id: string
    title: string
    file_url: string
    type: string | null
    position: number
  }[] = []
  const quizRows: {
    id: string
    lesson_id: string
    title: string
    pass_score: number
    max_attempts: number | null
    shuffle: boolean
    is_assessment: boolean
  }[] = []
  const questionRows: {
    id: string
    quiz_id: string
    type: AuthorableQuestionType
    prompt: string
    points: number
    allow_multiple: boolean
    case_sensitive: boolean
    position: number
  }[] = []
  const optionRows: {
    id: string
    question_id: string
    text: string
    is_correct: boolean
    position: number
  }[] = []

  const seenSectionIds = new Set<string>()
  const seenLessonIds = new Set<string>()
  const seenResourceIds = new Set<string>()
  const seenQuestionIds = new Set<string>()
  const seenOptionIds = new Set<string>()

  draft.sections.forEach((section, sectionIndex) => {
    seenSectionIds.add(section.id)
    const existingSection = sectionsById.get(section.id)
    if (
      !existingSection ||
      existingSection.title !== section.title ||
      existingSection.position !== sectionIndex
    ) {
      sectionRows.push({ id: section.id, course_id: courseId, title: section.title, position: sectionIndex })
    }

    section.lessons.forEach((lesson, lessonIndex) => {
      seenLessonIds.add(lesson.id)
      const existingLesson = lessonsById.get(lesson.id)
      if (
        !existingLesson ||
        existingLesson.sectionId !== section.id ||
        existingLesson.lesson.title !== lesson.title ||
        existingLesson.lesson.content_type !== lesson.content_type ||
        existingLesson.lesson.video_url !== lesson.video_url ||
        existingLesson.lesson.content !== lesson.content ||
        existingLesson.lesson.duration_seconds !== lesson.duration_seconds ||
        existingLesson.lesson.position !== lessonIndex
      ) {
        lessonRows.push({
          id: lesson.id,
          section_id: section.id,
          title: lesson.title,
          content_type: lesson.content_type,
          video_url: lesson.video_url,
          content: lesson.content,
          duration_seconds: lesson.duration_seconds,
          position: lessonIndex,
        })
      }

      lesson.resources.forEach((resource, resourceIndex) => {
        seenResourceIds.add(resource.id)
        const existingResource = resourcesById.get(resource.id)
        if (
          !existingResource ||
          existingResource.title !== resource.title ||
          existingResource.file_url !== resource.file_url ||
          existingResource.type !== resource.type ||
          existingResource.position !== resourceIndex
        ) {
          resourceRows.push({
            id: resource.id,
            lesson_id: lesson.id,
            title: resource.title,
            file_url: resource.file_url,
            type: resource.type,
            position: resourceIndex,
          })
        }
      })

      if (lesson.quiz) {
        const existingQuiz = quizByLessonId.get(lesson.id)
        // quizzes.lesson_id is UNIQUE -- if a quiz already exists for this
        // lesson, always resolve to ITS id regardless of what the client
        // sent, so a stale/forged client quiz id can never collide with it.
        const quizId = existingQuiz?.id ?? lesson.quiz.id

        if (
          !existingQuiz ||
          existingQuiz.pass_score !== lesson.quiz.pass_score ||
          existingQuiz.max_attempts !== lesson.quiz.max_attempts ||
          existingQuiz.shuffle !== lesson.quiz.shuffle ||
          existingQuiz.is_assessment !== lesson.quiz.is_assessment ||
          existingQuiz.title !== lesson.title
        ) {
          quizRows.push({
            id: quizId,
            lesson_id: lesson.id,
            title: lesson.title,
            pass_score: lesson.quiz.pass_score,
            max_attempts: lesson.quiz.max_attempts,
            shuffle: lesson.quiz.shuffle,
            is_assessment: lesson.quiz.is_assessment,
          })
        }

        lesson.quiz.questions.forEach((question, questionIndex) => {
          seenQuestionIds.add(question.id)
          const existingQuestion = questionsById.get(question.id)
          if (
            !existingQuestion ||
            existingQuestion.quiz_id !== quizId ||
            existingQuestion.type !== question.type ||
            existingQuestion.prompt !== question.prompt ||
            existingQuestion.points !== question.points ||
            existingQuestion.allow_multiple !== question.allow_multiple ||
            existingQuestion.case_sensitive !== question.case_sensitive ||
            existingQuestion.position !== questionIndex
          ) {
            questionRows.push({
              id: question.id,
              quiz_id: quizId,
              type: question.type,
              prompt: question.prompt,
              points: question.points,
              allow_multiple: question.allow_multiple,
              case_sensitive: question.case_sensitive,
              position: questionIndex,
            })
          }

          question.options.forEach((option, optionIndex) => {
            seenOptionIds.add(option.id)
            const existingOption = optionsById.get(option.id)
            if (
              !existingOption ||
              existingOption.text !== option.text ||
              existingOption.is_correct !== option.is_correct ||
              existingOption.position !== optionIndex
            ) {
              optionRows.push({
                id: option.id,
                question_id: question.id,
                text: option.text,
                is_correct: option.is_correct,
                position: optionIndex,
              })
            }
          })
        })
      }
    })
  })

  // ---- Phase C deletes, computed after the walk (child -> parent) -----
  const deletedOptionIds = [...optionsById.keys()].filter((id) => !seenOptionIds.has(id))
  const deletedQuestionIds = [...questionsById.keys()].filter((id) => !seenQuestionIds.has(id))
  const deletedResourceIds = [...resourcesById.keys()].filter((id) => !seenResourceIds.has(id))
  const deletedLessonIds = [...lessonsById.keys()].filter((id) => !seenLessonIds.has(id))
  const deletedSectionIds = [...sectionsById.keys()].filter((id) => !seenSectionIds.has(id))

  // ---- Prerequisites / certificate / instructor diffs ------------------
  const existingPrereqIds = new Set(snapshot.prerequisites.map((p) => p.id))
  const removedPrereqIds = [...existingPrereqIds].filter((id) => !prerequisiteIds.includes(id))
  const prerequisiteRows = prerequisiteIds.map((id, index) => ({
    course_id: courseId,
    prerequisite_course_id: id,
    position: index,
  }))
  const prerequisitesChanged =
    prerequisiteIds.length !== snapshot.prerequisites.length ||
    removedPrereqIds.length > 0 ||
    prerequisiteIds.some((id, index) => snapshot.prerequisites[index]?.id !== id)

  const instructorChanged = (snapshot.instructor?.id ?? null) !== draft.instructorId

  const existingCertificate = snapshot.certificate_settings
  const certificate = draft.certificate
  const certificateChanged =
    (existingCertificate === null) !== (certificate === null) ||
    (existingCertificate !== null &&
      certificate !== null &&
      (Object.keys(certificate) as (keyof CourseCertificateSettings)[]).some(
        (key) => existingCertificate[key] !== certificate[key]
      ))

  // ---- Phase B: writes, parent -> child ---------------------------------

  const { error: courseError } = await supabase
    .from("courses")
    .update({
      title: draft.title,
      description: draft.description || null,
      thumbnail_url: draft.thumbnail_url || null,
      price: draft.enrollmentMode === "paid" ? draft.price : 0,
      level: draft.level || null,
      status,
      is_private: draft.isPrivate,
      who_for: linesToArray(draft.audienceText),
      requirements: linesToArray(draft.requirementsText),
      require_prerequisites: draft.requirePrerequisites,
    })
    .eq("id", courseId)
  if (courseError) return wrapSaveError("course details", courseError.message)

  if (sectionRows.length > 0) {
    const { error } = await supabase.from("course_sections").upsert(sectionRows, { onConflict: "id" })
    if (error) return wrapSaveError("modules", error.message)
  }

  if (lessonRows.length > 0) {
    const { error } = await supabase.from("lessons").upsert(lessonRows, { onConflict: "id" })
    if (error) return wrapSaveError("lessons", error.message)
  }

  if (resourceRows.length > 0) {
    const { error } = await supabase.from("resources").upsert(resourceRows, { onConflict: "id" })
    if (error) return wrapSaveError("resources", error.message)
  }

  if (quizRows.length > 0) {
    const { error } = await supabase.from("quizzes").upsert(quizRows, { onConflict: "id" })
    if (error) return wrapSaveError("quizzes", error.message)
  }

  if (questionRows.length > 0) {
    const { error } = await supabase.from("questions").upsert(questionRows, { onConflict: "id" })
    if (error) return wrapSaveError("questions", error.message)
  }

  if (optionRows.length > 0) {
    const { error } = await supabase.from("question_options").upsert(optionRows, { onConflict: "id" })
    if (error) return wrapSaveError("answer options", error.message)
  }

  if (prerequisitesChanged && prerequisiteRows.length > 0) {
    const { error } = await supabase
      .from("course_prerequisites")
      .upsert(prerequisiteRows, { onConflict: "course_id,prerequisite_course_id" })
    if (error) return wrapSaveError("prerequisites", error.message)
  }

  if (certificateChanged) {
    if (certificate) {
      const { error } = await supabase
        .from("course_certificate_settings")
        .upsert({ course_id: courseId, ...certificate }, { onConflict: "course_id" })
      if (error) return wrapSaveError("certificate settings", error.message)
    } else {
      const { error } = await supabase.from("course_certificate_settings").delete().eq("course_id", courseId)
      if (error) return wrapSaveError("certificate settings", error.message)
    }
  }

  if (instructorChanged) {
    const { error: deleteError } = await supabase
      .from("course_instructors")
      .delete()
      .eq("course_id", courseId)
    if (deleteError) return wrapSaveError("instructor assignment", deleteError.message)

    if (draft.instructorId) {
      const { error: insertError } = await supabase
        .from("course_instructors")
        .insert({ course_id: courseId, instructor_id: draft.instructorId })
      if (insertError) return wrapSaveError("instructor assignment", insertError.message)
    }
  }

  // ---- Phase C: deletes, child -> parent ---------------------------------

  if (deletedOptionIds.length > 0) {
    const { error } = await supabase.from("question_options").delete().in("id", deletedOptionIds)
    if (error) return { error: error.message }
  }
  if (deletedQuestionIds.length > 0) {
    const { error } = await supabase.from("questions").delete().in("id", deletedQuestionIds)
    if (error) return { error: error.message }
  }
  if (deletedResourceIds.length > 0) {
    const { error } = await supabase.from("resources").delete().in("id", deletedResourceIds)
    if (error) return { error: error.message }
  }
  if (deletedLessonIds.length > 0) {
    const { error } = await supabase.from("lessons").delete().in("id", deletedLessonIds)
    if (error) return { error: error.message }
  }
  if (deletedSectionIds.length > 0) {
    const { error } = await supabase.from("course_sections").delete().in("id", deletedSectionIds)
    if (error) return { error: error.message }
  }
  if (removedPrereqIds.length > 0) {
    const { error } = await supabase
      .from("course_prerequisites")
      .delete()
      .eq("course_id", courseId)
      .in("prerequisite_course_id", removedPrereqIds)
    if (error) return { error: error.message }
  }

  return { ok: true }
}
