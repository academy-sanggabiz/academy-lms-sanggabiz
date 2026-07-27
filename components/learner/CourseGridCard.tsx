import Link from "next/link"
import { BookOpen, Clock, Tag } from "lucide-react"

import { formatPrice, type Course } from "@/lib/courses"

export function CourseGridCard({ course }: { course: Course }) {
  const price = formatPrice(course.price)

  return (
    <Link
      href={`/learner/courses/${course.id}`}
      className="block rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(20,55,64,0.08)]"
    >
      <div className="course-thumb-placeholder relative mb-4 flex h-[190px] items-center justify-center rounded-md font-mono text-xs text-muted-foreground">
        course thumbnail
        <span className="absolute top-3 right-3 rounded-full bg-ring px-3 py-1 text-xs font-semibold text-white">
          {price}
        </span>
      </div>

      <div className="mb-3 min-h-[46px] text-[17px] leading-snug font-bold">{course.title}</div>

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

      {course.description && (
        <p className="line-clamp-3 text-[13.5px] leading-relaxed text-muted-foreground">
          {course.description}
        </p>
      )}
    </Link>
  )
}
