"use client"

import { BookOpen, Clock, Tag } from "lucide-react"

import { formatCourseAccess } from "@/lib/courses"
import { cn } from "@/lib/utils"
import { useCourseDraft } from "../CourseDraftContext"

// Mirrors recalculate_course_lesson_stats() (databaseSetup.sql) so the
// preview matches what the DB trigger will compute once this draft is
// saved -- courses.lesson_count/duration_hours are stale until then.
export function PreviewTab() {
  const { draft } = useCourseDraft()

  const lessons = draft.sections.flatMap((s) => s.lessons)
  const lessonCount = lessons.length
  const totalSeconds = lessons.reduce((n, l) => n + (l.duration_seconds ?? 0), 0)
  const durationHours = totalSeconds === 0 ? 0 : Math.round((totalSeconds / 3600) * 10) / 10

  const priceLabel = formatCourseAccess({
    price: draft.enrollmentMode === "paid" ? draft.price : 0,
    is_private: draft.isPrivate,
  })

  return (
    <div>
      <div
        className={cn(
          "relative mb-5 flex h-[280px] items-center justify-center overflow-hidden rounded-xl font-mono text-xs text-muted-foreground",
          !draft.thumbnail_url && "course-thumb-placeholder"
        )}
      >
        {draft.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          "course thumbnail"
        )}
      </div>

      <h2 className="mb-3 text-2xl leading-snug font-bold">{draft.title || "Untitled course"}</h2>

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
        {draft.description || "No description yet."}
      </p>
    </div>
  )
}
