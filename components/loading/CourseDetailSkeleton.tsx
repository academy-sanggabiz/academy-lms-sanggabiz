import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CourseDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-7 w-72" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6 min-w-0">
          <Card>
            <CardContent>
              <Skeleton className="mb-3.5 h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Skeleton className="mb-4 h-6 w-40" />
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4">
              <Skeleton className="size-16 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Skeleton className="mb-4 h-[180px] w-full rounded-md" />
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-md" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
