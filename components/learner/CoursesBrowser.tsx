"use client"

import { useMemo, useState } from "react"
import { ArrowUpDown, ChevronDown, Check } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CourseGridCard } from "@/components/learner/CourseGridCard"
import type { Course } from "@/lib/courses"

type SortKey = "newest" | "title" | "price"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "title", label: "Title A–Z" },
  { key: "price", label: "Price: Low to High" },
]

export function CoursesBrowser({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("newest")

  const visibleCourses = useMemo(() => {
    const filtered = courses.filter((c) =>
      c.title.toLowerCase().includes(query.trim().toLowerCase())
    )

    const sorted = [...filtered]
    if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === "price") sorted.sort((a, b) => a.price - b.price)
    if (sort === "newest")
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return sorted
  }, [courses, query, sort])

  const sortLabel = sortOptions.find((o) => o.key === sort)?.label ?? "Sort"

  return (
    <div className="space-y-5">
      <div className="flex gap-3.5">
        <Input
          placeholder="Search courses..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 flex-1 rounded-[10px] bg-card px-4"
        />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-11 items-center gap-2.5 rounded-[10px] border border-input bg-card px-4.5 text-sm font-medium hover:border-ring">
            <ArrowUpDown className="size-[15px]" />
            {sortLabel}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {sortOptions.map((o) => (
              <DropdownMenuItem key={o.key} onClick={() => setSort(o.key)}>
                <span className="flex size-4 items-center justify-center">
                  {sort === o.key && <Check className="size-3.5 text-ring" />}
                </span>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mx-auto h-auto w-fit gap-1.5 rounded-[10px] bg-secondary p-1.5">
          <TabsTrigger value="all" className="h-9 rounded-lg px-4 data-active:bg-card">
            All Courses
          </TabsTrigger>
          <TabsTrigger value="enrolled" className="h-9 rounded-lg px-4 data-active:bg-card">
            Enrolled
          </TabsTrigger>
          <TabsTrigger value="completed" className="h-9 rounded-lg px-4 data-active:bg-card">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {visibleCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCourses.map((course) => (
                <CourseGridCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState message="No courses match your search." />
          )}
        </TabsContent>

        <TabsContent value="enrolled" className="mt-6">
          <EmptyState message="You haven't enrolled in any courses yet." />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <EmptyState message="You haven't completed any courses yet." />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-16 text-center text-sm text-muted-foreground/70">
        {message}
      </CardContent>
    </Card>
  )
}
