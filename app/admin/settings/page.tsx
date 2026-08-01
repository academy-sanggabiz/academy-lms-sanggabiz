import { redirect } from "next/navigation"

import { AdminSettingsView } from "@/components/admin/AdminSettingsView"
import { resolveAdminProfile } from "@/lib/auth/require-admin"
import { createClient } from "@/lib/supabase/server"

export default async function AdminSettingsPage() {
  const result = await resolveAdminProfile()
  if (result.status !== "ok") redirect("/auth/login")

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_email_enabled")
    .eq("id", result.profile.userId)
    .single()

  return <AdminSettingsView notificationEmailEnabled={profile?.notification_email_enabled ?? true} />
}
