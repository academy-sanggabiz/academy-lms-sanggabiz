import { redirect } from "next/navigation"

import { AdminShell } from "@/components/admin/AdminShell"
import { resolveAdminProfile } from "@/lib/auth/require-admin"
import { createClient } from "@/lib/supabase/server"
import { getNotifications } from "@/lib/notifications-server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const result = await resolveAdminProfile()

  if (result.status === "unauthenticated") {
    redirect("/auth/login")
  }
  if (result.status === "unauthorized") {
    redirect("/auth/login?error=Not authorized for the admin area")
  }

  const supabase = await createClient()
  const [{ data: profile }, notifications] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", result.profile.userId).single(),
    getNotifications(5),
  ])

  const name = profile?.full_name || profile?.email || "Admin"

  return (
    <AdminShell
      name={name}
      role={result.profile.role}
      notifications={notifications.items}
      unreadCount={notifications.unreadCount}
    >
      {children}
    </AdminShell>
  )
}
