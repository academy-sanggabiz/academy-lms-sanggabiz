import { redirect } from "next/navigation"

import { AdminProfileView } from "@/components/admin/AdminProfileView"
import { resolveAdminProfile } from "@/lib/auth/require-admin"
import { createClient } from "@/lib/supabase/server"

export default async function AdminProfilePage() {
  const result = await resolveAdminProfile()
  if (result.status !== "ok") redirect("/auth/admin/login")

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, created_at")
    .eq("id", result.profile.userId)
    .single()

  const name = profile?.full_name || profile?.email || "Admin"
  const email = profile?.email || ""
  const joinedYear = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear()

  return (
    <AdminProfileView name={name} email={email} joinedYear={joinedYear} role={result.profile.role} />
  )
}
