import { ClipboardCheck } from "lucide-react"

import { listGradingCourses } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { StatCard } from "@/components/admin/StatCard"
import { GradingCoursesClient } from "@/components/admin/grading/GradingCoursesClient"

export default async function AdminGradingPage() {
  await requireAdmin()
  const courses = await listGradingCourses()
  const attemptCount = courses.reduce((sum, c) => sum + c.attemptCount, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">Grading</h1>
        <p className="text-sm text-muted-foreground">
          Review and score questions that can&apos;t be graded automatically
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={ClipboardCheck} label="Attempts Pending Review" value={attemptCount} />
        <StatCard icon={ClipboardCheck} label="Courses Affected" value={courses.length} />
      </div>

      <GradingCoursesClient courses={courses} />
    </div>
  )
}
