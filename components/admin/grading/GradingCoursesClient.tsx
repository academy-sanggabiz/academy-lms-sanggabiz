"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { GradingCourseSummary } from "@/lib/grading-server"
import { ImportGradesDialog } from "./ImportGradesDialog"

export function GradingCoursesClient({ courses }: { courses: GradingCourseSummary[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query) return courses
    const q = query.toLowerCase()
    return courses.filter((c) => c.courseTitle.toLowerCase().includes(q))
  }, [courses, query])

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Courses</h2>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search course..."
            className="w-64"
          />
          <ImportGradesDialog />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {courses.length === 0 ? "No attempts awaiting review." : "No courses match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_220px] gap-3 border-b border-border bg-muted/50 px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Course</div>
            <div>Quizzes</div>
            <div>Learners</div>
            <div>Attempts</div>
            <div />
          </div>
          {filtered.map((c) => (
            <div
              key={c.courseId}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_220px] items-center gap-3 border-b border-border px-3 py-3 text-[14px] last:border-b-0"
            >
              <div className="font-semibold">{c.courseTitle}</div>
              <div className="text-muted-foreground">{c.quizCount}</div>
              <div className="text-muted-foreground">{c.learnerCount}</div>
              <div className="text-muted-foreground">{c.attemptCount}</div>
              <div className="flex shrink-0 items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  render={<a href={`/admin/grading/export?courseId=${c.courseId}`} />}
                  nativeButton={false}
                >
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/admin/grading/course/${c.courseId}`} />}
                  nativeButton={false}
                >
                  Open
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
