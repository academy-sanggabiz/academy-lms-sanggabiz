"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Learner</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-ring text-sm font-semibold text-primary-foreground uppercase">
                        {l.initial}
                      </span>
                      <span className="text-[14.5px] font-semibold whitespace-nowrap">{l.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-0 text-[13.5px] text-muted-foreground">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="size-[15px] shrink-0" />
                      <span className="truncate">{l.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
