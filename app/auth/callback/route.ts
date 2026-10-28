import { NextResponse } from "next/server"

import { resolveUserRole, roleHomePath } from "@/lib/auth/require-admin"
import { safeNextPath } from "@/lib/auth/safe-next"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Never trust ?next= as-is: it is appended to the origin below, so a value
  // like "@evil.com" would redirect off-site (open redirect).
  const next = safeNextPath(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const resolved = await resolveUserRole()
      const destination = next ?? roleHomePath(resolved?.role ?? "learner")
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
