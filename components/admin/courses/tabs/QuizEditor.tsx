"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AdminQuestion, AdminQuestionOption, AdminQuiz, AuthorableQuestionType } from "@/lib/courses-admin"
import {
  createOptionAction,
  createQuestionAction,
  deleteOptionAction,
  deleteQuestionAction,
  setCorrectOptionAction,
  updateOptionAction,
  updateQuestionAction,
  updateQuizAction,
} from "@/app/admin/courses/quiz-actions"

const QUESTION_TYPES: { value: AuthorableQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "short_answer", label: "Short Answer" },
  { value: "essay", label: "Essay" },
]

export function QuizEditor({ lessonId, quiz }: { lessonId: string; quiz: AdminQuiz | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAddQuestion() {
    startTransition(async () => {
      const result = await createQuestionAction(lessonId, {
        type: "multiple_choice",
        prompt: "",
        points: 1,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  const questions = quiz?.questions ?? []

  return (
    <div>
      {quiz && questions.length > 0 && <QuizSettings quiz={quiz} />}

      {questions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No questions yet — click Add Question to build the quiz.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index} />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={handleAddQuestion}
        disabled={isPending}
      >
        <Plus className="size-3.5" />
        Add Question
      </Button>
    </div>
  )
}

function QuizSettings({ quiz }: { quiz: AdminQuiz }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [passScore, setPassScore] = useState(String(quiz.pass_score))
  const [maxAttempts, setMaxAttempts] = useState(quiz.max_attempts ? String(quiz.max_attempts) : "")
  const [shuffle, setShuffle] = useState(quiz.shuffle)

  function save(input: Parameters<typeof updateQuizAction>[1]) {
    startTransition(async () => {
      const result = await updateQuizAction(quiz.id, input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/30 p-3">
      <div className="w-32 space-y-1.5">
        <Label htmlFor={`pass-score-${quiz.id}`}>Pass Score (%)</Label>
        <Input
          id={`pass-score-${quiz.id}`}
          type="number"
          min={0}
          max={100}
          value={passScore}
          onChange={(e) => setPassScore(e.target.value)}
          onBlur={() => save({ pass_score: Number(passScore) || 0 })}
        />
      </div>
      <div className="w-32 space-y-1.5">
        <Label htmlFor={`max-attempts-${quiz.id}`}>Max Attempts</Label>
        <Input
          id={`max-attempts-${quiz.id}`}
          type="number"
          min={0}
          placeholder="Unlimited"
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(e.target.value)}
          onBlur={() => save({ max_attempts: maxAttempts.trim() ? Number(maxAttempts) : null })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={`shuffle-${quiz.id}`}
          checked={shuffle}
          onCheckedChange={(checked) => {
            setShuffle(checked)
            save({ shuffle: checked })
          }}
        />
        <Label htmlFor={`shuffle-${quiz.id}`}>Shuffle Questions</Label>
      </div>
    </div>
  )
}

function QuestionCard({ question, index }: { question: AdminQuestion; index: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [type, setType] = useState<AuthorableQuestionType>(question.type as AuthorableQuestionType)
  const [prompt, setPrompt] = useState(question.prompt)
  const [points, setPoints] = useState(String(question.points))

  function save(input: Parameters<typeof updateQuestionAction>[1]) {
    startTransition(async () => {
      const result = await updateQuestionAction(question.id, input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleTypeChange(value: AuthorableQuestionType) {
    setType(value)
    save({ type: value })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteQuestionAction(question.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2.5 bg-muted/30 px-3 py-2">
        <span className="text-sm font-semibold whitespace-nowrap">Question {index + 1}</span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
          {QUESTION_TYPES.find((t) => t.value === type)?.label}
        </span>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setExpanded((v) => !v)}>
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3.5 p-3.5">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`question-type-${question.id}`}>Question Type</Label>
              <Select value={type} onValueChange={(value) => value && handleTypeChange(value)}>
                <SelectTrigger id={`question-type-${question.id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24 space-y-1.5">
              <Label htmlFor={`question-points-${question.id}`}>Points</Label>
              <Input
                id={`question-points-${question.id}`}
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                onBlur={() => save({ points: Number(points) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`question-prompt-${question.id}`}>Prompt</Label>
            <Textarea
              id={`question-prompt-${question.id}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onBlur={() => save({ prompt })}
              rows={2}
            />
          </div>

          {type === "multiple_choice" ? (
            <OptionsEditor questionId={question.id} options={question.options} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Learners answer in free text; these responses aren&apos;t auto-graded.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function OptionsEditor({ questionId, options }: { questionId: string; options: AdminQuestionOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAddOption() {
    startTransition(async () => {
      const result = await createOptionAction(questionId, { text: "" })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleSetCorrect(optionId: string) {
    startTransition(async () => {
      const result = await setCorrectOptionAction(questionId, optionId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleRemove(optionId: string) {
    startTransition(async () => {
      const result = await deleteOptionAction(optionId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <Label>Options</Label>
      {options.map((option) => (
        <OptionRow
          key={option.id}
          option={option}
          onSetCorrect={() => handleSetCorrect(option.id)}
          onRemove={() => handleRemove(option.id)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAddOption} disabled={isPending}>
        <Plus className="size-3.5" />
        Add Option
      </Button>
    </div>
  )
}

function OptionRow({
  option,
  onSetCorrect,
  onRemove,
}: {
  option: AdminQuestionOption
  onSetCorrect: () => void
  onRemove: () => void
}) {
  const router = useRouter()
  const [text, setText] = useState(option.text)

  function save() {
    updateOptionAction(option.id, text).then((result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        title="Mark as correct answer"
        onClick={onSetCorrect}
        className={cn(
          "size-4 shrink-0 rounded-full border-2",
          option.is_correct ? "border-primary bg-primary/20" : "border-border"
        )}
      />
      <Input value={text} onChange={(e) => setText(e.target.value)} onBlur={save} className="flex-1" />
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
        <X className="size-3.5 text-destructive" />
      </Button>
    </div>
  )
}
