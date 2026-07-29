import Link from "next/link"
import { BookOpen, Check, Clock, Eye, Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatPrice, type Course } from "@/lib/courses"
import { cn } from "@/lib/utils"
import { enroll } from "@/app/learner/courses/actions"

export function CourseGridCard({ course, enrolled }: { course: Course; enrolled: boolean }) {
  const price = formatPrice(course.price)

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

      {course.description && (
        <div className="mb-4 min-h-0 flex-1">
          <p className="line-clamp-3 text-[13.5px] leading-relaxed text-muted-foreground">
            {course.description}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="h-11 flex-1"
          render={<Link href={`/learner/courses/${course.id}`} />}
          nativeButton={false}
        >
          <Eye className="size-3.5" />
          Preview
        </Button>
        {enrolled ? (
          <span className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
            <Check className="size-3.5" />
            Enrolled
          </span>
        ) : (
          <form action={enroll} className="flex-1">
            <input type="hidden" name="courseId" value={course.id} />
            <Button type="submit" className="h-11 w-full bg-brand-gradient text-white hover:brightness-105">
              Enroll Now
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
