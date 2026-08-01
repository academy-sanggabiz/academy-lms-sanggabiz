"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

// Login/logout were consolidated into the single role-routing page at
// /auth/login (see app/auth/login/actions.ts). Signup stays here because new
// signups are always learners.
export async function signup(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "")
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  const origin = (await headers()).get("origin")
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/auth/learner/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/learner/dashboard")
}
