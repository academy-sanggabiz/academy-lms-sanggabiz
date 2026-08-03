"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AttemptGradingDetail } from "@/lib/grading-server"
import { gradeAttemptAction } from "@/app/admin/grading/actions"

export function AttemptGradingForm({ detail }: { detail: AttemptGradingDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const essayQuestions = detail.questions.filter((q) => q.isCorrect === null)
  const [points, setPoints] = useState<Record<string, string>>(
    Object.fromEntries(essayQuestions.map((q) => [q.id, q.pointsAwarded?.toString() ?? ""]))
  )

  function handleSubmit() {
    const grades = essayQuestions.map((q) => ({
      questionId: q.id,
      points: Number(points[q.id]) || 0,
    }))

    const invalid = grades.find((g, i) => g.points < 0 || g.points > essayQuestions[i].points)
    if (invalid) {
      toast.error("Points must be within each question's max points")
      return
    }

    startTransition(async () => {
      const result = await gradeAttemptAction(detail.attemptId, grades)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Attempt graded")
      router.push("/admin/grading")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {detail.questions.map((question) => {
        const isEssay = question.isCorrect === null
        return (
          <div key={question.id} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-2 flex items-start justify-between gap-3">
              {isEssay ? (
                <div className="lesson-prose" dangerouslySetInnerHTML={{ __html: question.prompt }} />
              ) : (
                <div className="text-[15px] font-semibold">{question.prompt}</div>
              )}
              <div className="shrink-0 text-xs font-medium text-muted-foreground">
                {isEssay ? "Essay" : question.isCorrect ? "Correct" : "Incorrect"} · {question.points} pt
                {question.points === 1 ? "" : "s"}
              </div>
            </div>
            {isEssay ? (
              <div className="rounded-lg bg-muted p-3.5 text-[14px]">
                {question.response ? (
                  <div className="lesson-prose" dangerouslySetInnerHTML={{ __html: question.response }} />
                ) : (
                  "—"
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-muted p-3.5 text-[14px] whitespace-pre-wrap">
                {question.response || "—"}
              </div>
            )}
            {isEssay && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Score</span>
                <Input
                  type="number"
                  min={0}
                  max={question.points}
                  value={points[question.id] ?? ""}
                  onChange={(e) => setPoints((p) => ({ ...p, [question.id]: e.target.value }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">/ {question.points}</span>
              </div>
            )}
          </div>
        )
      })}

      <Button
        size="xl"
        disabled={isPending}
        onClick={handleSubmit}
        className="w-fit bg-brand-gradient text-white hover:brightness-105"
      >
        Save Grades
      </Button>
    </div>
  )
}
