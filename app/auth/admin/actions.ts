"use server"

import { redirect } from "next/navigation"

import { resolveAdminProfile } from "@/lib/auth/require-admin"
import { createClient } from "@/lib/supabase/server"

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/admin/login?error=${encodeURIComponent(error.message)}`)
  }

  const result = await resolveAdminProfile()
  if (result.status !== "ok") {
    await supabase.auth.signOut()
    redirect(
      `/auth/admin/login?error=${encodeURIComponent("Not authorized for the admin area")}`
    )
  }

  redirect("/admin/dashboard")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/admin/login")
}
