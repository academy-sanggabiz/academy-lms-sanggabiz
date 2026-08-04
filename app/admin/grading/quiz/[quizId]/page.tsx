import { notFound } from "next/navigation"

import { getQuizGradingAttempts } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { GradingAttemptsClient } from "@/components/admin/grading/GradingAttemptsClient"
import { GradingBreadcrumb } from "@/components/admin/grading/GradingBreadcrumb"

export default async function AdminGradingQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>
  searchParams: Promise<RawSearchParams>
}) {
  await requireAdmin()
  const [{ quizId }, raw] = await Promise.all([params, searchParams])

  const listParams = parseListParams<Record<string, never>>(raw, {
    sortable: ["submitted_at"],
    defaultSort: "submitted_at",
    defaultDir: "desc",
  })

  const result = await getQuizGradingAttempts(quizId, listParams)
  if (!result || !result.courseId) notFound()

  return (
    <div>
      <GradingBreadcrumb
        courseId={result.courseId}
        courseTitle={result.courseTitle ?? "Untitled course"}
        quizId={result.quizId}
        quizTitle={result.quizTitle ?? "Untitled quiz"}
      />
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">{result.quizTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {result.lessonTitle} · Learners awaiting manual grading
        </p>
      </div>

      <GradingAttemptsClient quizId={result.quizId} page={result.attempts} />
    </div>
  )
}
