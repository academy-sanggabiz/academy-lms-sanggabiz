"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { TrackingEnrollment } from "@/lib/tracking-server"

export function TrackingListClient({ enrollments }: { enrollments: TrackingEnrollment[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query) return enrollments
    const q = query.toLowerCase()
    return enrollments.filter(
      (e) =>
        e.learnerName.toLowerCase().includes(q) ||
        e.learnerEmail.toLowerCase().includes(q) ||
        e.courseTitle.toLowerCase().includes(q)
    )
  }, [enrollments, query])

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Learners</h2>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search learner or course..."
          className="w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {enrollments.length === 0 ? "No enrollments yet." : "No learners match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_100px] gap-3 border-b border-border bg-muted/50 px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Learner</div>
            <div>Course</div>
            <div>Module</div>
            <div>Assignment</div>
            <div />
          </div>
          {filtered.map((e) => (
            <div
              key={e.enrollmentId}
              className="grid grid-cols-[2fr_2fr_1fr_1fr_100px] items-center gap-3 border-b border-border px-3 py-3 text-[14px] last:border-b-0"
            >
              <div>
                <div className="font-semibold">{e.learnerName}</div>
                <div className="text-xs text-muted-foreground">{e.learnerEmail}</div>
              </div>
              <div className="min-w-0 truncate text-muted-foreground">{e.courseTitle}</div>
              <div className="text-muted-foreground">{e.modulePct}%</div>
              <div className="text-muted-foreground">{e.assignmentPct}%</div>
              <div className="flex shrink-0 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/admin/tracking/${e.enrollmentId}`} />}
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
