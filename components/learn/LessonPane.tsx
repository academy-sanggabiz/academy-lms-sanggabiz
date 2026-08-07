"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Maximize2, MessageCircleQuestion, Minimize2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  formatDuration,
  getGoogleSlidesEmbedUrl,
  getYouTubeEmbedUrl,
  type Course,
  type Lesson,
} from "@/lib/courses"
import type { QuizAttemptInfo } from "@/lib/learn-server"
import type { AdminQuiz } from "@/lib/courses-admin"
import { QuizPlayer } from "@/components/learn/QuizPlayer"
import { QuizPreview } from "@/components/learn/QuizPreview"
import { EssayAssessmentPlayer } from "@/components/learn/EssayAssessmentPlayer"
import { CourseFeedbackForm } from "@/components/learn/CourseFeedbackForm"

export function LessonPane({
  courseId,
  course,
  lesson,
  prevLessonId,
  nextLessonId,
  quizAttempt,
  basePath = "/learn",
  mode = "learner",
  isCourseComplete = false,
  feedbackGiven = false,
}: {
  courseId: string
  course: Course
  lesson: Lesson
  prevLessonId: string | null
  nextLessonId: string | null
  quizAttempt?: QuizAttemptInfo
  basePath?: string
  mode?: "learner" | "admin-preview"
  isCourseComplete?: boolean
  feedbackGiven?: boolean
}) {
  const isQuiz = lesson.content_type === "quiz" || lesson.content_type === "mixed"
  // Assessments are long, multi-question study cases -- scroll them from the top
  // instead of vertically centering the (short) quiz card.
  const isAssessment = isQuiz && mode !== "admin-preview" && !!lesson.quiz?.is_assessment
  const [showFinished, setShowFinished] = useState(false)

  return (
    <div className={cn("relative flex min-w-0 flex-1 flex-col overflow-y-auto", isQuiz && "bg-[#f4f8fa]")}>
      <div className={cn("flex-1", isQuiz && !isAssessment && "flex flex-col justify-center py-10")}>
        {showFinished ? (
          <CourseFinishedPane
            courseId={courseId}
            courseTitle={course.title}
            prevLessonId={prevLessonId}
            basePath={basePath}
            isCourseComplete={isCourseComplete}
            feedbackGiven={feedbackGiven}
          />
        ) : (
          <>
            {lesson.content_type === "video" && (
              <VideoContent
                lesson={lesson}
                courseId={courseId}
                prevLessonId={prevLessonId}
                nextLessonId={nextLessonId}
                onReachEnd={() => setShowFinished(true)}
                basePath={basePath}
              />
            )}
            {lesson.content_type === "text" && (
              <TextContent
                lesson={lesson}
                courseId={courseId}
                prevLessonId={prevLessonId}
                nextLessonId={nextLessonId}
                onReachEnd={() => setShowFinished(true)}
                basePath={basePath}
              />
            )}
            {lesson.content_type === "ppt" && (
              <SlidesContent
                lesson={lesson}
                courseId={courseId}
                prevLessonId={prevLessonId}
                nextLessonId={nextLessonId}
                onReachEnd={() => setShowFinished(true)}
                basePath={basePath}
              />
            )}
            {(lesson.content_type === "quiz" || lesson.content_type === "mixed") && (
              <div className="group relative">
                {lesson.quiz ? (
                  mode === "admin-preview" ? (
                    <QuizPreview quiz={lesson.quiz as AdminQuiz} />
                  ) : lesson.quiz.is_assessment ? (
                    <EssayAssessmentPlayer quiz={lesson.quiz} attemptInfo={quizAttempt} />
                  ) : (
                    <QuizPlayer quiz={lesson.quiz} attemptInfo={quizAttempt} />
                  )
                ) : (
                  <QuizPlaceholder />
                )}
                <LessonNavArrows
                  courseId={courseId}
                  prevLessonId={prevLessonId}
                  nextLessonId={nextLessonId}
                  onReachEnd={() => setShowFinished(true)}
                  revealOnHover={false}
                  basePath={basePath}
                />
              </div>
            )}

            {lesson.content_type !== "quiz" && lesson.content_type !== "text" && (
              <LessonTabs course={course} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function LessonNavArrows({
  courseId,
  prevLessonId,
  nextLessonId,
  onReachEnd,
  revealOnHover,
  basePath = "/learn",
}: {
  courseId: string
  prevLessonId: string | null
  nextLessonId: string | null
  onReachEnd: () => void
  revealOnHover: boolean
  basePath?: string
}) {
  const visibility = revealOnHover
    ? "opacity-0 transition-opacity duration-150 group-hover:opacity-100"
    : "opacity-100"

  return (
    <>
      {prevLessonId ? (
        <Link
          href={`${basePath}/${courseId}?lesson=${prevLessonId}`}
          title="Previous lesson"
          className={cn(
            "absolute top-1/2 left-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg hover:bg-muted hover:text-foreground",
            visibility
          )}
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <button
          disabled
          title="Previous lesson"
          className={cn(
            "absolute top-1/2 left-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg",
            revealOnHover ? "opacity-0 transition-opacity duration-150 group-hover:opacity-40" : "opacity-40"
          )}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {nextLessonId ? (
        <Link
          href={`${basePath}/${courseId}?lesson=${nextLessonId}`}
          title="Next lesson"
          className={cn(
            "absolute top-1/2 right-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg hover:bg-muted hover:text-foreground",
            visibility
          )}
        >
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <button
          onClick={onReachEnd}
          title="Next lesson"
          className={cn(
            "absolute top-1/2 right-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg hover:bg-muted hover:text-foreground",
            visibility
          )}
        >
          <ChevronRight className="size-5" />
        </button>
      )}
    </>
  )
}

function CourseFinishedPane({
  courseId,
  courseTitle,
  prevLessonId,
  basePath = "/learn",
  isCourseComplete,
  feedbackGiven,
}: {
  courseId: string
  courseTitle: string
  prevLessonId: string | null
  basePath?: string
  isCourseComplete: boolean
  feedbackGiven: boolean
}) {
  return (
    <div className="relative flex flex-col items-center gap-5 p-16 text-center">
      {prevLessonId && (
        <Link
          href={`${basePath}/${courseId}?lesson=${prevLessonId}`}
          title="Previous lesson"
          className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      )}
      {isCourseComplete ? (
        feedbackGiven ? (
          <>
            <p className="text-lg font-bold">🎉 Congratulations — you&apos;ve completed {courseTitle}!</p>
            <p className="-mt-3 text-sm text-muted-foreground">Your certificate is ready to download.</p>
            <div className="flex gap-3">
              <Button
                className="bg-brand-gradient text-white hover:brightness-105"
                render={<Link href="/learner/profile?tab=certificates" />}
                nativeButton={false}
              >
                View Your Certificate
              </Button>
              <Button variant="outline" render={<Link href="/learner/courses" />} nativeButton={false}>
                Find more courses
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-bold">🎉 Congratulations — you&apos;ve completed {courseTitle}!</p>
            <p className="-mt-3 text-sm text-muted-foreground">
              One last step — tell us how it went to unlock your certificate.
            </p>
            <CourseFeedbackForm courseId={courseId} />
            <Button variant="outline" render={<Link href="/learner/courses" />} nativeButton={false}>
              Find more courses
            </Button>
          </>
        )
      ) : (
        <>
          <p className="text-lg font-bold">🙌 You&apos;ve finished the last lesson in this course!</p>
          <Button variant="outline" render={<Link href="/learner/courses" />} nativeButton={false}>
            Find more courses
          </Button>
        </>
      )}
    </div>
  )
}

function VideoContent({
  lesson,
  courseId,
  prevLessonId,
  nextLessonId,
  onReachEnd,
  basePath = "/learn",
}: {
  lesson: Lesson
  courseId: string
  prevLessonId: string | null
  nextLessonId: string | null
  onReachEnd: () => void
  basePath?: string
}) {
  const embedUrl = getYouTubeEmbedUrl(lesson.video_url)

  if (!embedUrl) {
    return (
      <div className="group relative flex justify-center">
        <div className="flex aspect-video h-[62vh] items-center justify-center bg-foreground/90 text-sm text-background/70">
          No video available for this lesson.
        </div>
        <LessonNavArrows
          courseId={courseId}
          prevLessonId={prevLessonId}
          nextLessonId={nextLessonId}
          onReachEnd={onReachEnd}
          revealOnHover
          basePath={basePath}
        />
      </div>
    )
  }

  return (
    <div className="group relative flex justify-center">
      <div className="aspect-video h-[62vh] bg-black">
        <iframe
          src={embedUrl}
          title={lesson.title}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <LessonNavArrows
        courseId={courseId}
        prevLessonId={prevLessonId}
        nextLessonId={nextLessonId}
        onReachEnd={onReachEnd}
        revealOnHover
        basePath={basePath}
      />
    </div>
  )
}

function SlidesContent({
  lesson,
  courseId,
  prevLessonId,
  nextLessonId,
  onReachEnd,
  basePath = "/learn",
}: {
  lesson: Lesson
  courseId: string
  prevLessonId: string | null
  nextLessonId: string | null
  onReachEnd: () => void
  basePath?: string
}) {
  const embedUrl = getGoogleSlidesEmbedUrl(lesson.video_url)

  if (!embedUrl) {
    return (
      <div className="group relative flex justify-center">
        <div className="flex aspect-video h-[62vh] items-center justify-center bg-foreground/90 text-sm text-background/70">
          No slides available for this lesson.
        </div>
        <LessonNavArrows
          courseId={courseId}
          prevLessonId={prevLessonId}
          nextLessonId={nextLessonId}
          onReachEnd={onReachEnd}
          revealOnHover
          basePath={basePath}
        />
      </div>
    )
  }

  return (
    <div className="group relative flex justify-center">
      <div className="aspect-video h-[62vh] bg-black">
        <iframe src={embedUrl} title={lesson.title} className="size-full" allowFullScreen />
      </div>
      <LessonNavArrows
        courseId={courseId}
        prevLessonId={prevLessonId}
        nextLessonId={nextLessonId}
        onReachEnd={onReachEnd}
        revealOnHover
        basePath={basePath}
      />
    </div>
  )
}

function TextContent({
  lesson,
  courseId,
  prevLessonId,
  nextLessonId,
  onReachEnd,
  basePath = "/learn",
}: {
  lesson: Lesson
  courseId: string
  prevLessonId: string | null
  nextLessonId: string | null
  onReachEnd: () => void
  basePath?: string
}) {
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <div className="group relative flex h-full flex-col">
      <div
        className={cn(
          "border-b border-border bg-card",
          fullscreen ? "fixed inset-0 z-50 overflow-y-auto" : "flex-1 overflow-y-auto"
        )}
      >
        {!fullscreen && (
          <button
            onClick={() => setFullscreen(true)}
            title="Fullscreen"
            className="sticky top-3.5 float-right mr-5 flex size-9 items-center justify-center rounded-[10px] border border-input bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
          >
            <Maximize2 className="size-4" />
          </button>
        )}
        {fullscreen && (
          <button
            onClick={() => setFullscreen(false)}
            title="Exit fullscreen"
            className="fixed right-6 bottom-6 z-[60] flex size-11 items-center justify-center rounded-xl border border-input bg-muted text-muted-foreground shadow-lg hover:bg-accent hover:text-foreground"
          >
            <Minimize2 className="size-4.5" />
          </button>
        )}
        <div className="px-14 py-8">
          <div className="mb-2.5 text-xs font-semibold tracking-wider text-ring uppercase">
            Reading{lesson.duration_seconds ? ` · ${formatDuration(lesson.duration_seconds)}` : ""}
          </div>
          <h2 className="mb-7 text-[28px] leading-tight font-bold">{lesson.title}</h2>
          {lesson.content ? (
            <div className="lesson-prose" dangerouslySetInnerHTML={{ __html: lesson.content }} />
          ) : (
            <p className="text-[15px] leading-[1.85] text-muted-foreground">
              No content available for this lesson.
            </p>
          )}
        </div>
      </div>
      {!fullscreen && (
        <LessonNavArrows
          courseId={courseId}
          prevLessonId={prevLessonId}
          nextLessonId={nextLessonId}
          onReachEnd={onReachEnd}
          revealOnHover={false}
          basePath={basePath}
        />
      )}
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
  const [tab, setTab] = useState<"overview" | "notes">("overview")
  const [note, setNote] = useState("")

  return (
    <div className="bg-card">
      <div className="flex gap-1 border-b border-muted px-7">
        {(["overview", "notes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-1 py-3.5 text-sm font-semibold",
              tab === t ? "border-b-2 border-ring text-ring" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "overview" ? "Overview" : "Notes"}
          </button>
        ))}
      </div>

      <div className="max-w-[840px] p-7">
        {tab === "overview" && (
          <>
            <div className="mb-3 text-lg font-bold">About this course</div>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{course.description}</p>
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
      </div>
    </div>
  )
}
