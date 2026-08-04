import { notFound } from "next/navigation"

import { getCourseGradingQuizzes } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { GradingQuizzesClient } from "@/components/admin/grading/GradingQuizzesClient"
import { GradingBreadcrumb } from "@/components/admin/grading/GradingBreadcrumb"

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
    sortable: ["quiz_title"],
    defaultSort: "quiz_title",
    defaultDir: "asc",
  })

  const result = await getCourseGradingQuizzes(courseId, listParams)
  if (!result) notFound()

  return (
    <div>
      <GradingBreadcrumb courseId={result.courseId} courseTitle={result.courseTitle} />
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">{result.courseTitle}</h1>
        <p className="text-sm text-muted-foreground">Quizzes with attempts awaiting manual grading</p>
      </div>

      <GradingQuizzesClient courseId={result.courseId} page={result.quizzes} />
    </div>
  )
}
