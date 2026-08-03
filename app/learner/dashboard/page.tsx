import { BookOpen, CheckCircle2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { getPublishedCourses } from "@/lib/courses-server"
import { getEnrolledCourseIds } from "@/lib/enrollments-server"

export default async function LearnerDashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  const [{ data: profile }, { count: completedCount }, { count: inProgressCount }, enrolledCourseIds, publishedCourses] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", claims?.sub ?? "").single(),
      supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("learner_id", claims?.sub ?? "")
        .eq("status", "completed"),
      supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("learner_id", claims?.sub ?? "")
        .eq("status", "active"),
      getEnrolledCourseIds(),
      getPublishedCourses(),
    ])

  const displayName = profile?.full_name || claims?.email || "there"
  const recommended = publishedCourses.find((c) => !enrolledCourseIds.includes(c.id))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Hi, {displayName} 👋</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card className="transition-shadow hover:shadow-[0_8px_24px_rgba(20,55,64,0.08)]">
          <CardContent>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ring">
              <BookOpen className="size-[18px]" />
              Courses in Progress
            </div>
            <div className="mt-4 text-4xl leading-none font-bold">{inProgressCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-[0_8px_24px_rgba(20,55,64,0.08)]">
          <CardContent>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-primary">
              <CheckCircle2 className="size-[18px]" />
              Completed Courses
            </div>
            <div className="mt-4 text-4xl leading-none font-bold">{completedCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card className="min-h-[280px] transition-shadow hover:shadow-[0_8px_24px_rgba(20,55,64,0.08)]">
          <CardContent>
            <div className="mb-4 text-lg font-bold">Continue Learning</div>
            <p className="pt-2 text-sm text-muted-foreground/70">No courses in progress</p>
          </CardContent>
        </Card>

        <Card className="min-h-[280px] transition-shadow hover:shadow-[0_8px_24px_rgba(20,55,64,0.08)]">
          <CardContent>
            <div className="mb-4 text-lg font-bold">Recommended Courses</div>
            {recommended ? (
              <div className="w-full max-w-[260px] overflow-hidden rounded-xl border border-border">
                <div className="flex h-[120px] items-center justify-center bg-[repeating-linear-gradient(45deg,var(--secondary),var(--secondary)_12px,var(--muted)_12px,var(--muted)_24px)] font-mono text-[11px] text-muted-foreground">
                  course thumbnail
                </div>
                <div className="p-3.5">
                  <p className="line-clamp-2 text-sm leading-snug font-semibold">
                    {recommended.title}
                  </p>
                </div>
              </div>
            ) : (
              <p className="pt-2 text-sm text-muted-foreground/70">No recommendations available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
