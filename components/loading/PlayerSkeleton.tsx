import { Skeleton } from "@/components/ui/skeleton"

export function PlayerSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3.5 border-b border-border bg-card px-5">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-4 w-48" />
        <div className="ml-auto flex items-center gap-2.5">
          <Skeleton className="h-1.5 w-32 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
          <Skeleton className="aspect-video w-full max-w-3xl rounded-lg" />
          <Skeleton className="h-6 w-2/3 max-w-xl" />
          <Skeleton className="h-4 w-1/2 max-w-md" />
        </div>

        <aside className="flex w-[360px] shrink-0 flex-col gap-px border-l border-border bg-card p-3">
          <div className="flex gap-2 border-b border-muted pb-2">
            <Skeleton className="h-8 w-28 rounded-t-lg" />
            <Skeleton className="h-8 w-28 rounded-t-lg" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mt-2 h-12 w-full rounded-md" />
          ))}
        </aside>
      </div>
    </div>
  )
}
