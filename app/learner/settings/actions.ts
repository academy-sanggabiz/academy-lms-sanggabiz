"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

async function getUserId() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  return claimsData?.claims?.sub as string | undefined
}

export async function updateNotificationPref(enabled: boolean) {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ notification_email_enabled: enabled })
    .eq("id", userId)

  if (error) {
    console.error("updateNotificationPref failed:", error.message)
    return { error: error.message }
  }

  revalidatePath("/learner/settings")
  return { error: null }
}

export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function deleteAccount() {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) {
    console.error("deleteAccount failed:", error.message)
    return { error: error.message }
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
