"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Paginated } from "@/lib/pagination"
import type { TrackingEnrollment } from "@/lib/tracking-server"
import { ListPagination } from "@/components/admin/ListPagination"
import { ListToolbar } from "@/components/admin/ListToolbar"

export function TrackingListClient({ page }: { page: Paginated<TrackingEnrollment> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Learners</h2>
        <ListToolbar placeholder="Search learner or course..." />
      </div>

      {page.rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {page.total === 0 ? "No enrollments yet." : "No learners match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rows.map((e) => (
                <TableRow key={e.enrollmentId} className="text-[14px]">
                  <TableCell>
                    <div className="font-semibold">{e.learnerName}</div>
                    <div className="text-xs text-muted-foreground">{e.learnerEmail}</div>
                  </TableCell>
                  <TableCell className="max-w-0 truncate text-muted-foreground">{e.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{e.modulePct}%</TableCell>
                  <TableCell className="text-muted-foreground">{e.assignmentPct}%</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/admin/tracking/${e.enrollmentId}`} />}
                      nativeButton={false}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ListPagination meta={page} />
    </div>
  )
}
