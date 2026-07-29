import { createClient } from "@/lib/supabase/server"

/** Server-only admin data access for Learner Management -- never import from a Client Component. */

export type AdminLearner = {
  id: string
  name: string
  email: string
  initial: string
  enrolledCount: number
  completedCount: number
  enrolledCourseIds: string[]
}

export type AdminLearnerStats = {
  totalLearners: number
  totalEnrollments: number
  totalCompleted: number
}

export type AdminLearnerDetail = {
  id: string
  name: string
  email: string
  initial: string
}

export type AdminLearnerCourseProgress = {
  enrollmentId: string
  courseId: string
  title: string
  thumbnailUrl: string | null
  enrolledAt: string
  completed: boolean
  pct: number
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

export async function getAdminLearnerList(): Promise<AdminLearner[]> {
  const supabase = await createClient()

  const [{ data: profiles, error: profilesError }, { data: enrollments, error: enrollmentsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "learner")
        .order("created_at", { ascending: false }),
      supabase.from("enrollments").select("learner_id, course_id, status"),
    ])

  if (profilesError || !profiles) {
    console.error("getAdminLearnerList failed:", profilesError?.message)
    return []
  }
  if (enrollmentsError) {
    console.error("getAdminLearnerList (enrollments) failed:", enrollmentsError.message)
  }

  const counts = new Map<string, { enrolled: number; completed: number; courseIds: string[] }>()
  for (const e of enrollments ?? []) {
    const entry = counts.get(e.learner_id) ?? { enrolled: 0, completed: 0, courseIds: [] }
    entry.enrolled += 1
    entry.courseIds.push(e.course_id)
    if (e.status === "completed") entry.completed += 1
    counts.set(e.learner_id, entry)
  }

  return profiles.map((p) => {
    const name = p.full_name || p.email || "Unnamed learner"
    const entry = counts.get(p.id) ?? { enrolled: 0, completed: 0, courseIds: [] }
    return {
      id: p.id,
      name,
      email: p.email ?? "",
      initial: initialOf(name),
      enrolledCount: entry.enrolled,
      completedCount: entry.completed,
      enrolledCourseIds: entry.courseIds,
    }
  })
}

export async function getAdminLearnerStats(): Promise<AdminLearnerStats> {
  const supabase = await createClient()

  const [{ count: totalLearners }, { count: totalEnrollments }, { count: totalCompleted }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "learner"),
      supabase.from("enrollments").select("*", { count: "exact", head: true }),
      supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
    ])

  return {
    totalLearners: totalLearners ?? 0,
    totalEnrollments: totalEnrollments ?? 0,
    totalCompleted: totalCompleted ?? 0,
  }
}

export async function getAdminLearnerDetail(learnerId: string): Promise<AdminLearnerDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", learnerId)
    .eq("role", "learner")
    .maybeSingle()

  if (error || !data) {
    if (error) console.error("getAdminLearnerDetail failed:", error.message)
    return null
  }

  const name = data.full_name || data.email || "Unnamed learner"
  return {
    id: data.id,
    name,
    email: data.email ?? "",
    initial: initialOf(name),
  }
}

export async function getAdminLearnerCourseProgress(
  learnerId: string
): Promise<AdminLearnerCourseProgress[]> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from("enrollments")
    .select("id, status, enrolled_at, course:courses(id, title, thumbnail_url)")
    .eq("learner_id", learnerId)
    .order("enrolled_at", { ascending: false })

  if (error || !rows) {
    if (error) console.error("getAdminLearnerCourseProgress failed:", error.message)
    return []
  }

  const enrollments = rows.map((e) => ({
    ...e,
    course: Array.isArray(e.course) ? e.course[0] : e.course,
  }))

  const courseIds = enrollments.map((e) => e.course.id)
  const enrollmentIds = enrollments.map((e) => e.id)

  const [{ data: sections }, { data: progress }] = await Promise.all([
    courseIds.length > 0
      ? supabase.from("course_sections").select("id, course_id").in("course_id", courseIds)
      : Promise.resolve({ data: [] as { id: string; course_id: string }[] }),
    enrollmentIds.length > 0
      ? supabase
          .from("lesson_progress")
          .select("enrollment_id")
          .in("enrollment_id", enrollmentIds)
          .eq("completed", true)
      : Promise.resolve({ data: [] as { enrollment_id: string }[] }),
  ])

  const sectionToCourse = new Map((sections ?? []).map((s) => [s.id, s.course_id]))
  const sectionIds = [...sectionToCourse.keys()]

  const { data: lessons } =
    sectionIds.length > 0
      ? await supabase.from("lessons").select("id, section_id").in("section_id", sectionIds)
      : { data: [] as { id: string; section_id: string }[] }

  const totalLessonsByCourse = new Map<string, number>()
  for (const l of lessons ?? []) {
    const courseId = sectionToCourse.get(l.section_id)
    if (!courseId) continue
    totalLessonsByCourse.set(courseId, (totalLessonsByCourse.get(courseId) ?? 0) + 1)
  }

  const completedByEnrollment = new Map<string, number>()
  for (const p of progress ?? []) {
    completedByEnrollment.set(p.enrollment_id, (completedByEnrollment.get(p.enrollment_id) ?? 0) + 1)
  }

  return enrollments.map((e) => {
    const total = totalLessonsByCourse.get(e.course.id) ?? 0
    const done = completedByEnrollment.get(e.id) ?? 0
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return {
      enrollmentId: e.id,
      courseId: e.course.id,
      title: e.course.title,
      thumbnailUrl: e.course.thumbnail_url,
      enrolledAt: e.enrolled_at,
      completed: e.status === "completed" || (total > 0 && done >= total),
      pct,
    }
  })
}

export async function enrollLearnerInCourse(
  learnerId: string,
  courseId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("enrollments")
    .upsert({ learner_id: learnerId, course_id: courseId }, { onConflict: "learner_id,course_id" })

  if (error) {
    console.error("enrollLearnerInCourse failed:", error.message)
    return { error: error.message }
  }
  return { ok: true }
}

export async function unenrollLearnerFromCourse(
  learnerId: string,
  courseId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("learner_id", learnerId)
    .eq("course_id", courseId)

  if (error) {
    console.error("unenrollLearnerFromCourse failed:", error.message)
    return { error: error.message }
  }
  return { ok: true }
}
