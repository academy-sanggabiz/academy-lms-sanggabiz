import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Eye } from "lucide-react"

import { requireAdmin } from "@/lib/auth/require-admin"
import { getCourseDetailForAdmin } from "@/lib/courses-admin"
import { Badge } from "@/components/ui/badge"
import { LearnSidebar } from "@/components/learn/LearnSidebar"
import { LessonPane } from "@/components/learn/LessonPane"

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
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3.5 border-b border-border bg-card px-5">
        <Link
          href={`/admin/courses/preview/${courseId}`}
          title="Back to course overview"
          className="flex size-9 items-center justify-center rounded-lg border border-input hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <img src="/logo.png" alt="Sanggabiz" className="size-7 object-contain" />
        <div className="min-w-0 flex-1 truncate text-sm font-semibold">{course.title}</div>
        <Badge variant="outline" className="flex items-center gap-1.5">
          <Eye className="size-3.5" />
          Preview Mode
        </Badge>
      </header>

      <div className="flex min-h-0 flex-1">
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
        <LearnSidebar
          courseId={courseId}
          sections={course.sections}
          currentLessonId={currentLesson.id}
          completedLessonIds={new Set()}
          basePath="/admin-preview"
          mode="admin-preview"
        />
      </div>
    </div>
  )
}
