import { notFound } from "next/navigation"

import { getAttemptGradingDetail } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { AttemptGradingForm } from "@/components/admin/grading/AttemptGradingForm"
import { GradingBreadcrumb } from "@/components/admin/grading/GradingBreadcrumb"

export default async function AdminGradingAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  await requireAdmin()
  const { attemptId } = await params
  const detail = await getAttemptGradingDetail(attemptId)
  if (!detail) notFound()

  return (
    <div>
      <GradingBreadcrumb
        courseId={detail.courseId}
        courseTitle={detail.courseTitle}
        quizId={detail.quizId}
        quizTitle={detail.quizTitle}
        isAttempt
      />
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">{detail.quizTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {detail.courseTitle} · {detail.lessonTitle} · {detail.learnerName} ({detail.learnerEmail})
        </p>
      </div>

      <AttemptGradingForm detail={detail} />
    </div>
  )
}
