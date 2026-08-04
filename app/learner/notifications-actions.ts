"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

/**
 * Mark every unread notification as read. Called when the learner opens the
 * bell dropdown -- there's no per-item read state in the UI, so this is the
 * only transition.
 *
 * No learner_id filter: the own-row UPDATE policy on notifications already
 * scopes this to the caller, and a forged id would simply match zero rows.
 */
export async function markNotificationsReadAction(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)

  if (error) {
    console.error("markNotificationsReadAction failed:", error.message)
    return { error: error.message }
  }

  // The bell lives in the learner layout, so the whole segment needs revalidating
  // for the badge to clear.
  revalidatePath("/learner", "layout")
  return {}
}
