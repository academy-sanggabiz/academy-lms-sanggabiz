"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, FileText, HelpCircle, Send, Sparkles, Video } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDuration, type CourseSection, type LessonContentType } from "@/lib/courses"
import { toggleLessonComplete } from "@/app/learn/[courseId]/actions"

const typeIcon: Record<LessonContentType, typeof Video> = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
  mixed: Video,
}

const typeLabel: Record<LessonContentType, string> = {
  video: "Video",
  text: "Reading",
  quiz: "Quiz",
  mixed: "Mixed",
}

const suggestedQuestions = [
  "Give me an overview of the course",
  "What tools do I need for this course?",
  "How long will this course take?",
  "What should I do after finishing this course?",
]

export function LearnSidebar({
  courseId,
  sections,
  currentLessonId,
  completedLessonIds,
}: {
  courseId: string
  sections: CourseSection[]
  currentLessonId: string
  completedLessonIds: Set<string>
}) {
  const [sideTab, setSideTab] = useState<"content" | "ai">("content")

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex gap-1 border-b border-muted px-3 pt-2">
        <button
          onClick={() => setSideTab("content")}
          className={cn(
            "rounded-t-lg px-3 py-2 text-sm font-semibold",
            sideTab === "content"
              ? "border-b-2 border-ring text-ring"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Course content
        </button>
        <button
          onClick={() => setSideTab("ai")}
          className={cn(
            "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-semibold",
            sideTab === "ai"
              ? "border-b-2 border-ring text-ring"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="size-3.5" />
          AI Assistant
        </button>
      </div>

      {sideTab === "content" ? (
        <ContentTab
          courseId={courseId}
          sections={sections}
          currentLessonId={currentLessonId}
          completedLessonIds={completedLessonIds}
        />
      ) : (
        <AiAssistantTab />
      )}
    </aside>
  )
}

function ContentTab({
  courseId,
  sections,
  currentLessonId,
  completedLessonIds,
}: {
  courseId: string
  sections: CourseSection[]
  currentLessonId: string
  completedLessonIds: Set<string>
}) {
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null)

  return (
    <div className="flex-1 overflow-y-auto">
      {sections.map((section) => {
        const isOpen = openId === section.id
        const doneCount = section.lessons.filter((l) => completedLessonIds.has(l.id)).length

        return (
          <div key={section.id} className="border-b border-muted">
            <button
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="flex w-full items-center gap-2.5 bg-secondary/40 px-5 py-3.5 text-left hover:bg-secondary/70"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight">{section.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {doneCount} / {section.lessons.length}
                </div>
              </div>
              <ChevronDown
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
                      <form action={toggleLessonComplete}>
                        <input type="hidden" name="courseId" value={courseId} />
                        <input type="hidden" name="lessonId" value={lesson.id} />
                        <input type="hidden" name="completed" value={(!isDone).toString()} />
                        <button
                          type="submit"
                          title="Mark complete"
                          className={cn(
                            "flex size-[18px] shrink-0 items-center justify-center rounded border",
                            isDone ? "border-ring bg-ring" : "border-input bg-card"
                          )}
                        >
                          {isDone && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                              <path d="M5 13 L10 18 L19 7" />
                            </svg>
                          )}
                        </button>
                      </form>

                      <Link href={`/learn/${courseId}?lesson=${lesson.id}`} className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-[13.5px] leading-snug">{lesson.title}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="size-3" />
                          <span>
                            {typeLabel[lesson.content_type]}
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

function AiAssistantTab() {
  const [input, setInput] = useState("")

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-1.5 text-base font-bold">Do you have any questions about this course?</div>
        <p className="mb-4.5 text-xs leading-relaxed text-muted-foreground">
          Our AI assistant may make mistakes. Verify for accuracy.
        </p>
        <div className="flex flex-col gap-2.5">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="rounded-lg border border-input px-3.5 py-3 text-left text-[13.5px] leading-snug hover:border-ring hover:bg-secondary/40"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2.5 border-t border-muted p-3.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question"
          className="h-10 flex-1 rounded-lg border border-input bg-card px-3.5 text-[13.5px] outline-none focus:border-ring"
        />
        <button className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}
