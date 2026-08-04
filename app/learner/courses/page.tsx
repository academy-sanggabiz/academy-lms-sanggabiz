import { CoursesBrowser } from "@/components/learner/CoursesBrowser"
import { getEnrolledCourses, getPublishedCourses } from "@/lib/courses-server"
import { getCompletedCourseIds, getEnrolledCourseIds } from "@/lib/enrollments-server"

export default async function LearnerCoursesPage() {
  // Two separate lists on purpose: the catalog (`courses`, public only) drives
  // the All tab, while `enrolledCourses` drives Enrolled/Completed so private
  // courses the learner was invited to still show up there.
  const [courses, enrolledCourses, enrolledIds, completedIds] = await Promise.all([
    getPublishedCourses(),
    getEnrolledCourses(),
    getEnrolledCourseIds(),
    getCompletedCourseIds(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
      <CoursesBrowser
        courses={courses}
        enrolledCourses={enrolledCourses}
        enrolledIds={enrolledIds}
        completedIds={completedIds}
      />
    </div>
  )
}
