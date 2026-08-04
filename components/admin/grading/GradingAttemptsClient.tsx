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

export function GradingAttemptsClient({
  quizId,
  attempts,
}: {
  quizId: string
  attempts: PendingAttemptSummary[]
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query) return attempts
    const q = query.toLowerCase()
    return attempts.filter(
      (a) => a.learnerName.toLowerCase().includes(q) || a.learnerEmail.toLowerCase().includes(q)
    )
  }, [attempts, query])

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Learners</h2>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search learner..."
            className="w-64"
          />
          <Button
            size="sm"
            variant="outline"
            render={<a href={`/admin/grading/export?quizId=${quizId}`} />}
            nativeButton={false}
          >
            Export CSV
          </Button>
          <ImportGradesDialog />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {attempts.length === 0 ? "No attempts awaiting review." : "No learners match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[2fr_1fr_1.2fr_auto] gap-3 border-b border-border bg-muted/50 px-3 py-2.5 text-[13px] font-semibold text-muted-foreground">
            <div>Learner</div>
            <div>To Grade</div>
            <div>Submitted</div>
            <div />
          </div>
          {filtered.map((a) => (
            <div
              key={a.attemptId}
              className="grid grid-cols-[2fr_1fr_1.2fr_auto] items-center gap-3 border-b border-border px-3 py-3 text-[14px] last:border-b-0"
            >
              <div>
                <div className="font-semibold">{a.learnerName}</div>
                <div className="text-xs text-muted-foreground">{a.learnerEmail}</div>
              </div>
              <div className="text-muted-foreground">{a.pendingCount}</div>
              <div className="text-muted-foreground">{formatDate(a.submittedAt)}</div>
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/admin/grading/attempt/${a.attemptId}`} />}
                nativeButton={false}
              >
                Grade
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
