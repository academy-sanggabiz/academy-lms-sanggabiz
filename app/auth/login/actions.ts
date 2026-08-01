"use server"

import { redirect } from "next/navigation"

import { resolveUserRole, roleHomePath } from "@/lib/auth/require-admin"
import { createClient } from "@/lib/supabase/server"

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  const resolved = await resolveUserRole()
  if (!resolved) {
    // Signed in but no resolvable session — bail out safely.
    await supabase.auth.signOut()
    redirect(`/auth/login?error=${encodeURIComponent("Could not resolve your account")}`)
  }

  redirect(roleHomePath(resolved.role))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
