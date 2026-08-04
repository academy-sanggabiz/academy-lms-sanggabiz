import { ClipboardCheck } from "lucide-react"

import { getGradingStats, listGradingCourses } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { StatCard } from "@/components/admin/StatCard"
import { GradingCoursesClient } from "@/components/admin/grading/GradingCoursesClient"

export default async function AdminGradingPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  await requireAdmin()

  const raw = await searchParams
  const params = parseListParams<Record<string, never>>(raw, {
    sortable: ["course_title"],
    defaultSort: "course_title",
    defaultDir: "asc",
  })

  const [page, stats] = await Promise.all([listGradingCourses(params), getGradingStats()])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">Grading</h1>
        <p className="text-sm text-muted-foreground">
          Review and score questions that can&apos;t be graded automatically
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={ClipboardCheck} label="Attempts Pending Review" value={stats.attemptCount} />
        <StatCard icon={ClipboardCheck} label="Courses Affected" value={stats.courseCount} />
      </div>

      <GradingCoursesClient page={page} />
    </div>
  )
}
