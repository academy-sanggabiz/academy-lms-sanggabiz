import { NextResponse } from "next/server"

import { resolveUserRole, roleHomePath } from "@/lib/auth/require-admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next")
  const oauthError = searchParams.get("error")
  const oauthErrorDescription = searchParams.get("error_description")

  if (oauthError) {
    const message = oauthErrorDescription ?? oauthError
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?message=${encodeURIComponent(message)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const resolved = await resolveUserRole()
      const destination = next ?? roleHomePath(resolved?.role ?? "learner")
      return NextResponse.redirect(`${origin}${destination}`)
    }
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?message=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
