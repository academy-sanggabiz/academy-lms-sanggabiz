import Link from "next/link"

import type { TrackingEnrollment } from "@/lib/tracking-server"
import type { Paginated } from "@/lib/pagination"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListPagination } from "@/components/admin/ListPagination"

const PREFIX = "track"

export function OnlineTrackingCard({ rows }: { rows: Paginated<TrackingEnrollment> }) {
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
      {rows.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrollments yet</p>
      ) : (
        <div className="max-h-[320px] overflow-y-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 z-10 bg-muted/50 hover:bg-muted/50">
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Assignment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.rows.map((r) => (
                <TableRow key={r.enrollmentId}>
                  <TableCell className="max-w-0 truncate font-medium">{r.learnerName}</TableCell>
                  <TableCell className="max-w-0 truncate text-muted-foreground">{r.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{r.modulePct}%</TableCell>
                  <TableCell className="text-muted-foreground">{r.assignmentPct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ListPagination meta={rows} prefix={PREFIX} hidePageSize />
    </div>
  )
}
