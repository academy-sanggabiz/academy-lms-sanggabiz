import { notFound } from "next/navigation"

import { getQuizGradingAttempts } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { GradingAttemptsClient } from "@/components/admin/grading/GradingAttemptsClient"
import { GradingBreadcrumb } from "@/components/admin/grading/GradingBreadcrumb"

export default async function AdminGradingQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>
}) {
  await requireAdmin()
  const { quizId } = await params
  const result = await getQuizGradingAttempts(quizId)
  if (!result) notFound()

  return (
    <div>
      <GradingBreadcrumb
        courseId={result.courseId}
        courseTitle={result.courseTitle}
        quizId={result.quizId}
        quizTitle={result.quizTitle}
      />
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">{result.quizTitle}</h1>
        <p className="text-sm text-muted-foreground">{result.lessonTitle} · Learners awaiting manual grading</p>
      </div>

      <GradingAttemptsClient quizId={result.quizId} attempts={result.attempts} />
    </div>
  )
}
