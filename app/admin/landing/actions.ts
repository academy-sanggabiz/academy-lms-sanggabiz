"use server"

import { revalidatePath } from "next/cache"

import { requireSuperAdmin } from "@/lib/auth/require-admin"
import { saveLandingContent } from "@/lib/landing-server"
import type { LandingContent } from "@/lib/landing"

import type { ActionResult } from "@/app/admin/courses/actions"

export async function saveLandingContentAction(
  input: LandingContent
): Promise<ActionResult<undefined>> {
  try {
    await requireSuperAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await saveLandingContent(input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidatePath("/", "page")
  revalidatePath("/admin/landing", "page")
  return { ok: true, data: undefined }
}
