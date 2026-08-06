"use client"

import type { Course } from "@/lib/courses"
import type { Paginated } from "@/lib/pagination"
import { ListPagination } from "@/components/admin/ListPagination"

import { CourseListCard } from "./CourseListCard"
import { CourseListToolbar } from "./CourseListToolbar"

export function CourseManagementClient({ page }: { page: Paginated<Course> }) {
  return (
    <div>
      <CourseListToolbar />

      {page.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {page.total === 0
            ? "No courses yet — click Create Course to add your first one."
            : "No courses match your filters."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.rows.map((course) => (
              <CourseListCard key={course.id} course={course} />
            ))}
          </div>
          <ListPagination meta={page} hidePageSize />
        </>
      )}
    </div>
  )
}
