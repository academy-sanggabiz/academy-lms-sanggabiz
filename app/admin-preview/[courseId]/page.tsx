import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Eye } from "lucide-react"

import { requireAdmin } from "@/lib/auth/require-admin"
import { getCourseDetailForAdmin } from "@/lib/courses-admin"
import { Badge } from "@/components/ui/badge"
import { LearnShell } from "@/components/learn/LearnShell"
import { LearnSidebar } from "@/components/learn/LearnSidebar"
import { LessonPane } from "@/components/learn/LessonPane"

export const metadata = { title: "Pratinjau kursus" }

export default async function AdminPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ lesson?: string }>
}) {
  const { courseId } = await params
  const { lesson: lessonParam } = await searchParams

  try {
    await requireAdmin()
  } catch {
    redirect("/auth/login")
  }

  const course = await getCourseDetailForAdmin(courseId)
  if (!course) notFound()

  const allLessons = course.sections.flatMap((s) => s.lessons)
  if (allLessons.length === 0) {
    redirect(`/admin/courses/preview/${courseId}`)
  }

  const currentLesson = allLessons.find((l) => l.id === lessonParam) ?? allLessons[0]

  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id)
  const prevLessonId = currentIndex > 0 ? allLessons[currentIndex - 1].id : null
  const nextLessonId = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1].id : null

  return (
    <LearnShell
      header={
        <>
          <Link
            href={`/admin/courses/preview/${courseId}`}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-input hover:bg-muted"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="sr-only">Back to course overview</span>
          </Link>
          <img src="/logo.png" alt="" className="hidden size-7 object-contain sm:block" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{course.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              Lesson {currentIndex + 1} of {allLessons.length}
            </div>
          </div>
          <Badge variant="outline" className="flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden />
            Preview Mode
          </Badge>
        </>
      }
      pane={
        <LessonPane
          key={currentLesson.id}
          courseId={courseId}
          course={course}
          lesson={currentLesson}
          prevLessonId={prevLessonId}
          nextLessonId={nextLessonId}
          basePath="/admin-preview"
          mode="admin-preview"
        />
      }
      sidebar={
        <LearnSidebar
          courseId={courseId}
          sections={course.sections}
          currentLessonId={currentLesson.id}
          completedLessonIds={new Set()}
          basePath="/admin-preview"
          mode="admin-preview"
        />
      }
    />
  )
}
