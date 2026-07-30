"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, CircleHelp, FileText, PlayCircle, Presentation } from "lucide-react"

import { cn } from "@/lib/utils"
import type { CourseSection, LessonContentType } from "@/lib/courses"

const typeLabel: Record<LessonContentType, string> = {
  video: "Video",
  text: "Reading",
  quiz: "Quiz",
  mixed: "Mixed",
  ppt: "Slides",
}

const typeIcon: Record<LessonContentType, typeof PlayCircle> = {
  video: PlayCircle,
  text: FileText,
  quiz: CircleHelp,
  mixed: PlayCircle,
  ppt: Presentation,
}

export function CourseCurriculum({
  sections,
  courseId,
}: {
  sections: CourseSection[]
  courseId: string
}) {
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null)

  return (
    <div>
      {sections.map((section) => {
        const isOpen = openId === section.id
        return (
          <div key={section.id} className="border-b border-muted last:border-b-0">
            <button
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="flex w-full items-center gap-3 py-4 text-left text-[15px] font-semibold hover:text-primary"
            >
              <span className="flex-1">{section.title}</span>
              <ChevronDown
                className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && (
              <div className="flex flex-col gap-1 pb-3.5 pl-1">
                {section.lessons.map((lesson) => {
                  const Icon = typeIcon[lesson.content_type]
                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/${courseId}?lesson=${lesson.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-foreground/80 hover:bg-muted"
                    >
                      <Icon className="size-4 shrink-0 text-primary" />
                      <span className="flex-1 truncate">{lesson.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {lesson.content_type === "quiz" && lesson.quiz
                          ? `${lesson.quiz.questions.length} questions`
                          : typeLabel[lesson.content_type]}
                      </span>
                    </Link>
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
