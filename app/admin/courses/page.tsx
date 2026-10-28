import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getAdminCourseList, type AdminCourseFilters } from "@/lib/courses-admin"
import { parseListParams, type RawSearchParams } from "@/lib/pagination"
import { createDraftCourseAction } from "@/app/admin/courses/actions"
import { CourseManagementClient } from "@/components/admin/courses/CourseManagementClient"

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const raw = await searchParams
  const params = parseListParams<AdminCourseFilters>(raw, {
    sortable: ["created_at", "title", "price"],
    defaultSort: "created_at",
    defaultDir: "desc",
    defaultPageSize: 12,
    filters: {
      status: ["all", "published", "draft"],
      price: ["all", "free", "paid"],
    },
  })
  const page = await getAdminCourseList(params)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[30px] font-bold">Manajemen Kursus</h1>
          <p className="text-sm text-muted-foreground">
            Buat, ubah, dan kelola semua kursus di platform belajar Anda
          </p>
        </div>
        <form action={createDraftCourseAction}>
          <Button type="submit" className="bg-brand-gradient text-white hover:brightness-105">
            <Plus className="size-4" />
            Buat Kursus
          </Button>
        </form>
      </div>

      <CourseManagementClient page={page} />
    </div>
  )
}
