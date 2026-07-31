"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Mail, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Course } from "@/lib/courses"
import type { AdminLearner } from "@/lib/learners-admin"

import { EnrollModal } from "./EnrollModal"

type LearnerFilter = "all" | "enrolled" | "completed"

export function LearnerManagementClient({
  learners,
  courses,
}: {
  learners: AdminLearner[]
  courses: Course[]
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<LearnerFilter>("all")
  const [enrollTarget, setEnrollTarget] = useState<AdminLearner | null>(null)

  const filtered = useMemo(() => {
    return learners.filter((l) => {
      if (query) {
        const q = query.toLowerCase()
        if (!l.name.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q)) return false
      }
      if (filter === "enrolled" && l.enrolledCount === 0) return false
      if (filter === "completed" && l.completedCount === 0) return false
      return true
    })
  }, [learners, query, filter])

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">All Learners</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="h-9 min-w-[240px]"
          />
          <Select value={filter} onValueChange={(value) => setFilter(value as LearnerFilter)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Learners</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No learners match your search.
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-[2fr_2fr_1.4fr] gap-3 border-b border-border px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Learner</div>
            <div>Email</div>
            <div>Actions</div>
          </div>
          {filtered.map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-[2fr_2fr_1.4fr] items-center gap-3 border-b border-border px-3 py-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-ring text-sm font-semibold text-primary-foreground uppercase">
                  {l.initial}
                </span>
                <span className="text-[14.5px] font-semibold">{l.name}</span>
              </div>
              <div className="flex items-center gap-2 truncate text-[13.5px] text-muted-foreground">
                <Mail className="size-[15px] shrink-0" />
                <span className="truncate">{l.email}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/admin/learners/${l.id}`} />}
                  nativeButton={false}
                >
                  View Details
                </Button>
                <Button size="sm" onClick={() => setEnrollTarget(l)}>
                  <Plus className="size-3.5" />
                  Enroll
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EnrollModal
        learner={enrollTarget}
        courses={courses}
        onClose={() => setEnrollTarget(null)}
      />
    </div>
  )
}
