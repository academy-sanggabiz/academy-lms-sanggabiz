"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { signupSchema } from "@/components/auth/schema"

export type SignupState =
  | { error: string }
  | { status: "check-email"; email: string }
  | null

// Login/logout were consolidated into the single role-routing page at
// /auth/login (see app/auth/login/actions.ts). Signup stays here because new
// signups are always learners.
export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const fullName = String(formData.get("fullName") ?? "")
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")
  const captchaToken = String(formData.get("captchaToken") ?? "")

  const parsed = signupSchema.safeParse({ fullName, email, password, confirmPassword })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const origin = (await headers()).get("origin")
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback`,
      captchaToken,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // With email confirmation off, signUp returns a live session immediately --
  // keep the original straight-to-dashboard behavior in that case. Otherwise
  // there's no session yet, so tell the learner to confirm via email.
  if (data.session) {
    redirect("/learner/dashboard")
  }

  return { status: "check-email", email }
}
