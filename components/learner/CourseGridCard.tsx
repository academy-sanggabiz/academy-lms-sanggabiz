import Link from "next/link"
import { BookOpen, Clock, Eye, Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EnrollButton } from "@/components/learner/EnrollButton"
import { formatCourseAccess, type Course } from "@/lib/courses"
import { cn } from "@/lib/utils"

export function CourseGridCard({
  course,
  enrolled,
  started,
}: {
  course: Course
  enrolled: boolean
  started: boolean
}) {
  const price = formatCourseAccess(course)

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(20,55,64,0.08)]">
      <Link href={`/learner/courses/${course.id}`} className="block">
        <div
          className={cn(
            "relative mb-4 flex h-[190px] items-center justify-center overflow-hidden rounded-md font-mono text-xs text-muted-foreground",
            !course.thumbnail_url && "course-thumb-placeholder"
          )}
        >
          {course.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            "course thumbnail"
          )}
          <span className="absolute top-3 right-3 rounded-full bg-ring px-3 py-1 text-xs font-semibold text-white">
            {price}
          </span>
        </div>

        <div className="mb-3 line-clamp-2 min-h-[46px] text-[17px] leading-snug font-bold">
          {course.title}
        </div>
      </Link>

      <div className="mb-3 flex flex-wrap gap-4 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BookOpen className="size-3.5" />
          {course.lesson_count} lessons
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {course.duration_hours} hours
        </span>
        <span className="flex items-center gap-1.5">
          <Tag className="size-3.5" />
          {price}
        </span>
      </div>

      <div className="mb-4 min-h-0 flex-1">
        {course.description && (
          <p className="line-clamp-3 text-[13.5px] leading-relaxed text-muted-foreground">
            {course.description}
          </p>
        )}
      </div>

      <div className="mt-auto flex gap-3">
        <Button
          variant="outline"
          className="h-11 flex-1"
          render={<Link href={`/learner/courses/${course.id}`} />}
          nativeButton={false}
        >
          <Eye className="size-3.5" />
          Preview
        </Button>
        <EnrollButton
          courseId={course.id}
          state={!enrolled ? "not_enrolled" : started ? "in_progress" : "not_started"}
          className="h-11 flex-1"
        />
      </div>
    </div>
  )
}
