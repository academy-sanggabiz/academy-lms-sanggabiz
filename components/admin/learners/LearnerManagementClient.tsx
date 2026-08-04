"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Course } from "@/lib/courses"
import type { Paginated } from "@/lib/pagination"
import type { AdminLearner } from "@/lib/learners-admin"
import { ListFilterSelect } from "@/components/admin/ListFilterSelect"
import { ListPagination } from "@/components/admin/ListPagination"
import { ListToolbar } from "@/components/admin/ListToolbar"

import { EnrollModal } from "./EnrollModal"

export function LearnerManagementClient({
  page,
  courses,
}: {
  page: Paginated<AdminLearner>
  courses: Course[]
}) {
  const [enrollTarget, setEnrollTarget] = useState<AdminLearner | null>(null)

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">All Learners</h2>
        <ListToolbar placeholder="Search by name or email...">
          <ListFilterSelect
            paramKey="filter"
            defaultValue="all"
            placeholder="Filter"
            options={[
              { value: "all", label: "All Learners" },
              { value: "enrolled", label: "Enrolled" },
              { value: "completed", label: "Completed" },
            ]}
          />
        </ListToolbar>
      </div>

      {page.rows.length === 0 ? (
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
          {page.rows.map((l) => (
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

      <ListPagination meta={page} />

      <EnrollModal
        learner={enrollTarget}
        courses={courses}
        onClose={() => setEnrollTarget(null)}
      />
    </div>
  )
}
