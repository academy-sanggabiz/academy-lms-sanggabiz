import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { getLearnData } from "@/lib/learn-server"
import { resolveUserRole, roleHomePath } from "@/lib/auth/require-admin"
import { checkAndIssueCertificate } from "@/lib/certificates"
import { createClient } from "@/lib/supabase/server"
import { LearnSidebar } from "@/components/learn/LearnSidebar"
import { LessonPane } from "@/components/learn/LessonPane"

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ lesson?: string }>
}) {
  const { courseId } = await params
  const { lesson: lessonParam } = await searchParams

  const userRole = await resolveUserRole()
  if (userRole && userRole.role !== "learner") {
    // This route lives outside app/learner/layout.tsx's tree (see
    // CLAUDE.md), so it needs its own admin/superadmin guard.
    redirect(roleHomePath(userRole.role))
  }

  const { course, enrollmentId, completedLessonIds, quizAttempts } = await getLearnData(courseId)
  if (!course) notFound()
  if (!enrollmentId) redirect(`/learner/courses/${courseId}?enroll=required`)

  const allLessons = course.sections.flatMap((s) => s.lessons)
  if (allLessons.length === 0) {
    redirect(`/learner/courses/${courseId}`)
  }

  const firstIncomplete = allLessons.find((l) => !completedLessonIds.has(l.id))
  const currentLesson =
    allLessons.find((l) => l.id === lessonParam) ?? firstIncomplete ?? allLessons[0]

  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id)
  const prevLessonId = currentIndex > 0 ? allLessons[currentIndex - 1].id : null
  const nextLessonId =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1].id : null

  const doneCount = allLessons.filter((l) => completedLessonIds.has(l.id)).length
  const progressPct = Math.round((doneCount / allLessons.length) * 100)
  const isCourseComplete = progressPct === 100

  // Self-heal: certificate issuance normally fires from the lesson-completing
  // actions themselves (toggleLessonComplete/submitQuiz/finalizeAttempt), but
  // a course finished before certificates were enabled/configured for it
  // never re-triggers that check. Re-running it here on every page view is
  // cheap (idempotent -- returns the existing row once issued) and makes the
  // check retry automatically instead of staying stuck.
  if (isCourseComplete && userRole) {
    const supabase = await createClient()
    await checkAndIssueCertificate(supabase, {
      enrollmentId,
      courseId,
      learnerId: userRole.userId,
    })
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3.5 border-b border-border bg-card px-5">
        <Link
          href={`/learner/courses/${courseId}`}
          title="Back to course"
          className="flex size-9 items-center justify-center rounded-lg border border-input hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <img src="/logo.png" alt="Sanggabiz" className="size-7 object-contain" />
        <div className="min-w-0 flex-1 truncate text-sm font-semibold">{course.title}</div>
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-brand-gradient" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs font-semibold whitespace-nowrap text-primary">
            {doneCount} / {allLessons.length} done
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <LessonPane
          key={currentLesson.id}
          courseId={courseId}
          course={course}
          lesson={currentLesson}
          prevLessonId={prevLessonId}
          nextLessonId={nextLessonId}
          quizAttempt={currentLesson.quiz ? quizAttempts.get(currentLesson.quiz.id) : undefined}
          isCourseComplete={isCourseComplete}
        />
        <LearnSidebar
          courseId={courseId}
          sections={course.sections}
          currentLessonId={currentLesson.id}
          completedLessonIds={completedLessonIds}
        />
      </div>
    </div>
  )
}
