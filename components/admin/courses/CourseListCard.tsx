"use client"

import Link from "next/link"
import { useTransition } from "react"
import { BookOpen, Clock, Eye, Pencil, Tag } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCourseAccess, type Course } from "@/lib/courses"
import { cn } from "@/lib/utils"
import { toggleCourseStatusAction } from "@/app/admin/courses/actions"

import { DeleteCourseDialog } from "./DeleteCourseDialog"

export function CourseListCard({ course }: { course: Course }) {
  const [isPending, startTransition] = useTransition()
  const price = formatCourseAccess(course)
  const isPublished = course.status === "published"

  function handleToggleStatus() {
    startTransition(async () => {
      const result = await toggleCourseStatusAction(course.id, isPublished ? "draft" : "published")
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(isPublished ? "Dipindahkan ke draf" : "Diterbitkan")
    })
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(20,55,64,0.08)]">
      <div
        className={cn(
          "relative mb-4 flex h-[160px] items-center justify-center overflow-hidden rounded-md font-mono text-xs text-muted-foreground",
          !course.thumbnail_url && "course-thumb-placeholder"
        )}
      >
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          "gambar kursus"
        )}
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={isPending}
          className="absolute top-3 left-3"
          aria-label={isPublished ? "Terbit. Klik untuk memindahkan ke draf" : "Draf. Klik untuk menerbitkan"}
        >
          <Badge
            variant={isPublished ? "default" : "outline"}
            className={
              isPublished
                ? "bg-success text-success-foreground"
                : "border-pill-border bg-draft-background text-destructive"
            }
          >
            {isPublished ? "Terbit" : "Draf"}
          </Badge>
        </button>
        <span className="absolute top-3 right-3 rounded-full bg-ring px-3 py-1 text-xs font-semibold text-white">
          {price}
        </span>
      </div>

      <div className="mb-3 line-clamp-2 min-h-[46px] text-[16px] leading-snug font-bold">
        {course.title}
      </div>

      <div className="mb-3 flex flex-wrap gap-4 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BookOpen className="size-3.5" />
          {course.lesson_count} pelajaran
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {course.duration_hours} jam
        </span>
        <span className="flex items-center gap-1.5">
          <Tag className="size-3.5" />
          {price}
        </span>
      </div>

      <div className="mb-4 min-h-0 flex-1">
        {course.description && (
          <p className="line-clamp-2 text-[13.5px] leading-relaxed text-muted-foreground">
            {course.description}
          </p>
        )}
      </div>

      <div className="mt-auto flex gap-2">
        <Button
          variant="outline"
          className="h-9 flex-1"
          aria-label="Pratinjau kursus"
          render={<Link href={`/admin/courses/preview/${course.id}`} />}
          nativeButton={false}
        >
          <Eye className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          className="h-9 flex-1"
          aria-label="Ubah kursus"
          render={<Link href={`/admin/courses/${course.id}/edit`} />}
          nativeButton={false}
        >
          <Pencil className="size-3.5" />
        </Button>
        <DeleteCourseDialog courseId={course.id} courseTitle={course.title} className="h-9 flex-1" />
      </div>
    </div>
  )
}
