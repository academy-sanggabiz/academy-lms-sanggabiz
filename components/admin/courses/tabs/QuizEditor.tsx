"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "../RichTextEditor"
import type { AdminQuestion, AdminQuestionOption, AdminQuiz, AuthorableQuestionType } from "@/lib/courses-admin"
import {
  createOptionAction,
  createQuestionAction,
  deleteOptionAction,
  deleteQuestionAction,
  setCorrectOptionAction,
  toggleCorrectOptionAction,
  updateOptionAction,
  updateQuestionAction,
  updateQuizAction,
} from "@/app/admin/courses/quiz-actions"

const QUESTION_TYPES: { value: AuthorableQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "essay", label: "Long Answer" },
  { value: "file_upload", label: "File Upload" },
]

export function QuizEditor({ lessonId, quiz }: { lessonId: string; quiz: AdminQuiz | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<AuthorableQuestionType>("multiple_choice")

  function openPicker() {
    // Always start from the default rather than remembering the last pick.
    setSelectedType("multiple_choice")
    setPickerOpen(true)
  }

  function handleAddQuestion(type: AuthorableQuestionType) {
    startTransition(async () => {
      const result = await createQuestionAction(lessonId, { type, prompt: "", points: 1 })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPickerOpen(false)
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
        onClick={openPicker}
        disabled={isPending}
      >
        <Plus className="size-3.5" />
        Add Question
      </Button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>Choose a question type. This can&apos;t be changed later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as AuthorableQuestionType)}
            >
              {QUESTION_TYPES.map((t) => (
                <label key={t.value} className="flex items-center gap-2.5 text-sm">
                  <RadioGroupItem value={t.value} />
                  {t.label}
                </label>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPickerOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddQuestion(selectedType)}
              disabled={isPending}
            >
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuizSettings({ quiz }: { quiz: AdminQuiz }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [passScore, setPassScore] = useState(String(quiz.pass_score))
  const [maxAttempts, setMaxAttempts] = useState(quiz.max_attempts ? String(quiz.max_attempts) : "")
  const [shuffle, setShuffle] = useState(quiz.shuffle)
  const [isAssessment, setIsAssessment] = useState(quiz.is_assessment)

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
      <div className="flex w-full items-start gap-2 border-t border-border pt-3">
        <Switch
          id={`assessment-${quiz.id}`}
          checked={isAssessment}
          onCheckedChange={(checked) => {
            setIsAssessment(checked)
            save({ is_assessment: checked })
          }}
        />
        <div className="space-y-0.5">
          <Label htmlFor={`assessment-${quiz.id}`}>Study-case assessment</Label>
          <p className="text-xs text-muted-foreground">
            No start gate or timer; learners save drafts and submit when done. Grade manually in
            Admin › Grading.
          </p>
        </div>
      </div>
    </div>
  )
}

function QuestionCard({ question, index }: { question: AdminQuestion; index: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [prompt, setPrompt] = useState(question.prompt)
  const [points, setPoints] = useState(String(question.points))
  const [allowMultiple, setAllowMultiple] = useState(question.allow_multiple)
  const [caseSensitive, setCaseSensitive] = useState(question.case_sensitive)

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

  const typeLabel = QUESTION_TYPES.find((t) => t.value === question.type)?.label ?? question.type

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2.5 bg-muted/30 px-3 py-2">
        <span className="text-sm font-semibold whitespace-nowrap">Question {index + 1}</span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
          {typeLabel}
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
          <div className="space-y-1.5">
            <Label>Prompt</Label>
            <RichTextEditor
              value={prompt}
              onBlur={(html) => {
                const next = html.replace(/<[^>]*>/g, "").trim() ? html : ""
                setPrompt(next)
                save({ prompt: next })
              }}
            />
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

          {question.type === "multiple_choice" && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id={`allow-multiple-${question.id}`}
                  checked={allowMultiple}
                  onCheckedChange={(checked) => {
                    setAllowMultiple(checked)
                    save({ allow_multiple: checked })
                  }}
                />
                <Label htmlFor={`allow-multiple-${question.id}`}>Allow multiple correct answers</Label>
              </div>
              <OptionsEditor
                questionId={question.id}
                options={question.options}
                variant={allowMultiple ? "multi" : "single"}
              />
            </>
          )}

          {question.type === "true_false" && <TrueFalseEditor questionId={question.id} options={question.options} />}

          {question.type === "short_answer" && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id={`case-sensitive-${question.id}`}
                  checked={caseSensitive}
                  onCheckedChange={(checked) => {
                    setCaseSensitive(checked)
                    save({ case_sensitive: checked })
                  }}
                />
                <Label htmlFor={`case-sensitive-${question.id}`}>Case sensitive</Label>
              </div>
              <OptionsEditor questionId={question.id} options={question.options} variant="keyword" />
            </>
          )}

          {question.type === "essay" && (
            <p className="text-xs text-muted-foreground">
              Learners answer in free text; these responses aren&apos;t auto-graded.
            </p>
          )}

          {question.type === "file_upload" && (
            <p className="text-xs text-muted-foreground">
              Learners upload a PDF instead of typing an answer; these responses aren&apos;t auto-graded.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function TrueFalseEditor({ questionId, options }: { questionId: string; options: AdminQuestionOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

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

  return (
    <div className="space-y-2">
      <Label>Correct Answer</Label>
      <div className="flex gap-2.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={isPending}
            onClick={() => handleSetCorrect(option.id)}
            className={cn(
              "flex flex-1 items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors disabled:opacity-50",
              option.is_correct ? "border-primary bg-primary/10" : "border-border hover:border-ring"
            )}
          >
            <div
              className={cn(
                "size-4 shrink-0 rounded-full border-2",
                option.is_correct ? "border-primary bg-primary/20" : "border-border"
              )}
            />
            {option.text}
          </button>
        ))}
      </div>
    </div>
  )
}

function OptionsEditor({
  questionId,
  options,
  variant,
}: {
  questionId: string
  options: AdminQuestionOption[]
  variant: "single" | "multi" | "keyword"
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAddOption() {
    startTransition(async () => {
      const result = await createOptionAction(questionId, {
        text: "",
        is_correct: variant === "keyword" ? true : false,
      })
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

  function handleToggleCorrect(optionId: string, isCorrect: boolean) {
    startTransition(async () => {
      const result = await toggleCorrectOptionAction(optionId, isCorrect)
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
      <Label>{variant === "keyword" ? "Accepted Answers" : "Options"}</Label>
      {options.map((option) => (
        <OptionRow
          key={option.id}
          option={option}
          variant={variant}
          onSetCorrect={() => handleSetCorrect(option.id)}
          onToggleCorrect={(checked) => handleToggleCorrect(option.id, checked)}
          onRemove={() => handleRemove(option.id)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAddOption} disabled={isPending}>
        <Plus className="size-3.5" />
        {variant === "keyword" ? "Add Answer" : "Add Option"}
      </Button>
    </div>
  )
}

function OptionRow({
  option,
  variant,
  onSetCorrect,
  onToggleCorrect,
  onRemove,
}: {
  option: AdminQuestionOption
  variant: "single" | "multi" | "keyword"
  onSetCorrect: () => void
  onToggleCorrect: (checked: boolean) => void
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
      {variant === "single" && (
        <button
          type="button"
          title="Mark as correct answer"
          onClick={onSetCorrect}
          className={cn(
            "size-4 shrink-0 rounded-full border-2",
            option.is_correct ? "border-primary bg-primary/20" : "border-border"
          )}
        />
      )}
      {variant === "multi" && (
        <button
          type="button"
          title="Mark as correct answer"
          onClick={() => onToggleCorrect(!option.is_correct)}
          className={cn(
            "size-4 shrink-0 rounded-sm border-2",
            option.is_correct ? "border-primary bg-primary/20" : "border-border"
          )}
        />
      )}
      <Input value={text} onChange={(e) => setText(e.target.value)} onBlur={save} className="flex-1" />
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
        <X className="size-3.5 text-destructive" />
      </Button>
    </div>
  )
}
