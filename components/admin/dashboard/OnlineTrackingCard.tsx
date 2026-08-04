import Link from "next/link"

import type { TrackingEnrollment } from "@/lib/tracking-server"
import { Button } from "@/components/ui/button"

export function OnlineTrackingCard({ rows }: { rows: TrackingEnrollment[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Online Tracking</h2>
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/admin/tracking" />}
          nativeButton={false}
        >
          View All
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrollments yet</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-3 border-b border-border bg-muted/50 px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Learner</div>
            <div>Course</div>
            <div>Module</div>
            <div>Assignment</div>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {rows.map((r) => (
              <div
                key={r.enrollmentId}
                className="grid grid-cols-[2fr_2fr_1fr_1fr] items-center gap-3 border-b border-border px-3 py-3 text-sm last:border-b-0"
              >
                <div className="min-w-0 truncate font-medium">{r.learnerName}</div>
                <div className="min-w-0 truncate text-muted-foreground">{r.courseTitle}</div>
                <div className="text-muted-foreground">{r.modulePct}%</div>
                <div className="text-muted-foreground">{r.assignmentPct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
