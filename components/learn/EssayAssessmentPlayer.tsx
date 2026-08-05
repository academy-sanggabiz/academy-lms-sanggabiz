"use client"

import { useRef, useState, useTransition, type ReactNode } from "react"
import { CheckCircle2, Clock, LinkIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Question, Quiz } from "@/lib/courses"
import type { QuizAttemptInfo } from "@/lib/learn-server"
import { saveDraft, startAssessmentAttempt, submitQuiz } from "@/app/learn/[courseId]/quiz-actions"
import { RichTextEditor } from "@/components/admin/courses/RichTextEditor"
import { QuestionPrompt } from "@/components/learn/QuestionPrompt"

type Phase = "form" | "pending" | "graded"

export function EssayAssessmentPlayer({
  quiz,
  attemptInfo,
}: {
  quiz: Quiz
  attemptInfo?: QuizAttemptInfo
}) {
  const attemptsUsed = attemptInfo?.attemptsUsed ?? 0
  const attemptsRemaining = quiz.max_attempts === null ? null : quiz.max_attempts - attemptsUsed
  const canAttempt = attemptsRemaining === null || attemptsRemaining > 0

  const initialPhase: Phase = attemptInfo?.pendingReview
    ? "pending"
    : attemptInfo?.lastPassed != null
      ? "graded"
      : "form"

  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [attemptId, setAttemptId] = useState<string | null>(attemptInfo?.inProgressAttemptId ?? null)
  const [answers, setAnswers] = useState<Record<string, string>>(attemptInfo?.draftAnswers ?? {})
  // RichTextEditor's onChange is debounced, so a click that blurs the editor
  // and triggers Save/Submit in the same tick can still race the state
  // update -- this ref is the source of truth save/submit actually read
  // from, kept in lockstep with `answers` on every change.
  const answersRef = useRef(answers)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()
  const [isSubmitting, startSubmitting] = useTransition()

  function setAnswer(questionId: string, value: string) {
    const next = { ...answersRef.current, [questionId]: value }
    answersRef.current = next
    setAnswers(next)
  }

  // Get-or-create the learner's open attempt, caching its id locally so repeated
  // saves/submit reuse the same attempt rather than spawning duplicates.
  async function ensureAttempt(): Promise<string | null> {
    if (attemptId) return attemptId
    const res = await startAssessmentAttempt(quiz.id)
    if ("error" in res) {
      setError(res.error)
      return null
    }
    setAttemptId(res.attemptId)
    return res.attemptId
  }

  function handleSaveDraft() {
    setError(null)
    startSaving(async () => {
      const id = await ensureAttempt()
      if (!id) return
      const res = await saveDraft(id, answersRef.current)
      if ("error" in res) {
        setError(res.error)
        return
      }
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    })
  }

  function handleSubmit() {
    setError(null)
    startSubmitting(async () => {
      const id = await ensureAttempt()
      if (!id) return
      const res = await submitQuiz(id, answersRef.current)
      if ("error" in res) {
        setError(res.error)
        return
      }
      setPhase("pending")
    })
  }

  if (phase === "pending") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
            <Clock className="size-6 text-ring" />
          </div>
          <div className="text-xl font-bold">Submitted — awaiting review</div>
          <p className="max-w-md text-sm text-muted-foreground">
            Your assessment has been submitted to your instructor for grading. You&apos;ll see your
            result here once it&apos;s been reviewed.
          </p>
        </div>
      </Shell>
    )
  }

  if (phase === "graded") {
    const passed = attemptInfo?.lastPassed === true
    return (
      <Shell>
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-12 text-center">
          <div className="text-[15px] font-semibold text-muted-foreground">Assessment Result</div>
          {attemptInfo?.lastScore != null ? (
            <div
              className={cn(
                "text-5xl font-bold",
                passed ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              )}
            >
              {attemptInfo.lastScore}%
            </div>
          ) : (
            <div className="flex items-center gap-2 text-2xl font-bold">
              <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
              Reviewed
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {passed ? "You passed this assessment." : "This attempt did not pass."}
          </p>
          {canAttempt && (
            <Button
              size="xl"
              variant="outline"
              className="mt-2"
              onClick={() => {
                answersRef.current = {}
                setAnswers({})
                setAttemptId(null)
                setSavedAt(null)
                setPhase("form")
              }}
            >
              Start New Attempt
            </Button>
          )}
        </div>
      </Shell>
    )
  }

  if (!canAttempt) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No attempts remaining for this assessment.
        </div>
      </Shell>
    )
  }

  const isBusy = isSaving || isSubmitting

  return (
    <Shell>
      <div className="text-2xl font-bold">{quiz.title}</div>

      {quiz.questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          value={answers[question.id] ?? ""}
          onChange={(value) => setAnswer(question.id, value)}
        />
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="sticky bottom-0 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur">
        <div className="flex-1 text-xs text-muted-foreground">
          {savedAt ? `Draft saved at ${savedAt}` : "Not saved yet"}
        </div>
        <Button variant="outline" size="lg" disabled={isBusy} onClick={handleSaveDraft}>
          {isSaving ? "Saving…" : "Save Draft"}
        </Button>
        <Button
          size="lg"
          disabled={isBusy}
          onClick={handleSubmit}
          className="bg-brand-gradient text-white hover:brightness-105"
        >
          {isSubmitting ? "Submitting…" : "Submit Assessment"}
        </Button>
      </div>
    </Shell>
  )
}

function QuestionCard({
  question,
  index,
  value,
  onChange,
}: {
  question: Question
  index: number
  value: string
  onChange: (value: string) => void
}) {
  const isChoice = question.type === "multiple_choice" || question.type === "true_false"
  const selectedIds = isChoice ? value.split(",").filter(Boolean) : []

  function toggleOption(optionId: string) {
    if (question.type === "multiple_choice" && question.allow_multiple) {
      const next = selectedIds.includes(optionId)
        ? selectedIds.filter((id) => id !== optionId)
        : [...selectedIds, optionId]
      onChange(next.join(","))
    } else {
      onChange(optionId)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-7">
      <div className="text-sm font-semibold text-muted-foreground">Question {index + 1}</div>

      <QuestionPrompt prompt={question.prompt} className="text-[17px]" />

      {isChoice ? (
        <div className="flex flex-col gap-3">
          {question.options.map((option) => {
            const selected = selectedIds.includes(option.id)
            const multi = question.type === "multiple_choice" && question.allow_multiple
            return (
              <button
                key={option.id}
                type="button"
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
      ) : question.type === "essay" ? (
        <RichTextEditor value={value} onChange={onChange} />
      ) : question.type === "file_upload" ? (
        <FileUploadAnswer value={value} onChange={onChange} />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          className="min-h-[120px] w-full resize-y rounded-lg border border-input bg-card p-3.5 text-[15px] outline-none focus:border-ring"
        />
      )}
    </div>
  )
}

// Renders a file_upload answer as a plain link field -- the learner pastes a
// URL to their file (e.g. a Google Drive share link) instead of uploading a
// binary, so `value` is always a plain URL string, viewable directly.
export function FileUploadAnswer({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://drive.google.com/... (link to your PDF or document)"
      />
      {value && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-2 text-sm text-ring hover:underline"
        >
          <LinkIcon className="size-4" />
          Open submitted link
        </a>
      )}
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10">{children}</div>
}
