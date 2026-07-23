import { cn } from "@/lib/utils"
import type { MockCourse } from "@/lib/mock-courses"

export function CourseCard({
  course,
  className,
}: {
  course: MockCourse
  className?: string
}) {
  return (
    <div
      className={cn(
        "cursor-pointer rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_10px_28px_rgba(20,55,64,0.1)]",
        className
      )}
    >
      <div className="course-thumb-placeholder relative mb-4 flex h-[180px] items-center justify-center rounded-md font-mono text-xs text-muted-foreground">
        course thumbnail
        <span className="absolute top-3 right-3 rounded-full bg-ring px-3 py-1 text-xs font-semibold text-white">
          {course.price}
        </span>
      </div>
      <div className="mb-2.5 min-h-[46px] text-base leading-snug font-bold">
        {course.title}
      </div>
      <div className="text-[13px] text-muted-foreground">
        {course.lessons} lessons · {course.hours} hours
      </div>
    </div>
  )
}
