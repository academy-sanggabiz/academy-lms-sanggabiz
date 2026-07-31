"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Quiz } from "@/lib/courses"
import type { QuizAttemptInfo } from "@/lib/learn-server"
import { startQuiz, submitQuiz, type SubmitQuizResult } from "@/app/learn/[courseId]/quiz-actions"

type Stage = "intro" | "active" | "results"

export function QuizPlayer({
  courseId,
  lessonId,
  quiz,
  attemptInfo,
}: {
  courseId: string
  lessonId: string
  quiz: Quiz
  attemptInfo?: QuizAttemptInfo
}) {
  const [stage, setStage] = useState<Stage>("intro")
  const [isPending, startTransition] = useTransition()
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<SubmitQuizResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const attemptsUsed = attemptInfo?.attemptsUsed ?? 0
  const attemptsRemaining = quiz.max_attempts === null ? null : quiz.max_attempts - attemptsUsed
  const canAttempt = attemptsRemaining === null || attemptsRemaining > 0
  const alreadyPassed = attemptInfo?.lastPassed === true

  function handleStart() {
    setError(null)
    startTransition(async () => {
      const res = await startQuiz(quiz.id)
      if ("error" in res) {
        setError(res.error)
        return
      }
      setAttemptId(res.attemptId)
      setAttemptNumber(res.attemptNumber)
      setQuestionIndex(0)
      setAnswers({})
      setStage("active")
    })
  }

  function handleNext(isLast: boolean) {
    if (!isLast) {
      setQuestionIndex((i) => i + 1)
      return
    }
    if (!attemptId) return
    setError(null)
    startTransition(async () => {
      const payload = quiz.questions.map((q) => ({ questionId: q.id, response: answers[q.id] ?? "" }))
      const res = await submitQuiz(attemptId, courseId, lessonId, payload)
      if ("error" in res) {
        setError(res.error)
        return
      }
      setResult(res)
      setStage("results")
    })
  }

  if (stage === "intro") {
    return (
      <div className="mx-auto w-full max-w-[640px] px-6">
        <div className="rounded-2xl border border-border bg-card p-14 text-center shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <CircleHelp className="size-6 text-ring" />
            </div>
            <div className="text-xl font-bold">{quiz.title}</div>
            <p className="text-sm text-muted-foreground">
              {quiz.questions.length} questions · test what you&apos;ve learned in this module
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {canAttempt ? (
              <Button
                size="xl"
                disabled={isPending}
                onClick={handleStart}
                className="bg-brand-gradient text-white hover:brightness-105"
              >
                {attemptsUsed > 0 ? "Retry Quiz" : "Start Quiz"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {alreadyPassed ? "You already passed this quiz." : "No attempts remaining."}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (stage === "active") {
    const question = quiz.questions[questionIndex]
    const isLast = questionIndex === quiz.questions.length - 1
    const isChoice = question.type === "multiple_choice" || question.type === "true_false"
    const selectedIds = isChoice ? (answers[question.id] ?? "").split(",").filter(Boolean) : []
    const hasAnswer = isChoice ? selectedIds.length > 0 : !!answers[question.id]?.trim()

    function toggleOption(optionId: string) {
      if (question.type === "multiple_choice" && question.allow_multiple) {
        const next = selectedIds.includes(optionId)
          ? selectedIds.filter((id) => id !== optionId)
          : [...selectedIds, optionId]
        setAnswers((a) => ({ ...a, [question.id]: next.join(",") }))
      } else {
        setAnswers((a) => ({ ...a, [question.id]: optionId }))
      }
    }

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5 p-10">
        <div className="rounded-2xl border border-border bg-card p-7">
          <div className="flex items-start justify-between gap-3.5">
            <div className="text-2xl font-bold">
              Question {questionIndex + 1} of {quiz.questions.length}
            </div>
            {quiz.max_attempts !== null && (
              <div className="shrink-0 rounded-full bg-secondary px-4 py-2 text-[13.5px] font-semibold whitespace-nowrap">
                Attempt {attemptNumber} of {quiz.max_attempts}
              </div>
            )}
          </div>
          <div className="mt-4 text-[17px]">{question.prompt}</div>
        </div>

        {isChoice ? (
          <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-6">
            {question.options.map((option) => {
              const selected = selectedIds.includes(option.id)
              const multi = question.type === "multiple_choice" && question.allow_multiple
              return (
                <button
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-5 py-4 text-left hover:border-ring",
                    selected ? "border-ring" : "border-input"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center border-2",
                      multi ? "rounded-sm" : "rounded-full",
                      selected ? "border-ring" : "border-input"
                    )}
                  >
                    {selected && <div className={cn("size-2 bg-ring", multi ? "rounded-xs" : "rounded-full")} />}
                  </div>
                  <div className="text-[15px] font-semibold">{option.text}</div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <textarea
              value={answers[question.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
              placeholder="Type your answer..."
              className="min-h-[120px] w-full resize-y rounded-lg border border-input bg-card p-3.5 text-[15px] outline-none focus:border-ring"
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          size="xl"
          disabled={!hasAnswer || isPending}
          onClick={() => handleNext(isLast)}
          className="w-full bg-brand-gradient text-white hover:brightness-105 disabled:bg-none disabled:bg-muted-foreground/40"
        >
          {isLast ? "Submit Quiz" : "Next Question"}
        </Button>
      </div>
    )
  }

  if (stage === "results" && result) {
    const canRetry = attemptsRemaining === null || attemptsRemaining - 1 > 0

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5 p-10">
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-10 text-center">
          <div className="text-[15px] font-semibold text-muted-foreground">Quiz Results</div>
          <div
            className={cn(
              "text-5xl font-bold",
              result.passed ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}
          >
            {result.score}%
          </div>
          <div className="text-[14.5px] text-muted-foreground">
            {result.correctCount} of {result.total} correct
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {quiz.questions.map((question) => {
            const isCorrect = result.perQuestion[question.id]
            const answer = answers[question.id] ?? ""
            const answerText =
              question.type === "multiple_choice" || question.type === "true_false"
                ? answer
                    .split(",")
                    .filter(Boolean)
                    .map((id) => question.options.find((o) => o.id === id)?.text ?? "—")
                    .join(", ") || "—"
                : answer || "—"

            return (
              <div
                key={question.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4.5"
              >
                {isCorrect === true && (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                )}
                {isCorrect === false && (
                  <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                )}
                {isCorrect === null && (
                  <CircleHelp className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold">{question.prompt}</div>
                  <div className="mt-1 text-[13px] text-muted-foreground">Your answer: {answerText}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          {canRetry && (
            <Button
              size="xl"
              variant="outline"
              className="flex-1"
              disabled={isPending}
              onClick={() => {
                setResult(null)
                setStage("intro")
              }}
            >
              Retry Quiz
            </Button>
          )}
          <Button
            size="xl"
            className="flex-1 bg-brand-gradient text-white hover:brightness-105"
            onClick={() => setStage("intro")}
          >
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return null
}
