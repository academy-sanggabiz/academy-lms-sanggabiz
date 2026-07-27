"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, MessageCircleQuestion } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { formatDuration, getYouTubeEmbedUrl, type Course, type Lesson } from "@/lib/courses"
import type { QuizAttemptInfo } from "@/lib/learn-server"
import { QuizPlayer } from "@/components/learn/QuizPlayer"

export function LessonPane({
  courseId,
  course,
  lesson,
  prevLessonId,
  nextLessonId,
  quizAttempt,
}: {
  courseId: string
  course: Course
  lesson: Lesson
  prevLessonId: string | null
  nextLessonId: string | null
  quizAttempt?: QuizAttemptInfo
}) {
  const isQuiz = lesson.content_type === "quiz" || lesson.content_type === "mixed"

  return (
    <div className={cn("flex min-w-0 flex-1 flex-col overflow-y-auto", isQuiz && "bg-[#f4f8fa]")}>
      <div className={cn("flex-1", isQuiz && "flex flex-col justify-center py-10")}>
        {lesson.content_type === "video" && <VideoContent lesson={lesson} />}
        {lesson.content_type === "text" && <TextContent lesson={lesson} />}
        {(lesson.content_type === "quiz" || lesson.content_type === "mixed") &&
          (lesson.quiz ? (
            <QuizPlayer
              courseId={courseId}
              lessonId={lesson.id}
              quiz={lesson.quiz}
              attemptInfo={quizAttempt}
            />
          ) : (
            <QuizPlaceholder />
          ))}

        {lesson.content_type !== "quiz" && <LessonTabs course={course} />}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-card px-8 py-4">
        <Button
          variant="outline"
          disabled={!prevLessonId}
          render={<Link href={prevLessonId ? `/learn/${courseId}?lesson=${prevLessonId}` : "#"} />}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={!nextLessonId}
          render={<Link href={nextLessonId ? `/learn/${courseId}?lesson=${nextLessonId}` : "#"} />}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function VideoContent({ lesson }: { lesson: Lesson }) {
  const embedUrl = getYouTubeEmbedUrl(lesson.video_url)

  if (!embedUrl) {
    return (
      <div className="flex aspect-video items-center justify-center bg-foreground/90 text-sm text-background/70">
        No video available for this lesson.
      </div>
    )
  }

  return (
    <div className="aspect-video bg-black">
      <iframe
        src={embedUrl}
        title={lesson.title}
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

function TextContent({ lesson }: { lesson: Lesson }) {
  return (
    <div className="p-8">
      <div className="mb-2.5 text-xs font-semibold tracking-wider text-ring uppercase">
        Reading{lesson.duration_seconds ? ` · ${formatDuration(lesson.duration_seconds)}` : ""}
      </div>
      <h2 className="mb-7 text-[28px] leading-tight font-bold">{lesson.title}</h2>
      <p className="text-[15px] leading-[1.85] text-muted-foreground">
        {lesson.content ?? "No content available for this lesson."}
      </p>
    </div>
  )
}

function QuizPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3 p-16 text-center">
      <MessageCircleQuestion className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">Quiz — coming soon.</p>
    </div>
  )
}

function LessonTabs({ course }: { course: Course }) {
  const [tab, setTab] = useState<"overview" | "notes" | "qa">("overview")
  const [note, setNote] = useState("")

  return (
    <div className="bg-card">
      <div className="flex gap-1 border-b border-muted px-7">
        {(["overview", "notes", "qa"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-1 py-3.5 text-sm font-semibold",
              tab === t ? "border-b-2 border-ring text-ring" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "overview" ? "Overview" : t === "notes" ? "Notes" : "Q&A"}
          </button>
        ))}
      </div>

      <div className="max-w-[840px] p-7">
        {tab === "overview" && (
          <>
            <div className="mb-3 text-lg font-bold">About this course</div>
            <p className="text-sm leading-relaxed text-muted-foreground">{course.description}</p>
            <div className="mt-4 flex gap-2 text-[13px] text-muted-foreground">
              <span>{course.lesson_count} lessons</span>
              <span>·</span>
              <span>{course.duration_hours} hours</span>
              <span>·</span>
              <span>Bahasa Indonesia</span>
            </div>
          </>
        )}

        {tab === "notes" && (
          <>
            <div className="mb-3 text-lg font-bold">My notes</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a note for this lesson..."
              className="min-h-[130px] w-full rounded-lg border border-input bg-card p-3.5 text-sm outline-none focus:border-ring"
            />
            <Button className="mt-3 bg-brand-gradient text-white hover:brightness-105">Save Note</Button>
          </>
        )}

        {tab === "qa" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <MessageCircleQuestion className="size-9 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No questions yet — be the first to ask.</p>
            <Button variant="outline">Ask a Question</Button>
          </div>
        )}
      </div>
    </div>
  )
}
