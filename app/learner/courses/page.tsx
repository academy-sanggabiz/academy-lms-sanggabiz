import { CoursesBrowser } from "@/components/learner/CoursesBrowser"
import { getPublishedCourses } from "@/lib/courses-server"

export default async function LearnerCoursesPage() {
  const courses = await getPublishedCourses()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
      <CoursesBrowser courses={courses} />
    </div>
  )
}
