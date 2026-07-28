import { ProfileView } from "@/components/learner/ProfileView"
import { getEnrolledCoursesWithDetails } from "@/lib/enrollments-server"
import { createClient } from "@/lib/supabase/server"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub ?? ""

  const [{ data: profile }, enrolledCourses] = await Promise.all([
    supabase.from("profiles").select("full_name, email, created_at").eq("id", userId).single(),
    getEnrolledCoursesWithDetails(),
  ])

  const name = profile?.full_name || profile?.email || "there"
  const email = profile?.email || ""
  const joinedYear = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear()

  return (
    <ProfileView
      name={name}
      email={email}
      joinedYear={joinedYear}
      enrolledCourses={enrolledCourses}
    />
  )
}
