"use server"

import { redirect } from "next/navigation"

import { resolveUserRole, roleHomePath } from "@/lib/auth/require-admin"
import { authErrorMessage } from "@/lib/auth/auth-error-message"
import { createClient } from "@/lib/supabase/server"

export type LoginState = { error: string } | null

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const captchaToken = String(formData.get("captchaToken") ?? "")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  })

  if (error) {
    return { error: authErrorMessage(error.message) }
  }

  const resolved = await resolveUserRole()
  if (!resolved) {
    // Signed in but no resolvable session — bail out safely.
    await supabase.auth.signOut()
    return { error: "Akun Anda tidak dapat dikenali" }
  }

  redirect(roleHomePath(resolved.role))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
