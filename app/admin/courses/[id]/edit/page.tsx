import { notFound } from "next/navigation"

import { getCourseDetailForAdmin, listCoursesForPrerequisitePicker, listInstructors } from "@/lib/courses-admin"
import { getCourseRoster } from "@/lib/learners-admin"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { CourseFormShell } from "@/components/admin/courses/CourseFormShell"

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<RawSearchParams & { new?: string }>
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams])
  const rosterParams = parseListParams<Record<string, never>>(raw, {
    prefix: "roster",
    sortable: ["enrolled_at"],
    defaultSort: "enrolled_at",
    defaultDir: "desc",
  })

  const [course, instructors, availableCoursesForPrerequisites, roster] = await Promise.all([
    getCourseDetailForAdmin(id),
    listInstructors(),
    listCoursesForPrerequisitePicker(id),
    getCourseRoster(id, rosterParams),
  ])

  if (!course) notFound()

  return (
    <CourseFormShell
      course={course}
      instructors={instructors}
      availableCoursesForPrerequisites={availableCoursesForPrerequisites}
      roster={roster}
      isNew={raw.new === "1"}
    />
  )
}
