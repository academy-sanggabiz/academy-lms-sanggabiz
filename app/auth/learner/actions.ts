"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/learner/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/learner/dashboard")
}

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

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
