import { notFound } from "next/navigation"

import { getCourseGradingMatrix } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { Button } from "@/components/ui/button"
import { GradingCourseMatrix } from "@/components/admin/grading/GradingCourseMatrix"
import { GradingBreadcrumb } from "@/components/admin/grading/GradingBreadcrumb"
import { ImportGradesDialog } from "@/components/admin/grading/ImportGradesDialog"

export default async function AdminGradingCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<RawSearchParams>
}) {
  await requireAdmin()
  const [{ courseId }, raw] = await Promise.all([params, searchParams])

  const listParams = parseListParams<Record<string, never>>(raw, {
    sortable: ["learner"],
    defaultSort: "learner",
    defaultDir: "asc",
    defaultPageSize: 10,
  })

  const matrix = await getCourseGradingMatrix(courseId, listParams)
  if (!matrix) notFound()

  return (
    <div>
      <GradingBreadcrumb courseTitle={matrix.courseTitle} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold">{matrix.courseTitle}</h1>
          <p className="text-sm text-muted-foreground">
            Essay and case study submissions (PDF) — click a cell to enter a grade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            render={<a href={`/admin/grading/export?courseId=${courseId}`} />}
            nativeButton={false}
          >
            Export Course CSV
          </Button>
          <ImportGradesDialog />
        </div>
      </div>

      <GradingCourseMatrix matrix={matrix} />
    </div>
  )
}
