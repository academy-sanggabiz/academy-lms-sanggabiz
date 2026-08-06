import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function GradingBreadcrumb({ courseTitle }: { courseTitle: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      <Link
        href="/admin/grading"
        className="flex items-center gap-1 font-medium text-foreground hover:underline"
      >
        <ChevronLeft className="size-4" />
        Back to Grading
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <Link href="/admin/grading" className="hover:text-foreground hover:underline">
          Grading
        </Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="font-medium text-foreground">{courseTitle}</span>
      </div>
    </div>
  )
}
