import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileText, Globe, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CourseCurriculum } from "@/components/learner/CourseCurriculum"
import { getCourseDetail } from "@/lib/courses-server"
import { isEnrolled } from "@/lib/enrollments-server"
import { formatPrice } from "@/lib/courses"
import { cn } from "@/lib/utils"
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <Button variant="outline" size="icon" render={<Link href="/learner/courses" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl leading-tight font-bold">{course.title}</h1>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6 min-w-0">
          <Card>
            <CardContent>
              <div className="mb-3.5 text-lg font-bold">Course Overview</div>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{course.description}</p>
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
              <CourseCurriculum sections={course.sections} courseId={course.id} />
            </CardContent>
          </Card>

          {course.who_for.length > 0 && (
            <Card>
              <CardContent>
                <div className="mb-3.5 text-lg font-bold">Who This Course Is For</div>
                <div className="flex flex-col gap-3.5 text-sm leading-relaxed text-muted-foreground">
                  {course.who_for.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {course.requirements.length > 0 && (
            <Card>
              <CardContent>
                <div className="mb-3.5 text-lg font-bold">Requirements</div>
                <div className="flex flex-col gap-3.5 text-sm leading-relaxed text-muted-foreground">
                  {course.requirements.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="course-thumb-placeholder size-16 shrink-0 rounded-full" />
              <div>
                <div className="text-[17px] font-bold">{course.instructor?.name ?? "Sanggabiz Team"}</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">Course Instructor</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="sticky top-20 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div
            className={cn(
              "relative mb-4 flex h-[180px] items-center justify-center overflow-hidden rounded-md font-mono text-xs text-muted-foreground",
              !course.thumbnail_url && "course-thumb-placeholder"
            )}
          >
            {course.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              "course thumbnail"
            )}
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-2xl font-bold">{price}</div>
            <span className="rounded-full bg-[#35b5c6] px-3 py-1 text-xs font-semibold text-white">{price}</span>
          </div>

          {enrolled ? (
            <Button
              size="xl"
              variant="outline"
              className="w-full border-ring bg-secondary text-primary hover:bg-secondary/80 hover:text-primary"
              render={<Link href={`/learn/${course.id}`} />}
              nativeButton={false}
            >
              Enrolled ✓ Start Learning
            </Button>
          ) : (
            <form action={enroll}>
              <input type="hidden" name="courseId" value={course.id} />
              <Button
                type="submit"
                size="xl"
                className="w-full bg-brand-gradient text-white hover:brightness-105"
              >
                Enroll Now
              </Button>
            </form>
          )}

          <div className="mt-4 flex flex-col gap-3 text-[13.5px] text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <FileText className="size-4" />
              {course.resource_count} resources
            </div>
            <div className="flex items-center gap-2.5">
              <Globe className="size-4" />
              {course.language}
            </div>
            <div className="flex items-center gap-2.5">
              <Users className="size-4" />
              {course.enrolled_count} learners enrolled
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
