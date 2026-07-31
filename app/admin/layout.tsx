import { redirect } from "next/navigation"

import { AdminShell } from "@/components/admin/AdminShell"
import { resolveAdminProfile } from "@/lib/auth/require-admin"
import { createClient } from "@/lib/supabase/server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const result = await resolveAdminProfile()

  if (result.status === "unauthenticated") {
    redirect("/auth/admin/login")
  }
  if (result.status === "unauthorized") {
    redirect("/auth/admin/login?error=Not authorized for the admin area")
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", result.profile.userId)
    .single()

  const name = profile?.full_name || profile?.email || "Admin"

  return (
    <AdminShell name={name} role={result.profile.role}>
      {children}
    </AdminShell>
  )
}
