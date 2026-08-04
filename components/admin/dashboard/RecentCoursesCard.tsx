import type { Course } from "@/lib/courses"
import type { Paginated } from "@/lib/pagination"
import { Badge } from "@/components/ui/badge"
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
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border bg-muted/50 px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Title</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {courses.rows.map((c) => {
              const isPublished = c.status === "published"
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border px-3 py-3 text-sm last:border-b-0"
                >
                  <div className="min-w-0 truncate font-medium">{c.title}</div>
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
                  <div className="shrink-0 text-xs text-muted-foreground">{formatDate(c.created_at)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <ListPagination meta={courses} prefix={PREFIX} hidePageSize />
    </div>
  )
}
