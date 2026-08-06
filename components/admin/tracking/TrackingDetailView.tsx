import { CheckCircle2, Circle } from "lucide-react"

import type { TrackingDetail } from "@/lib/tracking-server"
import { Badge } from "@/components/ui/badge"

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function QuizStatusBadge({ quiz }: { quiz: TrackingDetail["quizzes"][number] }) {
  if (quiz.status === "not_started") {
    return <Badge variant="outline">Not started</Badge>
  }
  if (quiz.status === "in_progress") {
    return <Badge variant="outline">In progress</Badge>
  }
  if (quiz.status === "pending_review") {
    return <Badge className="bg-draft-background text-foreground">Pending review</Badge>
  }
  return (
    <Badge
      className={
        quiz.passed
          ? "bg-success text-success-foreground"
          : "bg-destructive/10 text-destructive"
      }
    >
      {quiz.passed ? "Passed" : "Failed"}
    </Badge>
  )
}

export function TrackingDetailView({ detail }: { detail: TrackingDetail }) {
  const sections = new Map<string, typeof detail.lessons>()
  for (const lesson of detail.lessons) {
    const list = sections.get(lesson.sectionTitle) ?? []
    list.push(lesson)
    sections.set(lesson.sectionTitle, list)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h1 className="text-xl font-bold">{detail.learnerName}</h1>
        <p className="text-sm text-muted-foreground">{detail.learnerEmail}</p>
        <p className="mt-1 text-sm font-medium">{detail.courseTitle}</p>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <div className="text-muted-foreground">Module Completion</div>
            <div className="text-lg font-bold">{detail.modulePct}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Assignment Completion</div>
            <div className="text-lg font-bold">{detail.assignmentPct}%</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Modules</h2>
        {sections.size === 0 ? (
          <p className="text-sm text-muted-foreground">No lessons in this course yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...sections.entries()].map(([sectionTitle, lessons]) => (
              <div key={sectionTitle}>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">{sectionTitle}</div>
                <div className="flex flex-col gap-1.5">
                  {lessons.map((lesson) => (
                    <div key={lesson.lessonId} className="flex items-center gap-2 text-sm">
                      {lesson.completed ? (
                        <CheckCircle2 className="size-4 shrink-0 text-success-foreground" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className={lesson.completed ? "" : "text-muted-foreground"}>{lesson.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Quizzes</h2>
        {detail.quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quizzes in this course.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 border-b border-border bg-muted/50 px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
              <div>Quiz</div>
              <div>Status</div>
              <div>Score</div>
              <div>Submitted</div>
            </div>
            {detail.quizzes.map((quiz) => (
              <div
                key={quiz.quizId}
                className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-3 border-b border-border px-3 py-3 text-sm last:border-b-0"
              >
                <div className="min-w-0 truncate font-medium">{quiz.quizTitle}</div>
                <div>
                  <QuizStatusBadge quiz={quiz} />
                </div>
                <div className="text-muted-foreground">{quiz.score !== null ? quiz.score : "—"}</div>
                <div className="text-muted-foreground">{formatDate(quiz.submittedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
