import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function LearnerHomeSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-9 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="min-h-[280px]">
            <CardContent>
              <Skeleton className="mb-4 h-6 w-40" />
              <Skeleton className="h-[140px] w-full max-w-[260px] rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
