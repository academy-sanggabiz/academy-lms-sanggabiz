import { CoursesBrowser } from "@/components/learner/CoursesBrowser"
import { getPublishedCourses } from "@/lib/courses-server"
import { getCompletedCourseIds, getEnrolledCourseIds } from "@/lib/enrollments-server"

export default async function LearnerCoursesPage() {
  const [courses, enrolledIds, completedIds] = await Promise.all([
    getPublishedCourses(),
    getEnrolledCourseIds(),
    getCompletedCourseIds(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
      <CoursesBrowser courses={courses} enrolledIds={enrolledIds} completedIds={completedIds} />
    </div>
  )
}
