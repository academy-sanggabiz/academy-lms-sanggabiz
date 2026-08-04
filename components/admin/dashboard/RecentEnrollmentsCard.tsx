import type { RecentEnrollment } from "@/lib/dashboard-admin"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function RecentEnrollmentsCard({ enrollments }: { enrollments: RecentEnrollment[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold">Recent Enrollments</h2>
      {enrollments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrollments yet</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-border bg-muted/50 px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Learner</div>
            <div>Course</div>
            <div>Date</div>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {enrollments.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 border-b border-border px-3 py-3 text-sm last:border-b-0"
              >
                <div className="min-w-0 truncate font-medium">{e.learnerName}</div>
                <div className="min-w-0 truncate text-muted-foreground">{e.courseTitle}</div>
                <div className="shrink-0 text-xs text-muted-foreground">{formatDate(e.enrolledAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
