"use client"

import { useState } from "react"
import { ChevronDown, Plus, Trash2, X } from "lucide-react"

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
import type { AuthorableQuestionType } from "@/lib/courses-admin"
import type { DraftOption, DraftQuestion, DraftQuiz } from "@/lib/course-draft"
import { QUESTION_TYPE_POINTS, REGULAR_QUIZ_MAX_ATTEMPTS } from "@/lib/courses"
import { ASSESSMENT_GRADE_WEIGHT } from "@/lib/course-grade"
import { useCourseDraft } from "../CourseDraftContext"
import { useQuestionQuizIssue } from "../QuizIssuesContext"
import { useDebouncedField } from "../useDebouncedField"

// Only auto-gradable types are offered for a normal quiz. Essay/file_upload
// only exist inside a study case (see "Add Study Case" below) -- a normal
// quiz must always resolve to an immediate score, never `pending_review`.
const QUESTION_TYPES: { value: AuthorableQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
]

/** Both map to Essay in the UI; the stored `type` is what selects the answer widget. */
const ANSWER_FORMATS: { value: "essay" | "file_upload"; label: string; hint: string }[] = [
  {
    value: "essay",
    label: "Written answer",
    hint: "Learners type their answer in a rich-text box.",
  },
  {
    value: "file_upload",
    label: "File or link upload",
    hint: "Learners submit a link to their file (e.g. Google Drive) instead of typing.",
  },
]

function isEssayQuestion(type: AuthorableQuestionType): type is "essay" | "file_upload" {
  return type === "essay" || type === "file_upload"
}

export function QuizEditor({ lessonId, quiz }: { lessonId: string; quiz: DraftQuiz | null }) {
  const { dispatch } = useCourseDraft()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<AuthorableQuestionType>("multiple_choice")

  function openPicker() {
    // Always start from the default rather than remembering the last pick.
    setSelectedType("multiple_choice")
    setPickerOpen(true)
  }

  function handleAddQuestion(type: AuthorableQuestionType) {
    dispatch({ type: "addQuestion", lessonId, questionType: type })
    setPickerOpen(false)
  }

  function handleAddStudyCase() {
    dispatch({ type: "addQuestion", lessonId, questionType: "essay", isAssessment: true })
  }

  const questions = quiz?.questions ?? []
  const isAssessment = quiz?.is_assessment ?? false

  return (
    <div>
      {quiz && questions.length > 0 && <QuizSettings lessonId={lessonId} quiz={quiz} />}

      {questions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No questions yet — add a question, or make this a study case.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index} />
          ))}
        </div>
      )}

      {!isAssessment && (
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openPicker}>
            <Plus className="size-3.5" />
            Add Question
          </Button>
          {questions.length === 0 && (
            <Button type="button" variant="outline" size="sm" onClick={handleAddStudyCase}>
              <Plus className="size-3.5" />
              Add Study Case
            </Button>
          )}
        </div>
      )}

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
            <Button type="button" variant="ghost" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => handleAddQuestion(selectedType)}>
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuizSettings({ lessonId, quiz }: { lessonId: string; quiz: DraftQuiz }) {
  const { dispatch } = useCourseDraft()

  function save(patch: Partial<Omit<DraftQuiz, "id" | "questions">>) {
    dispatch({ type: "patchQuiz", lessonId, patch })
  }

  const passScore = useDebouncedField(String(quiz.pass_score), (next) =>
    save({ pass_score: Number(next) || 0 })
  )
  const maxAttempts = useDebouncedField(quiz.max_attempts ? String(quiz.max_attempts) : "", (next) =>
    save({ max_attempts: next.trim() ? Number(next) : null })
  )

  return (
    <div className="mb-3 flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/30 p-3">
      <div className="w-32 space-y-1.5">
        <Label htmlFor={`pass-score-${quiz.id}`}>Pass Score (%)</Label>
        <Input
          id={`pass-score-${quiz.id}`}
          type="number"
          min={0}
          max={100}
          value={passScore.value}
          onChange={(e) => passScore.onChange(e.target.value)}
          onBlur={passScore.flush}
        />
      </div>
      <div className="w-32 space-y-1.5">
        <Label htmlFor={`max-attempts-${quiz.id}`}>Max Attempts</Label>
        {quiz.is_assessment ? (
          <Input
            id={`max-attempts-${quiz.id}`}
            type="number"
            min={0}
            placeholder="Unlimited"
            value={maxAttempts.value}
            onChange={(e) => maxAttempts.onChange(e.target.value)}
            onBlur={maxAttempts.flush}
          />
        ) : (
          <p className="flex h-9 items-center text-sm text-muted-foreground">
            {REGULAR_QUIZ_MAX_ATTEMPTS} (fixed)
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={`shuffle-${quiz.id}`}
          checked={quiz.shuffle}
          onCheckedChange={(checked) => save({ shuffle: checked })}
        />
        <Label htmlFor={`shuffle-${quiz.id}`}>Shuffle Questions</Label>
      </div>
      <div className="flex w-full items-start gap-2 border-t border-border pt-3">
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            quiz.is_assessment
              ? "bg-secondary text-secondary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {quiz.is_assessment ? "Study Case" : "Normal Quiz"}
        </span>
        <p className="text-xs text-muted-foreground">
          {quiz.is_assessment
            ? `No start gate or timer; learners save drafts and submit when done. Grade manually in Admin › Grading. Counts ${ASSESSMENT_GRADE_WEIGHT}× a regular quiz toward the final course grade.`
            : "Auto-graded and scored instantly on submit."}{" "}
          To switch modes, delete all questions in this quiz first.
        </p>
      </div>
    </div>
  )
}

function QuestionCard({ question, index }: { question: DraftQuestion; index: number }) {
  const { dispatch } = useCourseDraft()
  const [expanded, setExpanded] = useState(false)
  const [prompt, setPrompt] = useState(question.prompt)
  const points = QUESTION_TYPE_POINTS[question.type]

  function save(patch: Partial<DraftQuestion>) {
    dispatch({ type: "patchQuestion", id: question.id, patch })
  }

  function handleDelete() {
    dispatch({ type: "deleteQuestion", id: question.id })
  }

  // file_upload has no QUESTION_TYPES entry any more -- it reads as "Essay".
  const typeLabel = isEssayQuestion(question.type)
    ? "Essay"
    : (QUESTION_TYPES.find((t) => t.value === question.type)?.label ?? question.type)

  const issue = useQuestionQuizIssue(question.id)
  // Render-time adjustment rather than an effect: a failed Save must open the
  // offending question immediately, without a second paint.
  const [seenIssue, setSeenIssue] = useState(issue)
  if (issue !== seenIssue) {
    setSeenIssue(issue)
    if (issue) setExpanded(true)
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", issue && "border-destructive")}>
      <div className="flex items-center gap-2.5 bg-muted/30 px-3 py-2">
        <span className="text-sm font-semibold whitespace-nowrap">Question {index + 1}</span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
          {typeLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {points} {points === 1 ? "pt" : "pts"}
        </span>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleDelete}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setExpanded((v) => !v)}>
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3.5 p-3.5">
          {issue && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {issue.message}
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Prompt</Label>
            <RichTextEditor
              value={prompt}
              onChange={(html) => {
                const next = html.replace(/<[^>]*>/g, "").trim() ? html : ""
                setPrompt(next)
                save({ prompt: next })
              }}
            />
          </div>
          {question.type === "multiple_choice" && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id={`allow-multiple-${question.id}`}
                  checked={question.allow_multiple}
                  onCheckedChange={(checked) => save({ allow_multiple: checked })}
                />
                <Label htmlFor={`allow-multiple-${question.id}`}>Allow multiple correct answers</Label>
              </div>
              <OptionsEditor
                questionId={question.id}
                options={question.options}
                variant={question.allow_multiple ? "multi" : "single"}
              />
            </>
          )}

          {question.type === "true_false" && <TrueFalseEditor questionId={question.id} options={question.options} />}

          {question.type === "short_answer" && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id={`case-sensitive-${question.id}`}
                  checked={question.case_sensitive}
                  onCheckedChange={(checked) => save({ case_sensitive: checked })}
                />
                <Label htmlFor={`case-sensitive-${question.id}`}>Case sensitive</Label>
              </div>
              <OptionsEditor questionId={question.id} options={question.options} variant="keyword" />
              {question.options.every((o) => !o.is_correct) && (
                <p className="text-xs text-destructive">
                  Add at least one accepted answer — a normal quiz must be auto-graded.
                </p>
              )}
            </>
          )}

          {isEssayQuestion(question.type) && (
            <div className="space-y-2">
              <Label>Answer format</Label>
              <RadioGroup
                value={question.type}
                onValueChange={(value) => save({ type: value as AuthorableQuestionType })}
              >
                {ANSWER_FORMATS.map((f) => (
                  <label key={f.value} className="flex items-start gap-2.5 text-sm">
                    <RadioGroupItem value={f.value} className="mt-0.5" />
                    <span>
                      {f.label}
                      <span className="block text-xs text-muted-foreground">{f.hint}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">These responses aren&apos;t auto-graded.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TrueFalseEditor({ questionId, options }: { questionId: string; options: DraftOption[] }) {
  const { dispatch } = useCourseDraft()

  function handleSetCorrect(optionId: string) {
    dispatch({ type: "setCorrectOption", questionId, optionId })
  }

  return (
    <div className="space-y-2">
      <Label>Correct Answer</Label>
      <div className="flex gap-2.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
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
  options: DraftOption[]
  variant: "single" | "multi" | "keyword"
}) {
  const { dispatch } = useCourseDraft()

  function handleAddOption() {
    dispatch({ type: "addOption", questionId, option: { is_correct: variant === "keyword" } })
  }

  function handleSetCorrect(optionId: string) {
    dispatch({ type: "setCorrectOption", questionId, optionId })
  }

  function handleToggleCorrect(optionId: string, isCorrect: boolean) {
    dispatch({ type: "patchOption", id: optionId, patch: { is_correct: isCorrect } })
  }

  function handleRemove(optionId: string) {
    dispatch({ type: "deleteOption", id: optionId })
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
      <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
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
  option: DraftOption
  variant: "single" | "multi" | "keyword"
  onSetCorrect: () => void
  onToggleCorrect: (checked: boolean) => void
  onRemove: () => void
}) {
  const { dispatch } = useCourseDraft()
  const text = useDebouncedField(option.text, (next) =>
    dispatch({ type: "patchOption", id: option.id, patch: { text: next } })
  )

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
      <Input
        value={text.value}
        onChange={(e) => text.onChange(e.target.value)}
        onBlur={text.flush}
        className="flex-1"
      />
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
        <X className="size-3.5 text-destructive" />
      </Button>
    </div>
  )
}
