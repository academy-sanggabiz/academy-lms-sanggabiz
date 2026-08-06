"use server"

import { revalidatePath } from "next/cache"

import {
  enrollLearnerInCourse,
  getLearnerEnrolledCourseIds,
  unenrollLearnerFromCourse,
} from "@/lib/learners-admin"
import { requireAdmin } from "@/lib/auth/require-admin"

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

export async function getLearnerEnrolledCourseIdsAction(learnerId: string): Promise<ActionResult<string[]>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const ids = await getLearnerEnrolledCourseIds(learnerId)
  return { ok: true, data: ids }
}

export async function toggleLearnerEnrollmentAction(
  learnerId: string,
  courseId: string,
  enroll: boolean
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = enroll
    ? await enrollLearnerInCourse(learnerId, courseId)
    : await unenrollLearnerFromCourse(learnerId, courseId)

  if ("error" in result) return { ok: false, error: result.error }

  revalidatePath("/admin/learners")
  revalidatePath("/admin/learners/[id]", "page")
  return { ok: true, data: undefined }
}
