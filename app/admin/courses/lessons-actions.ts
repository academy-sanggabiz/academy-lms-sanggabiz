"use server"

import { revalidatePath } from "next/cache"

import {
  createLesson,
  createResource,
  createSection,
  deleteLesson,
  deleteResource,
  deleteSection,
  duplicateLesson,
  renameSection,
  reorderLessons,
  updateLesson,
  updateResource,
} from "@/lib/courses-admin"
import type { LessonContentType } from "@/lib/courses"
import { requireAdmin } from "@/lib/auth/require-admin"

import type { ActionResult } from "./actions"

function revalidateEditPage() {
  revalidatePath("/admin/courses/[id]/edit", "page")
}

export async function createLessonAction(
  courseId: string,
  sectionId: string | null,
  input: { title: string; content_type: LessonContentType; duration_seconds: number | null }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await createLesson(courseId, sectionId, input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: result }
}

export async function createSectionAction(
  courseId: string,
  title: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await createSection(courseId, title)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: result }
}

export async function renameSectionAction(id: string, title: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await renameSection(id, title)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function deleteSectionAction(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await deleteSection(id)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function updateLessonAction(
  id: string,
  input: Partial<{
    title: string
    content_type: LessonContentType
    video_url: string | null
    content: string | null
    duration_seconds: number | null
  }>
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await updateLesson(id, input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function deleteLessonAction(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await deleteLesson(id)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function duplicateLessonAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await duplicateLesson(id)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: result }
}

export async function reorderLessonsAction(
  sections: { id: string; lessonIds: string[] }[]
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await reorderLessons(sections)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function createResourceAction(
  lessonId: string,
  input: { title: string; file_url: string; type: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await createResource(lessonId, input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: result }
}

export async function updateResourceAction(
  id: string,
  input: Partial<{ title: string; file_url: string; type: string }>
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await updateResource(id, input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function deleteResourceAction(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await deleteResource(id)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}
