import { Skeleton } from "@/components/ui/skeleton"

export function CourseEditorSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3.5">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-7 w-64" />
      </div>

      <div className="mb-6 flex gap-2">
        {["Basic Info", "Lessons", "Settings", "Preview"].map((label) => (
          <Skeleton key={label} className="h-9 w-28 rounded-md" />
        ))}
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-card p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  )
}
