"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function updateProfileName(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim()
  if (!fullName) return { error: "Name cannot be empty" }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: "Not authenticated" }

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId)

  if (error) {
    console.error("updateProfileName failed:", error.message)
    return { error: error.message }
  }

  revalidatePath("/learner/profile")
  revalidatePath("/learner", "layout")
  return { error: null }
}
