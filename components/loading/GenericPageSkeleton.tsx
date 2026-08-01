import { Skeleton } from "@/components/ui/skeleton"

export function GenericPageSkeleton() {
  return (
    <div className="min-h-screen bg-card">
      <div className="flex h-16 items-center justify-between border-b border-border px-6 sm:px-10">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="flex flex-col items-center gap-4 px-6 py-24">
        <Skeleton className="h-10 w-2/3 max-w-xl" />
        <Skeleton className="h-10 w-1/2 max-w-md" />
        <Skeleton className="mt-4 h-12 w-40" />
      </div>
    </div>
  )
}
