import { cn } from "@/lib/utils"
import { formatCourseAccess, type Course } from "@/lib/courses"

export function CourseCard({
  course,
  className,
}: {
  course: Course
  className?: string
}) {
  return (
    <div
      className={cn(
        "cursor-pointer rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_10px_28px_rgba(20,55,64,0.1)]",
        className
      )}
    >
      <div
        className={cn(
          "relative mb-4 flex h-[180px] items-center justify-center overflow-hidden rounded-md font-mono text-xs text-muted-foreground",
          !course.thumbnail_url && "course-thumb-placeholder"
        )}
      >
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          "course thumbnail"
        )}
        <span className="absolute top-3 right-3 rounded-full bg-ring px-3 py-1 text-xs font-semibold text-white">
          {formatCourseAccess(course)}
        </span>
      </div>
      <div className="mb-2.5 min-h-[46px] text-base leading-snug font-bold">
        {course.title}
      </div>
      <div className="text-[13px] text-muted-foreground">
        {course.lesson_count} lessons · {course.duration_hours} hours
      </div>
    </div>
  )
}
