"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createDraftCourse,
  createInstructor,
  deleteCourse,
  deleteInstructor,
  saveCourseDraft,
  setCourseStatus,
} from "@/lib/courses-admin"
import { requireAdmin } from "@/lib/auth/require-admin"
import { courseDraftSchema, type CourseDraft } from "@/lib/course-draft"

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

function revalidateCoursePaths() {
  revalidatePath("/admin/courses")
  revalidatePath("/admin/courses/[id]/edit", "page")
  revalidatePath("/learner/courses")
  revalidatePath("/learner/courses/[id]", "page")
  revalidatePath("/learner/dashboard")
}

export async function createDraftCourseAction(): Promise<void> {
  await requireAdmin()

  const result = await createDraftCourse()
  if ("error" in result) throw new Error(result.error)

  revalidatePath("/admin/courses")
  redirect(`/admin/courses/${result.id}/edit?new=1`)
}

export async function saveCourseDraftAction(
  courseId: string,
  draft: CourseDraft,
  status: "draft" | "published"
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const parsed = courseDraftSchema.safeParse(draft)
  if (!parsed.success) {
    return { ok: false, error: "Invalid course data — please refresh and try again." }
  }

  const result = await saveCourseDraft(courseId, parsed.data, status)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateCoursePaths()
  return { ok: true, data: undefined }
}

export async function deleteCourseAction(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await deleteCourse(id)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateCoursePaths()
  return { ok: true, data: undefined }
}

export async function toggleCourseStatusAction(
  id: string,
  status: "draft" | "published"
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await setCourseStatus(id, status)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateCoursePaths()
  return { ok: true, data: undefined }
}

export async function createInstructorAction(input: {
  name: string
  title: string | null
  bio: string | null
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await createInstructor(input)
  if ("error" in result) return { ok: false, error: result.error }

  return { ok: true, data: result }
}

export async function deleteInstructorAction(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await deleteInstructor(id)
  if ("error" in result) return { ok: false, error: result.error }

  revalidatePath("/admin/courses/[id]/edit", "page")
  return { ok: true, data: undefined }
}
