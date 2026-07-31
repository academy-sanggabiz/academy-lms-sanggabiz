"use server"

import { revalidatePath } from "next/cache"

import {
  addPrerequisite,
  removePrerequisite,
  saveCertificateSettings,
  setRequirePrerequisites,
  type CourseCertificateSettings,
} from "@/lib/courses-admin"
import { requireAdmin } from "@/lib/auth/require-admin"

import type { ActionResult } from "./actions"

function revalidateEditPage() {
  revalidatePath("/admin/courses/[id]/edit", "page")
}

export async function setRequirePrerequisitesAction(
  courseId: string,
  value: boolean
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await setRequirePrerequisites(courseId, value)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function addPrerequisiteAction(
  courseId: string,
  prerequisiteCourseId: string
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await addPrerequisite(courseId, prerequisiteCourseId)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function removePrerequisiteAction(
  courseId: string,
  prerequisiteCourseId: string
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await removePrerequisite(courseId, prerequisiteCourseId)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function saveCertificateSettingsAction(
  courseId: string,
  input: Partial<CourseCertificateSettings>
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await saveCertificateSettings(courseId, input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}
