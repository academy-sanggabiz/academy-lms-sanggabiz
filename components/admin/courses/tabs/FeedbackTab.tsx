import { MessageSquare } from "lucide-react"

import type { Paginated } from "@/lib/pagination"
import type { CourseFeedbackEntry, CourseFeedbackSummary } from "@/lib/feedback-admin"
import { relativeTime } from "@/lib/notification-format"
import { StarRating } from "@/components/learner/StarRating"
import { ListPagination } from "@/components/admin/ListPagination"
import { ListToolbar } from "@/components/admin/ListToolbar"

const FEEDBACK_PREFIX = "feedback"

export function FeedbackTab({
  summary,
  feedback,
}: {
  summary: CourseFeedbackSummary
  feedback: Paginated<CourseFeedbackEntry>
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border p-4">
        <div>
          <div className="text-3xl font-bold">{summary.average ?? "—"}</div>
          {summary.average !== null && <StarRating value={Math.round(summary.average)} readOnly size="sm" />}
        </div>
        <div className="text-sm text-muted-foreground">
          {summary.count} review{summary.count === 1 ? "" : "s"}
        </div>
        <div className="flex flex-1 min-w-[180px] flex-col gap-1">
          {([5, 4, 3, 2, 1] as const).map((n) => {
            const count = summary.distribution[n]
            const pct = summary.count > 0 ? Math.round((count / summary.count) * 100) : 0
            return (
              <div key={n} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 text-right">{n}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {feedback.total > 0 && <ListToolbar placeholder="Search by learner name or email..." prefix={FEEDBACK_PREFIX} />}

      {feedback.rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <MessageSquare className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {feedback.total === 0 ? "No feedback yet" : "No feedback matches your search"}
          </p>
          {feedback.total === 0 && (
            <p className="max-w-[320px] text-xs text-muted-foreground">
              Learners are asked to rate the course when they complete it.
            </p>
          )}
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {feedback.rows.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold">{entry.learnerName}</span>
                    <StarRating value={entry.rating} readOnly size="sm" />
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(entry.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{entry.comment}</p>
              </li>
            ))}
          </ul>
          <ListPagination meta={feedback} prefix={FEEDBACK_PREFIX} />
        </>
      )}
    </div>
  )
}
