import { redirect } from "next/navigation"

import { resolveSuperAdminProfile } from "@/lib/auth/require-admin"
import { getLandingContent } from "@/lib/landing-server"
import { getPublishedCourses } from "@/lib/courses-server"
import { LandingForm } from "@/components/admin/landing/LandingForm"

export default async function AdminLandingPage() {
  const result = await resolveSuperAdminProfile()

  // AdminLayout already redirects unauthenticated/non-admin sessions; a
  // signed-in admin who isn't superadmin lands here only via a direct URL.
  if (result.status !== "ok") {
    redirect("/admin/dashboard")
  }

  const [content, courses] = await Promise.all([getLandingContent(), getPublishedCourses()])
  const availableCourses = courses.map((c) => ({ id: c.id, title: c.title }))

  return <LandingForm content={content} availableCourses={availableCourses} />
}
