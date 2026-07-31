import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getAdminCourseList } from "@/lib/courses-admin"
import { createDraftCourseAction } from "@/app/admin/courses/actions"
import { CourseManagementClient } from "@/components/admin/courses/CourseManagementClient"

export default async function AdminCoursesPage() {
  const courses = await getAdminCourseList()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[30px] font-bold">Course Management</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, and manage all courses in your learning platform
          </p>
        </div>
        <form action={createDraftCourseAction}>
          <Button type="submit" className="bg-brand-gradient text-white hover:brightness-105">
            <Plus className="size-4" />
            Create Course
          </Button>
        </form>
      </div>

      <CourseManagementClient courses={courses} />
    </div>
  )
}
