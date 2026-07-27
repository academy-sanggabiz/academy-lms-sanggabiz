import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen, Clock, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CourseCurriculum } from "@/components/learner/CourseCurriculum"
import { getCourseDetail } from "@/lib/courses-server"
import { isEnrolled } from "@/lib/enrollments-server"
import { formatPrice } from "@/lib/courses"
import { enroll } from "@/app/learner/courses/actions"

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const course = await getCourseDetail(id)
  if (!course) notFound()

  const enrolled = await isEnrolled(course.id)
  const price = formatPrice(course.price)
  const resourceCount = course.sections
    .flatMap((s) => s.lessons)
    .length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <Button variant="outline" size="icon" render={<Link href="/learner/courses" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl leading-tight font-bold">{course.title}</h1>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <div className="mb-3.5 text-lg font-bold">Course Overview</div>
              <p className="text-sm leading-relaxed text-muted-foreground">{course.description}</p>
              <div className="mt-4 flex gap-2 border-t border-muted pt-4 text-[13px] text-muted-foreground">
                <span>{course.lesson_count} lessons</span>
                <span>·</span>
                <span>{course.duration_hours} hours</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="mb-2 text-lg font-bold">Course Content</div>
              <CourseCurriculum sections={course.sections} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="course-thumb-placeholder size-16 shrink-0 rounded-full" />
              <div>
                <div className="text-[17px] font-bold">Course Instructor</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">Sanggabiz Team</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="sticky top-20 p-1">
          <CardContent>
            <div className="course-thumb-placeholder mb-4 flex h-[180px] items-center justify-center rounded-md font-mono text-xs text-muted-foreground">
              course thumbnail
            </div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-2xl font-bold">{price}</div>
              <span className="rounded-full bg-ring px-3 py-1 text-xs font-semibold text-white">{price}</span>
            </div>

            {enrolled ? (
              <Button className="w-full" variant="secondary" disabled>
                Enrolled ✓
              </Button>
            ) : (
              <form action={enroll}>
                <input type="hidden" name="courseId" value={course.id} />
                <Button type="submit" className="w-full bg-brand-gradient text-white hover:brightness-105">
                  Enroll Now
                </Button>
              </form>
            )}

            <div className="mt-4 flex flex-col gap-3 text-[13.5px] text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <FileText className="size-4" />
                {resourceCount} lessons
              </div>
              <div className="flex items-center gap-2.5">
                <BookOpen className="size-4" />
                {course.sections.length} modules
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="size-4" />
                {course.duration_hours} hours
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
