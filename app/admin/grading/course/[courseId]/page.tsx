import { notFound } from "next/navigation"

import { getCourseGradingQuizzes } from "@/lib/grading-server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { GradingQuizzesClient } from "@/components/admin/grading/GradingQuizzesClient"
import { GradingBreadcrumb } from "@/components/admin/grading/GradingBreadcrumb"

export default async function AdminGradingCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  await requireAdmin()
  const { courseId } = await params
  const result = await getCourseGradingQuizzes(courseId)
  if (!result) notFound()

  return (
    <div>
      <GradingBreadcrumb courseId={result.courseId} courseTitle={result.courseTitle} />
      <div className="mb-6">
        <h1 className="text-[30px] font-bold">{result.courseTitle}</h1>
        <p className="text-sm text-muted-foreground">Quizzes with attempts awaiting manual grading</p>
      </div>

      <GradingQuizzesClient courseId={result.courseId} courseTitle={result.courseTitle} quizzes={result.quizzes} />
    </div>
  )
}
