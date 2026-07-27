import { LearnerShell } from "@/components/learner/LearnerShell"
import { createClient } from "@/lib/supabase/server"

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", claims?.sub ?? "")
    .single()

  const name = profile?.full_name || profile?.email || "there"
  const email = profile?.email || String(claims?.email ?? "")

  return (
    <LearnerShell name={name} email={email}>
      {children}
    </LearnerShell>
  )
}
