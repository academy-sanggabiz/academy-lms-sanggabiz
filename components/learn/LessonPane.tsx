"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, ChevronLeft, ChevronRight, Maximize2, MessageCircleQuestion, Minimize2 } from "lucide-react"

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
import { LessonNotes } from "@/components/learn/LessonNotes"
import type { LessonNote } from "@/lib/notes"
import { toggleLessonComplete } from "@/app/learn/[courseId]/actions"

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
  isLessonDone = false,
  note = null,
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
  isLessonDone?: boolean
  /** The learner's saved note for this lesson (learner mode only). */
  note?: LessonNote | null
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

            {lesson.content_type !== "quiz" && lesson.content_type !== "mixed" && (
              <LessonFooter
                courseId={courseId}
                lessonId={lesson.id}
                prevLessonId={prevLessonId}
                nextLessonId={nextLessonId}
                isDone={isLessonDone}
                onReachEnd={() => setShowFinished(true)}
                basePath={basePath}
                mode={mode}
              />
            )}

            {mode === "learner" && lesson.content_type !== "quiz" && lesson.content_type !== "mixed" && (
              <LessonNotes lessonId={lesson.id} initialNote={note} />
            )}

            {lesson.content_type !== "quiz" && lesson.content_type !== "mixed" && lesson.content_type !== "text" && (
              <AboutCourse course={course} />
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
          aria-label="Previous lesson"
          className={cn(
            "absolute top-1/2 left-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg hover:bg-muted hover:text-foreground",
            visibility
          )}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      ) : (
        <button
          type="button"
          disabled
          aria-label="Previous lesson (this is the first lesson)"
          className={cn(
            "absolute top-1/2 left-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg",
            revealOnHover ? "opacity-0 transition-opacity duration-150 group-hover:opacity-40" : "opacity-40"
          )}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}

      {nextLessonId ? (
        <Link
          href={`${basePath}/${courseId}?lesson=${nextLessonId}`}
          aria-label="Next lesson"
          className={cn(
            "absolute top-1/2 right-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg hover:bg-muted hover:text-foreground",
            visibility
          )}
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onReachEnd}
          aria-label="Finish course"
          className={cn(
            "absolute top-1/2 right-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg hover:bg-muted hover:text-foreground",
            visibility
          )}
        >
          <ChevronRight className="size-5" aria-hidden />
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
          aria-label="Previous lesson"
          className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-lg hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" aria-hidden />
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
        <div className="flex aspect-video w-full max-w-[calc(62vh*16/9)] items-center justify-center bg-foreground/90 text-sm text-background/70">
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
      <div className="aspect-video w-full max-w-[calc(62vh*16/9)] bg-black">
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
        <div className="flex aspect-video w-full max-w-[calc(62vh*16/9)] items-center justify-center bg-foreground/90 text-sm text-background/70">
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
      <div className="aspect-video w-full max-w-[calc(62vh*16/9)] bg-black">
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
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label="Read in full screen"
            className="sticky top-3.5 float-right mr-5 flex size-9 items-center justify-center rounded-[10px] border border-input bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
          >
            <Maximize2 className="size-4" aria-hidden />
          </button>
        )}
        {fullscreen && (
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Exit full screen"
            className="fixed right-6 bottom-6 z-[60] flex size-11 items-center justify-center rounded-xl border border-input bg-muted text-muted-foreground shadow-lg hover:bg-accent hover:text-foreground"
          >
            <Minimize2 className="size-4.5" aria-hidden />
          </button>
        )}
        {/* Line length capped near 72 characters (DL standard: 45-75). */}
        <div className="mx-auto max-w-[72ch] px-5 py-8 sm:px-14">
          <div className="mb-2.5 text-xs font-semibold tracking-wider text-ring uppercase">
            Reading{lesson.duration_seconds ? ` · ${formatDuration(lesson.duration_seconds)}` : ""}
          </div>
          <h1 className="mb-7 text-2xl leading-tight font-bold sm:text-[28px]">{lesson.title}</h1>
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

/**
 * One labelled next action under every content lesson (DL standard: a clear
 * "what next", feedback that the action counted). "Complete & continue"
 * records the lesson and opens the next one in a single step.
 */
function LessonFooter({
  courseId,
  lessonId,
  prevLessonId,
  nextLessonId,
  isDone,
  onReachEnd,
  basePath = "/learn",
  mode = "learner",
}: {
  courseId: string
  lessonId: string
  prevLessonId: string | null
  nextLessonId: string | null
  isDone: boolean
  onReachEnd: () => void
  basePath?: string
  mode?: "learner" | "admin-preview"
}) {
  const nextHref = nextLessonId ? `${basePath}/${courseId}?lesson=${nextLessonId}` : null

  return (
    <nav
      aria-label="Lesson navigation"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-4 sm:px-7"
    >
      {prevLessonId ? (
        <Button variant="outline" render={<Link href={`${basePath}/${courseId}?lesson=${prevLessonId}`} />} nativeButton={false}>
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </Button>
      ) : (
        <span />
      )}

      <div className="flex flex-wrap items-center gap-3">
        {mode === "learner" && isDone && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-success-foreground">
            <Check className="size-4" aria-hidden />
            Lesson done
          </span>
        )}
        {mode === "learner" && !isDone ? (
          <form action={toggleLessonComplete}>
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lessonId" value={lessonId} />
            <input type="hidden" name="completed" value="true" />
            {nextLessonId && <input type="hidden" name="continueTo" value={nextLessonId} />}
            <Button type="submit" className="bg-brand-gradient text-white hover:brightness-105">
              {nextLessonId ? "Complete & continue" : "Complete lesson"}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </form>
        ) : nextHref ? (
          <Button
            className="bg-brand-gradient text-white hover:brightness-105"
            render={<Link href={nextHref} />}
            nativeButton={false}
          >
            Next lesson
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button type="button" className="bg-brand-gradient text-white hover:brightness-105" onClick={onReachEnd}>
            Finish course
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </nav>
  )
}

/**
 * Course facts under video and slide lessons. v2 removed the "Notes" tab that
 * sat here: it looked like a notebook but saved nothing, so a learner's notes
 * were silently lost on navigation.
 */
function AboutCourse({ course }: { course: Course }) {
  return (
    <section aria-labelledby="about-course-heading" className="bg-card">
      <div className="max-w-[840px] p-5 sm:p-7">
        <h2 id="about-course-heading" className="mb-3 text-lg font-bold">
          About this course
        </h2>
        <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[13px] text-muted-foreground">
          <span>{course.lesson_count} lessons</span>
          <span aria-hidden>·</span>
          <span>{course.duration_hours} hours</span>
          <span aria-hidden>·</span>
          <span>{course.language}</span>
        </div>
      </div>
    </section>
  )
}
