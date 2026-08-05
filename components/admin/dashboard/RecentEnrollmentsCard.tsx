import type { RecentEnrollment } from "@/lib/dashboard-admin"
import type { Paginated } from "@/lib/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListPagination } from "@/components/admin/ListPagination"

const PREFIX = "enroll"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function RecentEnrollmentsCard({ enrollments }: { enrollments: Paginated<RecentEnrollment> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold">Recent Enrollments</h2>
      {enrollments.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrollments yet</p>
      ) : (
        <div className="max-h-[320px] overflow-y-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 z-10 bg-muted/50 hover:bg-muted/50">
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="max-w-0 truncate font-medium">{e.learnerName}</TableCell>
                  <TableCell className="max-w-0 truncate text-muted-foreground">{e.courseTitle}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDate(e.enrolledAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ListPagination meta={enrollments} prefix={PREFIX} hidePageSize />
    </div>
  )
}
