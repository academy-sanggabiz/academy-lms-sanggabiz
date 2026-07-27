import { CoursesBrowser } from "@/components/learner/CoursesBrowser"
import { getPublishedCourses } from "@/lib/courses-server"
import { getEnrolledCourseIds } from "@/lib/enrollments-server"

export default async function LearnerCoursesPage() {
  const [courses, enrolledIds] = await Promise.all([
    getPublishedCourses(),
    getEnrolledCourseIds(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
      <CoursesBrowser courses={courses} enrolledIds={enrolledIds} />
    </div>
  )
}
