"use client"

import { useMemo, useState } from "react"

import type { Course } from "@/lib/courses"

import { CourseListCard } from "./CourseListCard"
import { CourseListToolbar, type PriceFilter, type StatusFilter } from "./CourseListToolbar"

export function CourseManagementClient({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [price, setPrice] = useState<PriceFilter>("all")

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      if (query && !course.title.toLowerCase().includes(query.toLowerCase())) return false
      if (status !== "all" && course.status !== status) return false
      if (price === "free" && course.price > 0) return false
      if (price === "paid" && course.price <= 0) return false
      return true
    })
  }, [courses, query, status, price])

  return (
    <div>
      <CourseListToolbar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        price={price}
        onPriceChange={setPrice}
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {courses.length === 0
            ? "No courses yet — click Create Course to add your first one."
            : "No courses match your filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseListCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}
