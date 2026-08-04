"use client"

import { useFormContext } from "react-hook-form"
import { BookOpen, Clock, Tag } from "lucide-react"

import { formatCourseAccess } from "@/lib/courses"
import { cn } from "@/lib/utils"
import type { CourseFormValues } from "../schema"

export function PreviewTab({
  lessonCount,
  durationHours,
}: {
  lessonCount: number
  durationHours: number
}) {
  const { watch } = useFormContext<CourseFormValues>()
  const [title, description, thumbnailUrl, enrollmentMode, price, isPrivate] = watch([
    "title",
    "description",
    "thumbnail_url",
    "enrollmentMode",
    "price",
    "isPrivate",
  ])

  const priceLabel = formatCourseAccess({
    price: enrollmentMode === "paid" ? price : 0,
    is_private: isPrivate,
  })

  return (
    <div>
      <div
        className={cn(
          "relative mb-5 flex h-[280px] items-center justify-center overflow-hidden rounded-xl font-mono text-xs text-muted-foreground",
          !thumbnailUrl && "course-thumb-placeholder"
        )}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          "course thumbnail"
        )}
      </div>

      <h2 className="mb-3 text-2xl leading-snug font-bold">{title || "Untitled course"}</h2>

      <div className="mb-3.5 flex flex-wrap gap-4.5 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BookOpen className="size-3.5" />
          {lessonCount} lessons
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {durationHours} {durationHours === 1 ? "hour" : "hours"}
        </span>
        <span className="flex items-center gap-1.5">
          <Tag className="size-3.5" />
          {priceLabel}
        </span>
      </div>

      <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
        {description || "No description yet."}
      </p>
    </div>
  )
}
