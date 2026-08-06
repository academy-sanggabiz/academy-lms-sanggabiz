"use server"

import { revalidatePath } from "next/cache"

import {
  enrollLearnerInCourse,
  searchLearners,
  unenrollLearnerFromCourse,
  type LearnerSearchResult,
} from "@/lib/learners-admin"
import { requireAdmin } from "@/lib/auth/require-admin"

import type { ActionResult } from "./actions"

/**
 * Course-centric enrollment management, for the course editor's Learners tab
 * ("from a course, pick learners"). The learner-centric inverse -- pick a
 * course for one learner -- already exists as toggleLearnerEnrollmentAction in
 * app/admin/learners/actions.ts; both delegate to the same lib functions.
 */

function revalidateRosterPaths() {
  revalidatePath("/admin/courses/[id]/edit", "page")
  revalidatePath("/admin/learners")
}

export async function searchLearnersAction(
  query: string,
  courseId?: string
): Promise<ActionResult<LearnerSearchResult[]>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const results = await searchLearners(query, courseId)
  return { ok: true, data: results }
}

export async function enrollLearnerAction(
  courseId: string,
  learnerId: string
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await enrollLearnerInCourse(learnerId, courseId)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateRosterPaths()
  return { ok: true, data: undefined }
}

export async function unenrollLearnerAction(
  courseId: string,
  learnerId: string
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await unenrollLearnerFromCourse(learnerId, courseId)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateRosterPaths()
  return { ok: true, data: undefined }
}
