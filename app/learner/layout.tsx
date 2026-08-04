import { redirect } from "next/navigation"

import { LearnerShell } from "@/components/learner/LearnerShell"
import { createClient } from "@/lib/supabase/server"
import { getNotifications } from "@/lib/notifications-server"
import { resolveUserRole, roleHomePath } from "@/lib/auth/require-admin"

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const userRole = await resolveUserRole()
  if (userRole && userRole.role !== "learner") {
    // Admin/superadmin accounts aren't also learner accounts -- send them
    // back to their own home rather than letting them browse as a learner.
    redirect(roleHomePath(userRole.role))
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  const [{ data: profile }, notifications] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", claims?.sub ?? "").single(),
    getNotifications(),
  ])

  const name = profile?.full_name || profile?.email || "there"
  const email = profile?.email || String(claims?.email ?? "")

  return (
    <LearnerShell
      name={name}
      email={email}
      notifications={notifications.items}
      unreadCount={notifications.unreadCount}
    >
      {children}
    </LearnerShell>
  )
}
