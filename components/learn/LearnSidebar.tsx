"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, FileText, HelpCircle, Presentation, Video } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDuration, type CourseSection, type LessonContentType } from "@/lib/courses"
import { toggleLessonComplete } from "@/app/learn/[courseId]/actions"

const typeIcon: Record<LessonContentType, typeof Video> = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
  mixed: Video,
  ppt: Presentation,
}

const typeLabel: Record<LessonContentType, string> = {
  video: "Video",
  text: "Bacaan",
  quiz: "Kuis",
  mixed: "Campuran",
  ppt: "Slide",
}

export function LearnSidebar({
  courseId,
  sections,
  currentLessonId,
  completedLessonIds,
  basePath = "/learn",
  mode = "learner",
}: {
  courseId: string
  sections: CourseSection[]
  currentLessonId: string
  completedLessonIds: Set<string>
  basePath?: string
  mode?: "learner" | "admin-preview"
}) {
  // v2: the "AI Assistant" tab was removed. It looked usable but had no
  // backend, and a control that does nothing reads as a broken product
  // (DL standard: every button leads to a real view).
  return (
    <aside aria-labelledby="course-content-heading" className="flex min-h-0 flex-1 flex-col border-l border-border bg-card">
      <h2 id="course-content-heading" className="border-b border-muted px-5 py-3 text-sm font-semibold text-foreground">
        Isi kursus
      </h2>
      <ContentTab
        courseId={courseId}
        sections={sections}
        currentLessonId={currentLessonId}
        completedLessonIds={completedLessonIds}
        basePath={basePath}
        mode={mode}
      />
    </aside>
  )
}

function ContentTab({
  courseId,
  sections,
  currentLessonId,
  completedLessonIds,
  basePath = "/learn",
  mode = "learner",
}: {
  courseId: string
  sections: CourseSection[]
  currentLessonId: string
  completedLessonIds: Set<string>
  basePath?: string
  mode?: "learner" | "admin-preview"
}) {
  // Open the module that holds the current lesson, so the learner sees where
  // they are without hunting for it.
  const [openId, setOpenId] = useState<string | null>(
    sections.find((s) => s.lessons.some((l) => l.id === currentLessonId))?.id ?? sections[0]?.id ?? null
  )

  return (
    <div className="flex-1 overflow-y-auto">
      {sections.map((section) => {
        const isOpen = openId === section.id
        const doneCount = section.lessons.filter((l) => completedLessonIds.has(l.id)).length

        return (
          <div key={section.id} className="border-b border-muted">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : section.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2.5 bg-secondary/40 px-5 py-3.5 text-left hover:bg-secondary/70"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight">{section.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {mode === "admin-preview"
                    ? `${section.lessons.length} pelajaran`
                    : `${doneCount} dari ${section.lessons.length} selesai`}
                </div>
              </div>
              <ChevronDown
                aria-hidden
                className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
              />
            </button>

            {isOpen && (
              <div className="flex flex-col">
                {section.lessons.map((lesson) => {
                  const Icon = typeIcon[lesson.content_type]
                  const isActive = lesson.id === currentLessonId
                  const isDone = completedLessonIds.has(lesson.id)

                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        "flex items-center gap-2.5 border-l-2 px-5 py-2.5",
                        isActive ? "border-ring bg-secondary" : "border-transparent hover:bg-muted"
                      )}
                    >
                      {mode === "learner" && (
                        <form action={toggleLessonComplete}>
                          <input type="hidden" name="courseId" value={courseId} />
                          <input type="hidden" name="lessonId" value={lesson.id} />
                          <input type="hidden" name="completed" value={(!isDone).toString()} />
                          {/* 24px hit area around the 18px box (WCAG 2.5.8 target size). */}
                          <button
                            type="submit"
                            aria-pressed={isDone}
                            aria-label={isDone ? `Tandai "${lesson.title}" belum selesai` : `Tandai "${lesson.title}" selesai`}
                            className="-m-[3px] flex size-6 shrink-0 items-center justify-center rounded"
                          >
                            <span
                              className={cn(
                                "flex size-[18px] items-center justify-center rounded border",
                                isDone ? "border-ring bg-ring" : "border-input bg-card"
                              )}
                            >
                              {isDone && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" aria-hidden>
                                  <path d="M5 13 L10 18 L19 7" />
                                </svg>
                              )}
                            </span>
                          </button>
                        </form>
                      )}

                      <Link
                        href={`${basePath}/${courseId}?lesson=${lesson.id}`}
                        aria-current={isActive ? "page" : undefined}
                        className="min-w-0 flex-1"
                      >
                        <div className="line-clamp-2 text-[13.5px] leading-snug">{lesson.title}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="size-3" aria-hidden />
                          <span>
                            {typeLabel[lesson.content_type]}
                            {mode === "learner" && isDone ? " · Selesai" : ""}
                            {lesson.duration_seconds ? ` · ${formatDuration(lesson.duration_seconds)}` : ""}
                          </span>
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
