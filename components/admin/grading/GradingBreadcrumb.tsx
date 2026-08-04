import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function GradingBreadcrumb({
  courseId,
  courseTitle,
  quizId,
  quizTitle,
  isAttempt,
}: {
  courseId: string
  courseTitle: string
  quizId?: string
  quizTitle?: string
  /** true on the attempt-grading page (level 4), so quizTitle becomes a link back to level 3 */
  isAttempt?: boolean
}) {
  const backHref =
    quizId && quizTitle
      ? isAttempt
        ? `/admin/grading/quiz/${quizId}`
        : `/admin/grading/course/${courseId}`
      : "/admin/grading"

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      <Link
        href={backHref}
        className="flex items-center gap-1 font-medium text-foreground hover:underline"
      >
        <ChevronLeft className="size-4" />
        Back
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <Link href="/admin/grading" className="hover:text-foreground hover:underline">
          Grading
        </Link>
        <ChevronRight className="size-3.5 shrink-0" />
        {quizId && quizTitle ? (
          <Link href={`/admin/grading/course/${courseId}`} className="hover:text-foreground hover:underline">
            {courseTitle}
          </Link>
        ) : (
          <span className="font-medium text-foreground">{courseTitle}</span>
        )}
        {quizId && quizTitle && (
          <>
            <ChevronRight className="size-3.5 shrink-0" />
            {isAttempt ? (
              <Link href={`/admin/grading/quiz/${quizId}`} className="hover:text-foreground hover:underline">
                {quizTitle}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{quizTitle}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
