import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileText, Globe, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CourseCurriculumGate } from "@/components/learner/CourseCurriculumGate"
import { EnrollButton } from "@/components/learner/EnrollButton"
import { getCourseDetail } from "@/lib/courses-server"
import { getEnrollmentProgress, getLearnerCourseGrade } from "@/lib/enrollments-server"
import { formatCourseAccess } from "@/lib/courses"
import { cn } from "@/lib/utils"

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ enroll?: string }>
}) {
  const { id } = await params
  const { enroll: enrollParam } = await searchParams
  const course = await getCourseDetail(id)
  if (!course) notFound()

  const { enrolled, started } = await getEnrollmentProgress(course.id)
  const courseGrade = enrolled ? await getLearnerCourseGrade(course.id) : null
  const price = formatCourseAccess(course)
  const initialOpen = enrollParam === "required"

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
              <CourseCurriculumGate
                sections={course.sections}
                courseId={course.id}
                enrolled={enrolled}
                initialOpen={initialOpen}
              />
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

          <EnrollButton
            courseId={course.id}
            state={!enrolled ? "not_enrolled" : started ? "in_progress" : "not_started"}
            size="xl"
            className="w-full"
          />

          {courseGrade && courseGrade.available > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Course Grade</span>
                <span className="text-lg font-bold">{courseGrade.grade}%</span>
              </div>
              {courseGrade.pendingCount > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {courseGrade.pendingCount} assessment{courseGrade.pendingCount === 1 ? "" : "s"} awaiting
                  instructor review — grade may still rise.
                </p>
              )}
            </div>
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
