"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { GradingQuizSummary } from "@/lib/grading-server"

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function GradingQuizzesClient({
  courseId,
  quizzes,
}: {
  courseId: string
  courseTitle: string
  quizzes: GradingQuizSummary[]
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query) return quizzes
    const q = query.toLowerCase()
    return quizzes.filter(
      (z) => z.quizTitle.toLowerCase().includes(q) || z.lessonTitle.toLowerCase().includes(q)
    )
  }, [quizzes, query])

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Quizzes</h2>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search quiz or lesson..."
            className="w-64"
          />
          <Button
            size="sm"
            variant="outline"
            render={<a href={`/admin/grading/export?courseId=${courseId}`} />}
            nativeButton={false}
          >
            Export Course CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {quizzes.length === 0 ? "No quizzes awaiting review." : "No quizzes match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[2.4fr_1fr_1fr_1.2fr_auto] gap-3 border-b border-border bg-muted/50 px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Quiz</div>
            <div>Learners</div>
            <div>To Grade</div>
            <div>Oldest Submission</div>
            <div />
          </div>
          {filtered.map((z) => (
            <div
              key={z.quizId}
              className="grid grid-cols-[2.4fr_1fr_1fr_1.2fr_auto] items-center gap-3 border-b border-border px-3 py-3 text-[14px] last:border-b-0"
            >
              <div>
                <div className="font-semibold">{z.quizTitle}</div>
                <div className="text-xs text-muted-foreground">
                  {z.sectionTitle} · {z.lessonTitle}
                </div>
              </div>
              <div className="text-muted-foreground">{z.attemptCount}</div>
              <div className="text-muted-foreground">{z.pendingResponseCount}</div>
              <div className="text-muted-foreground">{formatDate(z.oldestSubmittedAt)}</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  render={<a href={`/admin/grading/export?quizId=${z.quizId}`} />}
                  nativeButton={false}
                >
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/admin/grading/quiz/${z.quizId}`} />}
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
