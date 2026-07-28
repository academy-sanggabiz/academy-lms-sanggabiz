import { SettingsView } from "@/components/learner/SettingsView"
import { createClient } from "@/lib/supabase/server"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub ?? ""

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_email_enabled, currency")
    .eq("id", userId)
    .single()

  return (
    <SettingsView
      notificationEmailEnabled={profile?.notification_email_enabled ?? true}
      currency={profile?.currency ?? "USD"}
    />
  )
}
