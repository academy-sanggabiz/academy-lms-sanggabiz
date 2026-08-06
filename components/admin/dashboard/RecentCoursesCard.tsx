import type { Course } from "@/lib/courses"
import type { Paginated } from "@/lib/pagination"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListPagination } from "@/components/admin/ListPagination"

const PREFIX = "course"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function RecentCoursesCard({ courses }: { courses: Paginated<Course> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold">Recent Courses</h2>
      {courses.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses yet</p>
      ) : (
        <div className="max-h-[320px] overflow-y-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 z-10 bg-muted/50 hover:bg-muted/50">
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.rows.map((c) => {
                const isPublished = c.status === "published"
                return (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-0 truncate font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={isPublished ? "default" : "outline"}
                        className={
                          isPublished
                            ? "bg-success text-success-foreground"
                            : "border-pill-border bg-draft-background text-destructive"
                        }
                      >
                        {isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <ListPagination meta={courses} prefix={PREFIX} hidePageSize />
    </div>
  )
}
