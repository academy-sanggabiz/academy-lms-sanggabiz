"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { PendingAttemptSummary } from "@/lib/grading-server"
import { ImportGradesDialog } from "./ImportGradesDialog"

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

type CourseGroup = {
  courseId: string
  courseTitle: string
  quizzes: [string, string][]
  attempts: PendingAttemptSummary[]
}

export function GradingListClient({ attempts }: { attempts: PendingAttemptSummary[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query) return attempts
    const q = query.toLowerCase()
    return attempts.filter(
      (a) =>
        a.learnerName.toLowerCase().includes(q) ||
        a.learnerEmail.toLowerCase().includes(q) ||
        a.courseTitle.toLowerCase().includes(q) ||
        a.quizTitle.toLowerCase().includes(q)
    )
  }, [attempts, query])

  const courseGroups = useMemo(() => {
    const groups = new Map<string, CourseGroup>()
    for (const a of filtered) {
      const courseKey = a.courseId || "unknown"
      let group = groups.get(courseKey)
      if (!group) {
        group = { courseId: courseKey, courseTitle: a.courseTitle, quizzes: [], attempts: [] }
        groups.set(courseKey, group)
      }
      group.attempts.push(a)
      if (a.quizId && !group.quizzes.some(([id]) => id === a.quizId)) {
        group.quizzes.push([a.quizId, a.quizTitle])
      }
    }
    return [...groups.values()].sort((a, b) => a.courseTitle.localeCompare(b.courseTitle))
  }, [filtered])

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Pending Attempts</h2>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search learner, course, or quiz..."
            className="w-64"
          />
          <ImportGradesDialog />
        </div>
      </div>

      {courseGroups.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {attempts.length === 0 ? "No attempts awaiting review." : "No attempts match your search."}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {courseGroups.map((group) => (
            <div key={group.courseId}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[15px] font-bold">{group.courseTitle}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Export CSV:</span>
                  {group.quizzes.map(([quizId, title]) => (
                    <Button
                      key={quizId}
                      size="sm"
                      variant="outline"
                      render={<a href={`/admin/grading/export?quizId=${quizId}`} />}
                      nativeButton={false}
                    >
                      {title}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-[2fr_1.6fr_1fr_1fr_auto] gap-3 border-b border-border bg-muted/50 px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
                  <div>Learner</div>
                  <div>Quiz</div>
                  <div>To Grade</div>
                  <div>Submitted</div>
                  <div />
                </div>
                {group.attempts.map((a) => (
                  <div
                    key={a.attemptId}
                    className="grid grid-cols-[2fr_1.6fr_1fr_1fr_auto] items-center gap-3 border-b border-border px-3 py-3 text-[14px] last:border-b-0"
                  >
                    <div>
                      <div className="font-semibold">{a.learnerName}</div>
                      <div className="text-xs text-muted-foreground">{a.learnerEmail}</div>
                    </div>
                    <div className="text-muted-foreground">{a.quizTitle}</div>
                    <div className="text-muted-foreground">{a.pendingCount}</div>
                    <div className="text-muted-foreground">{formatDate(a.submittedAt)}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/admin/grading/${a.attemptId}`} />}
                      nativeButton={false}
                    >
                      Grade
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
