import { notFound } from "next/navigation"

import { getCourseDetailForAdmin, listCoursesForPrerequisitePicker, listInstructors } from "@/lib/courses-admin"
import { CourseFormShell } from "@/components/admin/courses/CourseFormShell"

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}) {
  const [{ id }, { new: isNewParam }] = await Promise.all([params, searchParams])
  const [course, instructors, availableCoursesForPrerequisites] = await Promise.all([
    getCourseDetailForAdmin(id),
    listInstructors(),
    listCoursesForPrerequisitePicker(id),
  ])

  if (!course) notFound()

  return (
    <CourseFormShell
      course={course}
      instructors={instructors}
      availableCoursesForPrerequisites={availableCoursesForPrerequisites}
      isNew={isNewParam === "1"}
    />
  )
}
